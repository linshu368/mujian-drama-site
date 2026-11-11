(() => {
  const telegram = window.Telegram?.WebApp;
  // Telegram credentials stay in SDK memory; never persist them or copy page query parameters.
  const initData = () => telegram?.initData || '';
  const source = () => {
    const value = new URLSearchParams(initData()).get('start_param');
    return value && /^[A-Za-z0-9_-]{3,64}$/.test(value) ? value : null;
  };
  async function request(path, body, signal) {
    if (!initData()) throw Object.assign(new Error('请在 Telegram 中打开幕间'), { status: 401 });
    const abort = new AbortController();
    const cancel = () => abort.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) abort.abort();
    const timer = setTimeout(cancel, 10000);
    try {
      const response = await fetch(window.mujianConfig.apiBaseUrl + path, {
        method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: abort.signal,
        headers: { 'X-Init-Data': initData(), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw Object.assign(new Error('请求失败'), { status: response.status });
      return result.data;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  async function reportEntry() {
    if (!initData()) return;
    let key;
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(initData()));
      key = 'mujian-entry-ack:' + [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
    } catch { /* Backend remains authoritative without session storage. */ }
    for (let attempt = 0; attempt < 3; attempt++) {
      try { if (key && sessionStorage.getItem(key) === '1') return; } catch {}
      try {
        const result = await request('/api/growth/mujian-entry', {});
        if (result.recorded === true) {
          try { if (key) sessionStorage.setItem(key, '1'); } catch {}
          return;
        }
      } catch (error) { if (error.status === 401 || error.status === 403) return; }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  function openPrompt(container) {
    const note = document.createElement('p');
    note.textContent = '需要 Telegram 身份才能加载剧集，请在 Telegram 中打开幕间。';
    const link = document.createElement('a'); link.className = 'primary';
    link.href = window.mujianConfig.mujianMiniAppUrl; link.textContent = '在 Telegram 中打开幕间';
    container.replaceChildren(note, link);
  }
  window.MujianAPI = Object.freeze({ request, source, openPrompt });
  telegram?.ready?.();
  void reportEntry();
})();
