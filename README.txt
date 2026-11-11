幕间短剧 · 真实内容接入

目录和详情使用秘境 GET /api/dramas、GET /api/dramas/:id；播放使用 POST /api/dramas/play。
本期全部免费观看，没有支付和解锁流程。收藏与浏览记录用真实剧集 ID / 视频 ID，
保存在当前浏览器 mujian-library-v2；旧演示片单不会混入，不跨设备同步。
播放器使用原生 video，非原生 HLS 浏览器使用固定 HLS.js 1.7.4（assets 内，附许可证）。
换集/关闭会取消旧请求并销毁播放器；取址和媒体恢复合计最多自动尝试 3 次，之后手动重试。
临时播放地址仅在内存和媒体元素使用，不持久化、不写日志。密钥只在后端。

运行：
  cd /Users/qj/python_project/mujian-drama-site
  python3 -m http.server 3188 --bind 127.0.0.1
打开 http://127.0.0.1:3188/ 。普通浏览器无 Telegram 身份时显示“在 Telegram 中打开幕间”。
mujian-config.js 在 localhost/127.0.0.1 使用 http://localhost:3001；线上使用已核对的生产 API：https://stminiapp-production.up.railway.app。
真实本地联调需要配置可用的隔离测试后端/内容、执行已批准的 TEST 迁移、与 Bot 匹配的
合法 Telegram initData 及 Telegram 可访问的 HTTPS 联调地址。不要把真实身份手动存入文件，
不要将本地测试请求改指生产库。BotFather 使用既有绑定地址。

可重复的模拟播放/弹窗体验：
  cd /Users/qj/python_project/ST_miniAPP_mujian
  pnpm --filter @miniapp/ui-tests exec playwright test -c playwright.mujian.config.ts --ui
在 Playwright 界面运行 @mujian，用的是仓库已有虚构短剧、模拟 Telegram 桥和拦截 API。
这只验证交互/失败路径，不代表真实 Telegram、Cloudflare 或线上归因成功。

入口：
幕间：https://t.me/MIJINGAI_bot/mujian （短名已注册）
幕间绑定：https://short-drama-demo-sigma.vercel.app/
广告：https://t.me/MIJINGAI_bot/mujian?startapp=mujian_dzmm
秘境：https://t.me/MIJINGAI_bot/app
社群：https://t.me/MijingAI_Official
秘境跳转只沿用当前 Telegram initData 中的 start_param；无标记访问不带渠道。
后端重新验签并读取来源，忽略前端提交的用户 ID 或 source_id。
进入上报最多 3 次，只在 recorded=true 后缓存本会话确认；失败不阻断观看。

原有两种弹窗保持不变：进入页面起计时，秘境 120 秒；社群在 30–90 秒或 180–270 秒
中随机一个时刻。sessionStorage 保存起点和已显示状态，换集、翻页、刷新不重置。
后台到期回前台再展示，两种弹窗不叠加。暂停正在播放的视频，关闭后恢复；原本暂停的不播放。
只有点击才跳转，不自动跳转；点击不等于转化或加入社群，不调用 requestWriteAccess。
会话存储不可用时只能保证当前文档内去重。彻底关闭应用后不能弹窗。

后端本地改动在 /Users/qj/python_project/ST_miniAPP_mujian，分支 feat/mujian-entry-funnel。
渠道 mujian_dzmm 和进入事实表由 20261111_mujian_entry_funnel.sql 管理。
发布顺序为 TEST 迁移与回滚验证 → 生产迁移 → 后端 → 秘境前端与幕间。
TEST 断言已通过 GitHub Database Migration 工作流；生产不会运行虚构身份测试。
部署成功只表示站点和接口已发布；真实视频、Telegram 跳转与归因闭环仍需真机验收。
详细归因口径、验证与剩余环境条件见该仓库 docs/mujian-integration.md。
