let current = 'history';
const content = document.querySelector('#library-content');
function render() {
  const state = window.MujianStore.read();
  const items = (current === 'history' ? state.history : state.favorites.map(id => ({ id })))
    .map(item => ({ ...item, drama: dramas.find(d => d.id === item.id) })).filter(item => item.drama);
  document.querySelector('#history-count').textContent = state.history.length;
  document.querySelector('#favorite-count').textContent = state.favorites.length;
  document.querySelector('#tab-title').textContent = current === 'history' ? '最近浏览' : '我的收藏';
  document.querySelector('#clear-history').hidden = current !== 'history' || !items.length;
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === current));
  content.replaceChildren();
  if (!items.length) { content.textContent = '暂无记录，去发现喜欢的故事吧。'; return; }
  const list = document.createElement('div'); list.className = 'saved-grid';
  for (const item of items) {
    const card = document.createElement('article'); card.className = 'saved-card';
    const link = document.createElement('a');
    const params = new URLSearchParams({ drama: item.id }); if (item.videoId) params.set('video', item.videoId);
    link.href = 'catalog.html?' + params; link.textContent = item.drama.title; link.dataset.contentTitle = '';
    const remove = document.createElement('button'); remove.textContent = '移除'; remove.className = 'remove-item';
    remove.addEventListener('click', () => { const latest = window.MujianStore.read(); if (current === 'history') latest.history = latest.history.filter(x => x.id !== item.id); else latest.favorites = latest.favorites.filter(id => id !== item.id); window.MujianStore.write(latest); render(); });
    card.append(link, remove); list.append(card);
  }
  content.append(list);
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { current = button.dataset.tab; render(); }));
document.querySelector('#clear-history').addEventListener('click', () => { const state = window.MujianStore.read(); state.history = []; window.MujianStore.write(state); render(); });
async function load() {
  try { await window.MujianCatalog(); render(); }
  catch (error) {
    if (error.status === 401) window.MujianAPI.openPrompt(content);
    else { const retry = document.createElement('button'); retry.textContent = '片单加载失败，点击重试'; retry.onclick = load; content.replaceChildren(retry); }
  }
}
void load();
