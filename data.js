// Real catalog only. No demonstration dramas are merged with API content.
let dramas = [];
window.MujianCatalog = async () => {
  const result = await window.MujianAPI.request('/api/dramas');
  dramas = result.dramas;
  return dramas;
};
window.MujianStore = {
  key: 'mujian-library-v2',
  read() {
    try {
      const value = JSON.parse(localStorage.getItem(this.key) || '{}');
      return { favorites: Array.isArray(value.favorites) ? value.favorites : [], history: Array.isArray(value.history) ? value.history : [] };
    } catch { return { favorites: [], history: [] }; }
  },
  write(value) { try { localStorage.setItem(this.key, JSON.stringify(value)); } catch {} },
};
