(() => {
  // Every selection owns its requests, retry budget and media events. Stale selections cannot attach.
  function create(container, onSelected) {
    let dispose = () => {};
    function select(drama, item) {
      dispose();
      const controller = new AbortController();
      const video = document.createElement('video');
      video.controls = true; video.playsInline = true; video.preload = 'metadata';
      video.setAttribute('aria-label', item.title || '剧集播放器');
      const status = document.createElement('p'); status.setAttribute('role', 'status');
      const retry = document.createElement('button'); retry.textContent = '重新播放'; retry.hidden = true;
      container.replaceChildren(video, status, retry);
      let hls, timer, expires = 0, attempts = 0, loading = false, stopped = false;
      let resumeAt = 0, wantPlay = true;
      const detach = window.MujianEntry.attachPlayer(video, container);
      function resetMedia() {
        hls?.destroy(); hls = null;
        video.pause(); video.removeAttribute('src'); video.load();
      }
      function failed() {
        if (stopped || loading) return;
        clearTimeout(timer);
        resumeAt = video.currentTime || resumeAt;
        if (video.readyState > 0) wantPlay = !video.paused;
        if (attempts < 3) timer = setTimeout(load, 500 * 2 ** (attempts - 1));
        else { status.textContent = '播放失败，请稍后重试'; retry.hidden = false; }
      }
      async function load() {
        if (stopped || loading) return;
        clearTimeout(timer); loading = true; attempts++; retry.hidden = true;
        status.textContent = '正在加载视频…';
        resetMedia();
        try {
          const { playback } = await window.MujianAPI.request('/api/dramas/play', {
            drama_id: drama.id, video_id: item.id, format: 'hls',
          }, controller.signal);
          if (stopped) return;
          if (!playback.playable || !playback.play_url) throw new Error('unavailable');
          expires = Date.parse(playback.expires_at) || 0;
          const url = new URL(playback.play_url);
          if (!['https:', 'http:'].includes(url.protocol)) throw new Error('invalid media');
          if (playback.format === 'hls' && !video.canPlayType('application/vnd.apple.mpegurl')) {
            if (!window.Hls?.isSupported()) throw new Error('hls unsupported');
            hls = new window.Hls({ manifestLoadingMaxRetry: 1, levelLoadingMaxRetry: 1, fragLoadingMaxRetry: 1 });
            hls.on(window.Hls.Events.ERROR, (_event, data) => { if (data.fatal) failed(); });
            hls.loadSource(url.href); hls.attachMedia(video);
          } else video.src = url.href;
          status.textContent = '';
          if (wantPlay) void video.play().catch(() => { status.textContent = '点击播放器开始播放'; });
        } catch {
          if (!stopped) {
            loading = false;
            failed();
          }
        } finally { loading = false; }
      }
      video.addEventListener('loadedmetadata', () => { if (resumeAt > 0) video.currentTime = resumeAt; });
      video.addEventListener('error', failed);
      video.addEventListener('play', () => {
        if (expires && Date.now() >= expires - 5000 && !loading) {
          resumeAt = video.currentTime; wantPlay = true;
          if (attempts < 3) void load(); else { video.pause(); status.textContent = '播放地址已过期，请重新播放'; retry.hidden = false; }
        }
      });
      retry.addEventListener('click', () => { attempts = 0; wantPlay = true; void load(); });
      dispose = () => { stopped = true; clearTimeout(timer); controller.abort(); detach(); resetMedia(); };
      onSelected(item);
      void load();
    }
    return { select, destroy: () => dispose() };
  }
  window.MujianPlayer = { create };
})();
