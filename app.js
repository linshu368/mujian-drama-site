const grid = document.querySelector('#cards');
const modal = document.querySelector('#modal');
const heading = document.querySelector('#modal-title');
const body = document.querySelector('#modal-body');
const search = document.querySelector('#search');
let filter = '全部', detailRequest, player;
const state = window.MujianStore.read();
function element(tag, text, className) {
  const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el;
}
function poster(drama) {
  const cover = element('div', '', 'poster');
  if (drama.cover_url) {
    try {
      const url = new URL(drama.cover_url);
      if (url.protocol === 'https:') { const image = element('img'); image.src = url.href; image.alt = ''; image.loading = 'lazy'; cover.append(image); }
    } catch {}
  }
  cover.append(element('span', drama.tags.join(' · '), 'poster-tag'));
  return cover;
}
function render() {
  const q = search.value.trim().toLowerCase();
  const results = dramas.filter(d => (filter === '全部' || d.tags.includes(filter)) && `${d.title} ${d.tags.join(' ')} ${d.description}`.toLowerCase().includes(q));
  const sort = document.querySelector('#sort').value;
  if (sort === 'title') results.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'reverse') results.reverse();
  grid.replaceChildren();
  for (const drama of results) {
    const card = element('article', '', 'card'); card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-label', '查看' + drama.title);
    const title = element('h3', drama.title); title.dataset.contentTitle = '';
    card.append(poster(drama), title, element('p', `${drama.episode_count} 集 · ${drama.description}`));
    card.addEventListener('click', () => openDrama(drama.id));
    card.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); openDrama(drama.id); } });
    grid.append(card);
  }
  document.querySelector('#empty').hidden = results.length > 0;
}
async function openDrama(id, videoId) {
  detailRequest?.abort(); player?.destroy();
  const request = new AbortController(); detailRequest = request;
  heading.textContent = '正在加载剧集'; body.replaceChildren(); if (!modal.open) modal.showModal();
  try {
    const { drama } = await window.MujianAPI.request('/api/dramas/' + encodeURIComponent(id), undefined, request.signal);
    if (request.signal.aborted) return;
    heading.textContent = drama.title; heading.dataset.contentTitle = '';
    const container = element('div', '', 'detail-player'); container.dataset.mujianPlayback = '';
    const favorite = element('button', '', 'detail-favorite');
    const updateFavorite = () => { favorite.textContent = state.favorites.includes(id) ? '♥ 已收藏' : '♡ 收藏'; favorite.setAttribute('aria-pressed', String(state.favorites.includes(id))); };
    updateFavorite();
    favorite.addEventListener('click', () => { state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [id, ...state.favorites]; window.MujianStore.write(state); updateFavorite(); });
    const share = element('button', '↗ 分享', 'detail-favorite');
    share.addEventListener('click', async () => { const url = new URL('catalog.html', location.href); url.searchParams.set('drama', id); try { await navigator.clipboard.writeText(url.href); share.textContent = '已复制'; } catch { share.textContent = '无法复制链接'; } });
    const episodes = element('div', '', 'episodes');
    body.append(container, element('p', `${drama.videos.length} 集 · 免费观看`), favorite, share, element('p', drama.description, 'modal-description'), element('h3', '选集'), episodes);
    player = window.MujianPlayer.create(container, item => {
      state.history = [{ id, videoId: item.id }, ...state.history.filter(h => h.id !== id)].slice(0, 50);
      window.MujianStore.write(state);
      for (const button of episodes.children) { const selected = button.dataset.videoId === item.id; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); }
    });
    for (const [index, item] of drama.videos.entries()) {
      const button = element('button', item.episode || item.title || `第 ${index + 1} 集`);
      button.dataset.videoId = item.id; button.addEventListener('click', () => player.select(drama, item)); episodes.append(button);
    }
    const selected = drama.videos.find(v => v.id === videoId) || drama.videos[0];
    if (selected) player.select(drama, selected); else container.textContent = '暂无可播放集数';
  } catch (error) {
    if (request.signal.aborted) return;
    if (error.status === 401) window.MujianAPI.openPrompt(body);
    else { const retry = element('button', '加载失败，点击重试'); retry.addEventListener('click', () => openDrama(id, videoId)); body.replaceChildren(retry); }
  }
}
async function loadCatalog() {
  grid.textContent = '正在加载剧集…';
  try {
    await window.MujianCatalog(); render();
    const params = new URLSearchParams(location.search);
    if (params.get('drama')) void openDrama(params.get('drama'), params.get('video'));
  } catch (error) {
    if (error.status === 401) window.MujianAPI.openPrompt(grid);
    else { const retry = element('button', '目录加载失败，点击重试'); retry.addEventListener('click', loadCatalog); grid.replaceChildren(retry); }
  }
}
search.addEventListener('input', render);
document.querySelector('#sort').addEventListener('change', render);
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); render(); }));
document.querySelector('.close').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => { detailRequest?.abort(); player?.destroy(); });
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
window.addEventListener('pagehide', () => { detailRequest?.abort(); player?.destroy(); });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.action === 'search') { search.scrollIntoView(); search.focus(); }
  else { heading.textContent = '联系我们'; body.textContent = '请通过秘境官方社群交流反馈。'; if (!modal.open) modal.showModal(); }
}));
void loadCatalog();
