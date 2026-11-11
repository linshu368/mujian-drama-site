// Public destinations only: never put Bot tokens or Telegram initData here.
window.mujianConfig = Object.freeze({
  mijingMiniAppUrl: 'https://t.me/MIJINGAI_bot/app',
  apiBaseUrl: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://stminiapp-production.up.railway.app',
  mujianMiniAppUrl: 'https://t.me/MIJINGAI_bot/mujian',
  mijingDelaySeconds: 120,
  communityUrl: 'https://t.me/MijingAI_Official',
  communityWindowsSeconds: [[30, 90], [180, 270]],
});
