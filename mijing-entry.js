(() => {
  const config = window.mujianConfig;
  const sessionKey = 'mujian-invitations-v1';
  const bindings = new Map();
  const copy = (zh, en) => window.mujianLanguage === 'en' ? en : zh;
  let timer;
  let popup = null;
  let pendingResume = [];

  function buildDeepLink(settings = config) {
    if (!settings) return null;
    try {
      const target = new URL(settings.mijingMiniAppUrl);
      const parts = target.pathname.split('/').filter(Boolean);
      if (
        target.protocol !== 'https:' || target.hostname !== 't.me' ||
        target.username || target.password || target.port ||
        parts.length < 1 || parts.length > 2 ||
        parts.some(part => !/^[A-Za-z0-9_]{1,64}$/.test(part)) ||
        (parts.length === 1 && !target.searchParams.has('startapp'))
      ) return null;
      // Never forward launch credentials or page query parameters.
      const link = new URL('https://t.me/' + parts.join('/'));
      const source = window.MujianAPI?.source();
      if (source) link.searchParams.set('startapp', source);
      return link.href;
    } catch {
      return null;
    }
  }

  function communityLink() {
    try {
      const url = new URL(config.communityUrl);
      return url.protocol === 'https:' && url.hostname === 't.me' &&
        !url.username && !url.password && !url.port && /^\/[A-Za-z0-9_]+$/.test(url.pathname)
        ? 'https://t.me' + url.pathname : null;
    } catch {
      return null;
    }
  }

  // A single random deadline survives reloads and navigation within this tab/WebView.
  function randomCommunityDelay() {
    const windows = config.communityWindowsSeconds;
    const total = windows.reduce((sum, [start, end]) => sum + end - start, 0);
    let offset = Math.random() * total;
    for (const [start, end] of windows) {
      if (offset < end - start) return (start + offset) * 1000;
      offset -= end - start;
    }
    return windows[windows.length - 1][1] * 1000;
  }

  function readSession(fallback) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey));
      if (saved && Number.isFinite(saved.startedAt) && saved.startedAt > 0 &&
        Number.isFinite(saved.communityDelayMs) &&
        config.communityWindowsSeconds.some(([start, end]) =>
          saved.communityDelayMs >= start * 1000 && saved.communityDelayMs <= end * 1000) &&
        typeof saved.mijingShown === 'boolean' && typeof saved.communityShown === 'boolean') return saved;
    } catch {
      // Storage may be unavailable; the current document still has one-shot timers.
    }
    return fallback || {
      startedAt: Date.now(), communityDelayMs: randomCommunityDelay(),
      mijingShown: false, communityShown: false,
    };
  }

  const session = readSession();
  function saveSession() {
    try { sessionStorage.setItem(sessionKey, JSON.stringify(session)); } catch {}
  }
  saveSession();

  function foreground() {
    const telegram = window.Telegram?.WebApp;
    return !document.hidden && (!telegram?.initData || telegram.isActive !== false);
  }

  function available(record) {
    const parentDialog = record.container.closest('dialog');
    return record.active && record.container.isConnected &&
      (!(record.player instanceof HTMLVideoElement) || record.container.contains(record.player)) &&
      (!parentDialog || parentDialog.open) && record.container.getClientRects().length > 0;
  }

  function mediaSource(player) {
    return player instanceof HTMLVideoElement ? player.currentSrc || player.src : null;
  }

  function pauseForPopup(record) {
    if (!popup || !available(record) || record.player.paused !== false || record.player.ended) return;
    if (!popup.paused.some(item => item.record.player === record.player)) {
      popup.paused.push({ record, source: mediaSource(record.player) });
    }
    try { record.player.pause(); } catch {}
  }

  function resumePlayers() {
    if (popup || !foreground()) return;
    const paused = pendingResume;
    pendingResume = [];
    for (const { record, source } of paused) {
      if (!available(record) || record.player.ended || mediaSource(record.player) !== source) continue;
      try {
        // If the browser refuses playback, its normal controls remain available.
        Promise.resolve(record.player.play()).catch(() => {});
      } catch {}
    }
  }

  function nativeRecord(player) {
    const container = player.closest('[data-mujian-playback], .detail-player');
    return container ? { player, container, active: true } : null;
  }

  function show(kind, url) {
    const isMijing = kind === 'mijing';
    const dialog = document.createElement('dialog');
    dialog.className = 'mujian-prompt';
    dialog.dataset.invitation = kind;
    dialog.setAttribute('aria-labelledby', 'mujian-prompt-title');
    dialog.setAttribute('aria-describedby', 'mujian-prompt-description');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mujian-prompt-close';
    close.setAttribute('aria-label', copy('关闭', 'Close'));
    close.textContent = '×';
    const label = document.createElement('h2');
    label.id = 'mujian-prompt-title';
    label.textContent = isMijing ? copy('秘境 · AI 角色互动', 'Mijing · AI roleplay')
      : copy('加入秘境官方社群', 'Join the Mijing community');
    const description = document.createElement('p');
    description.id = 'mujian-prompt-description';
    description.textContent = isMijing ? copy('开启一段由你参与的故事。', 'Start a story you can be part of.')
      : copy('进入 Telegram 社群，与大家交流。', 'Meet the community on Telegram.');
    const actions = document.createElement('div');
    actions.className = 'mijing-recommendation-actions';
    const link = document.createElement('a');
    link.className = 'mijing-entry-link';
    link.href = url;
    link.textContent = isMijing ? copy('进入秘境，与角色互动', 'Enter Mijing and interact with characters')
      : copy('进入官方社群', 'Open the community');
    link.addEventListener('click', event => {
      const telegram = window.Telegram?.WebApp;
      if (!telegram?.initData || typeof telegram.openTelegramLink !== 'function') return;
      try {
        telegram.openTelegramLink(link.href);
        event.preventDefault();
      } catch {
        // Keep the ordinary t.me anchor when the Telegram bridge is unavailable.
      }
    });
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'mijing-entry-dismiss';
    dismiss.textContent = copy('继续浏览', 'Continue browsing');
    close.addEventListener('click', () => dialog.close());
    dismiss.addEventListener('click', () => dialog.close());
    actions.append(link, dismiss);
    dialog.append(close, label, description, actions);
    document.body.append(dialog);
    popup = { dialog, paused: [] };
    dialog.showModal();
    session[kind + 'Shown'] = true;
    saveSession();

    for (const record of bindings.values()) pauseForPopup(record);
    for (const player of document.querySelectorAll('video')) {
      const record = nativeRecord(player);
      if (record) pauseForPopup(record);
    }
    if (popup.paused.length || pendingResume.length) dismiss.textContent = copy('继续看剧', 'Keep watching');

    dialog.addEventListener('close', () => {
      pendingResume.push(...popup.paused);
      popup = null;
      dialog.remove();
      // Show an overdue invitation before resuming, without stacking dialogs.
      schedule();
      resumePlayers();
    }, { once: true });
  }

  function schedule() {
    clearTimeout(timer);
    if (popup || !foreground()) return;
    const invitations = [
      { kind: 'mijing', delay: config.mijingDelaySeconds * 1000, url: buildDeepLink() },
      { kind: 'community', delay: session.communityDelayMs, url: communityLink() },
    ].filter(item => !session[item.kind + 'Shown'] && item.url);
    const elapsed = Date.now() - session.startedAt;
    // Mijing takes priority if both deadlines elapsed while the app was hidden.
    const due = invitations.find(item => elapsed >= item.delay);
    if (due) { show(due.kind, due.url); return; }
    if (invitations.length) {
      timer = setTimeout(schedule, Math.max(0, Math.min(...invitations.map(item => item.delay)) - elapsed));
    }
  }

  // Cloudflare iframe players must be registered; native video is discovered at popup time.
  function attachPlayer(player, container) {
    for (const record of bindings.values()) {
      if (record.player === player || record.container === container) record.dispose();
    }
    const record = { player, container, active: true };
    const playing = () => pauseForPopup(record);
    const dispose = () => {
      if (!record.active) return;
      record.active = false;
      player.removeEventListener('play', playing);
      bindings.delete(player);
    };
    record.dispose = dispose;
    bindings.set(player, record);
    player.addEventListener('play', playing);
    pauseForPopup(record);
    return dispose;
  }

  document.addEventListener('play', event => {
    if (event.target instanceof HTMLVideoElement) {
      const record = nativeRecord(event.target);
      if (record) pauseForPopup(record);
    }
  }, true);
  const onForegroundChange = () => { schedule(); resumePlayers(); };
  document.addEventListener('visibilitychange', onForegroundChange);
  window.addEventListener('pageshow', () => {
    // A restored page may have older in-memory flags than the page we just left.
    Object.assign(session, readSession(session));
    onForegroundChange();
  });
  window.addEventListener('pagehide', () => clearTimeout(timer));
  const telegram = window.Telegram?.WebApp;
  if (typeof telegram?.onEvent === 'function') {
    telegram.onEvent('activated', onForegroundChange);
    telegram.onEvent('deactivated', onForegroundChange);
  }
  window.MujianEntry = Object.freeze({ buildDeepLink, attachPlayer });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onForegroundChange, { once: true });
  } else {
    onForegroundChange();
  }
})();
