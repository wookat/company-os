---
name: testing-zhenti
description: How to QA-test 真题工坊 production (https://zhenti.zalize.com) end to end — accounts, D1 data seeding, print/viewport checks.
---

# Testing 真题工坊 (zhenti.zalize.com)

- app2 update pill never renders on `#exam/:pid` — App.tsx marks exam as fullscreen (no Layout wrapper), so "pill interrupts mid-exam" scenarios are impossible by design; test answer persistence via F5 instead (answers/elapsed/marks auto-restore from localStorage `zt_exam_<pid>`).
- Slow-API submit trap: `POST /papers/:pid/submit` may succeed server-side while the client never gets the response (UI stays on exam page, no toast); a retry returns 409 with no user feedback. Check `/api/history` to confirm whether the attempt actually landed, and use `#result/:pid` directly to reach the result page. (Fixed in fd5ad30: submit button shows 交卷中… pending + disabled, and a 409 on retry is treated as success — clears `zt_exam_<pid>` and navigates to `#result/:pid`. To provoke the 409 branch deliberately: console `fetch POST /api/papers/:pid/submit` with `Authorization: Bearer localStorage.zt_token` first, then submit via UI.)
- Result-page 击败 line & share card need `pct>=40 && beat_pct>=20` (fd5ad30); below 40% both use the grade copy instead. To seed a ≥40% score cheaply: real papers are free/unlimited — open a year's 背题模式 to read the correct answers, then start that year's 整卷模考 and answer 14+/33 correctly via keyboard shortcuts (A–D select, →/Enter next), 提前交卷. Note: clicking 整卷模考 for an already-submitted paper just routes to its existing `#result/:pid` (no retake), and 立即重练本卷错题/错题重练 open the non-scored `#practice` mode (no result page / beat_pct).

- Registration is IP rate-limited: 5 per hour (`src/index.js` `rateLimit reg:<ip> 5, 3600` → 429「注册过于频繁，请稍后再试」). Multi-account rounds exhaust it fast — budget accounts, or expect a ~30–60 min cooldown before the next registration succeeds. The 429 error in the UI looks like a silent failure at a glance; probe `fetch('/api/register',…)` in console to see the real status.
- Stale-bundle trap (UX143): even after verifying the latest bundle via curl `?nocache=`, the *open browser tab* may still be running an older cached bundle — always hard-refresh (Ctrl+Shift+R) and confirm `document.querySelector('script[src*=assets]').src` before testing new frontend copy/logic, or you'll observe old behavior and misreport a bug.
- Register-timeout toast (0c4f799a): client aborts at 20s (api.ts AbortController) → `ApiError status 0` → in register mode shows「网络较慢，注册请求可能已在服务端完成——请稍后用该邮箱密码直接登录，若提示不存在再重新注册」. To trigger without hitting the server: wrap `window.fetch` for `/api/register` to return a never-resolving promise that rejects on `signal` abort — no real request is sent, no rate-limit burn, no account created.

- Repo: `~/zhentigongfang` (Cloudflare Worker, `src/index.js` + `public/*.html`). Verify deployed build via `<meta name="app-build">` on /app.
- Accounts: self-register at /app with email+password (e.g. `qaNN-<ts>@test.zalize.com`); report the email so the boss can purge it.
- Wrangler `d1 execute --remote` fails with code 7403 for the available tokens. Instead use the D1 HTTP API with `CLOUDFLARE_GLOBAL_API_TOKEN`:
  `POST https://api.cloudflare.com/client/v4/accounts/ddff52d24ee44e21a021c15eaffcc86d/d1/database/152f4fee-d77d-400d-a994-7db3dcfa5430/query` with `{"sql":"..."}`.
  Useful for backdating `attempts.created_at` to test week-over-week comparisons (times are UTC, `YYYY-MM-DD HH:MM:SS`).
- To get wrong-book entries: unanswered questions do NOT enter the wrong book — deliberately answer a multi-select question with a single obviously-wrong option, then submit early (提前交卷 → 确定交卷).
- Weekly summary line (dashCard): only renders when the user has attempts in the current 7-day window; N = number of attempts, pct = Σscore/Σtotal rounded.
- Public SEO pages live at `/zhenti/<year>` (NOT `/real/<year>`, which 404s). Print buttons use `window.print()` on a hidden `#printArea` div; Chrome preview shows it directly.
- QA135: app2 result page (#result/:pid) has 「📷 生成成绩分享图 ›」→ 640×800 canvas card in a modal (ESC/✕/backdrop close, `保存图片` downloads 真题工坊成绩单.png). Verify the PNG with python struct (no `file`/`identify` on box): dims at bytes 16–24. While any canvas-image modal is open, DevTools logs `ERR_INVALID_URL` for data: URLs — known sourcemap-probe noise, exempt; run console-clean negative checks with the modal closed. Update pill at 390px is single-line since aa798d9; f4df45a moved it to `top-2 py-2` (32px, bottom=40 = hero greeting top) — QA136 verified no geometric overlap remains, the old "~8px residual overlap" note is obsolete.
- QA136: daily reminder email opt-in — `/api/remind` (Bearer auth; GET `{on:bool}`, POST `{on:true/false}`; KV RATELIMIT key `remind:<uid>`=email, POST off deletes the key, so ending a test with the switch OFF leaves no KV residue). UI: #account「每日学习提醒」card with role="switch" button (48×28); on-toast「已开启，每天 8:00 邮件提醒（已打卡当天不发）」, off-toast「已关闭每日提醒邮件」. Cron `0 0 * * *` (Beijing 08:00, Resend, skips users already checked in) cannot be triggered on demand — mark email delivery untested unless observed via `npx wrangler tail`.
- 390px viewport: Chrome window can't shrink below ~500px; use DevTools device toolbar (F12 → Ctrl+Shift+M) and set width to 390. Print buttons are `hidden sm:inline-flex` so they must disappear at 390.
- Sitemap check: `curl -s https://zhenti.zalize.com/sitemap.xml | grep -c "<loc>"` (was 782 at round 60).
- New React client at `/app2/` (source `web/`, hash routes in `web/src/App.tsx`): desktop `lg:` left nav + `xl:` right rail; `<lg` bottom 5-tab bar. Shares the same API/token as /app, so the same account works in both.
- Two separate favorite systems: `/api/realfav` (背题模式 ☆ → 刷真题「收藏」page) vs `/api/favorites` (wrong-book ⭐ chip). As of round 61 app2 has NO UI that POSTs `/api/favorites` — to exercise the app2 wrong-book ⭐ chip, star a wrong-book card in old /app and refresh app2.
- Production API can intermittently take 70–90s per request (normally ~150ms), leaving app2 pages on skeleton for a long time — wait it out before judging a page as broken; check `performance.getEntriesByType('resource')` durations.
- Chrome URL-bar autocomplete tends to complete `.../app` to `/app2/...`; type the URL then press Delete before Enter to kill inline completion.
- Since QA round 62, app2 wrong-book cards have an in-app "⭐ 收藏" button (POST /api/favorites); the round-61 note about "no in-app favorites entry" is outdated.
- After a new build is deployed, already-open app2 tabs keep the old bundle — hard-refresh (Ctrl+Shift+R) and verify the loaded assets/index-*.js matches the one curl reports before judging behavior.

## Devin Secrets Needed
- `CLOUDFLARE_GLOBAL_API_TOKEN` (D1 HTTP API access for seeding/backdating test data)

## UX/视觉走查要点（128 轮沉淀）
- 清库后旧 QA 账号登录态会 401 回登录页；每轮先截图确认登录态，失效就直接新注册 `qaNNN-<ts>@test.zalize.com`。
- 工作台趋势图需 ≥2 次 attempt 才渲染；最快造数：2026 卷答 1-2 题（含故意答错的多选）提前交卷 + 2019 卷答 1 题提前交卷，全程不触发 AI 额度接口。
- 已知视觉问题（修复前复查项）：趋势图 X 轴按成绩列表原序（新→旧）绘制导致趋势反向；Y 轴固定 0-100 低分段贴地；「移出错题本」无确认/撤销；#history 日期为美式 8/4/2026。
- computer-use 坐标点不中按钮时，先用 console 读 getBoundingClientRect 并按 视口宽/1024 换算（视口宽可能是 1600 而非 1920）；DevTools 设备模式快捷键 ctrl+shift+m 需先点击 DevTools 面板获得焦点，否则会打开 Chrome 个人资料菜单。
- 日期格式有两套 util：`localDay()`（zh-CN，129 轮起 #history 用）与 `fmtDate()`（返回 `M/D` 短格式，错题卡「收藏于」用）——验收"日期格式"需分别核对两处。
- Recharts tooltip 用 mouse_move 悬停 dot 即可触发（坐标 = CSS 坐标 ×(1024/innerWidth)，y 另加 ~55px 浏览器 chrome）；hover 不生效时先移动到图表中部再移向 dot。app2 index.html 无 app-build meta，核对部署用 `curl /app2/ | grep assets/index-*.js` 与页面 `document.scripts` 比对。
- 打卡（daily_checkin）与作答（attempts）是两套数据，做卷不产生打卡；验证 streak/分享图可直接用「每日一题揭晓即打卡」造数，且要先截 streak=0 边界再揭晓。
- 前端 api() 仅 GET 自动重试；POST 慢 API 时 20s 超时 status 0，UI 乐观状态可能与服务端不一致——验收打卡/收藏等写操作必须刷新复核持久化（130 轮起打卡 POST 已带回滚+重试）。
- f8ad21a 起 app2 近四周打卡格与每日一题解析分行均已修复（QA132 的「仍只读 checkin / 只匹配X项」记录已过时）。/admin 登录可 `xdotool type --file ~/.zhenti_admin_key`（不打印密钥），API 侧 `curl -H "X-Admin-Key: $(cat ~/.zhenti_admin_key)" /api/admin/searches`；slowlog 存 KV RATELIMIT key=slowlog（近50条/14天TTL），/api/admin/searches 聚合本身可能 >5s 自我入账。
- c8d8cbd 起 app2 有「新版本已发布」胶囊：验收用 console 覆写 fetch 仅对 `/app2/index.html` 返回伪 bundle 名 HTML + `document.dispatchEvent(new Event('visibilitychange'))` 即时触发（勿等 30min 轮询）；先负例（不拦截无胶囊）再正例；点击后 nav type=reload 且覆写自动失效。/favicon.ico 现为 301→/icon-192.png，「favicon 404 属站点噪音」记录已过时，HTTP≥400 应严格清零。
- 38a8609 起两端 streak 口径已统一（checkin ∪ attempt/背诵日），131 轮「两套口径需分别造数」的记录已过时；f8ad21a 起 app2「近四周打卡」格也用并集口径。app2 console fetch /api/checkin 需带 `Authorization: Bearer localStorage.zt_token`（无 cookie 鉴权）；旧版 syncDailyDays 是工作台异步执行，跨端 streak 核对需 F5 一次再判。
- 07780f5 起旧版 /app 也同口径：submitExam 409→清 zt_exam_<pid> 并直取 /papers/:pid/result 渲染；成绩页击败行（L1730）与 sharePoster（L2214）均需 pct>=40 && beat>=20。但旧版交卷按钮**没有** pending/disabled 态——慢 API 下双击会造出重复 attempt（两次 200，历史成绩出现两条），验收旧版交卷时勿重复点击、并留意此差异。
- 旧版海报是直接下载（无弹层），文件名 `真题工坊成绩_YYYY-MM-DD.png`，尺寸 640×880；验收内容需下载后看图，不能只看 DOM。
- 造 ≥40% 正例可不用 UI 背题：console 带 token GET `/api/real/browse?year=YYYY`（背题模式同源数据）读 answer，2020 年前 16 题均单选，键盘 A/B/C/D + ArrowRight 快速答 14 题即 42%。
- Chrome 地址栏输入 `zhenti.zalize.com/app` 会被历史自动补全劫持到 `/app2/#account`——用 console `location.assign('https://zhenti.zalize.com/app')` 或删除补全再回车。

## QA140 沉淀（2026-08-04）
- 9acee9e 起旧版 /app 交卷已有防重复：全局 `SUBMITTING` + `.js-submit` 两入口 disabled/「交卷中…」/opacity-60；非 409 失败会恢复文案并 `updateClock()` 续表。QA139 的「旧版无 pending、双击重复入库」记录已过时。
- 验收双击防重复的低成本方法：console 包装 fetch 仅对 `/submit` 延迟 resolve 6s 并计数（请求照发），点确定交卷后狂点入口，断言计数=1 + 按钮 disabled + /api/history 单条。验收失败恢复：对 /submit 首次调用 `Promise.reject(new TypeError('Failed to fetch'))`，断言 toast + 按钮复原 + 计时恢复。
- 本机 Chrome for Testing 窗口最小宽 500px，wmctrl 压不到 390；390px 验收用 CDP：`--remote-debugging-port` 见 ps（本机 29229），python websocket-client 需 `suppress_origin=True`，`Emulation.setDeviceMetricsOverride {width:390,mobile:true}` + `Page.captureScreenshot`；注意 ws 断开即还原仿真，截图须在同一连接内完成。
- 旧版 /api/history 返回 `{attempts:[{id,paper_id,score,total,...}]}`，是核对「attempt 只 1 条」的权威来源。

## QA141 沉淀（2026-08-04）
- 旧版 /app HTML 会被 Cloudflare 边缘缓存（`cf-cache-status: HIT`）：核对新部署时 curl 需加 `?nocache=<ts>`，浏览器需 Ctrl+Shift+R，否则会误判"未部署"。
- 旧版「我的」页每日提醒开关：`#remindBtn`（app.html viewAccount），全局 `REMIND_ON`，乐观更新+失败回滚；与 app2 共用 GET/POST /api/remind（KV remind:<uid>）。验收回滚可 console 包装 fetch 对 `/remind` POST 单次 reject(TypeError)——toast 报错、开关回弹、GET 值不变。测试后务必留"关"（KV 自删）。

## Cron 提醒邮件验证沉淀（2026-08-05）
- 生产 Cron（crons = ["0 0 * * *"]，北京 8:00）已实跑验证：wrangler tail 捕获 `remind cron: N opt-in` / `remind uid=… resend=200`，QA136 的 untested 已闭环。
- 可用 `wrangler dev --remote --test-scheduled` + `curl -k https://localhost:8788/__scheduled?cron=0+0+*+*+*` 即时触发验证（注意本地是 https；secrets 需 .dev.vars 提供，勿提交）。
- 历史坑：生产 Worker 曾缺 RESEND_KEY secret，Resend 401 被静默吞掉（密码重置/提醒邮件都发不出）；已于 2026-08-04 配置。scheduled 里已加 console.log（opt-in 数/跳过原因/Resend 状态码）。
- 安全测试地址：delivered@resend.dev（Resend 官方测试收件地址，不打扰真实用户）；测试 seed key `remind:999999` 用完即删。

## QA142 沉淀（2026-08-05）
- `zt_remind_hint` 是浏览器级 localStorage key（非按 uid），多账号对照测引导 toast 前必须 removeItem；引导 toast 于打卡后 ~3.5s 出现、仅显示 3s，截图卡 4–6s 窗口。
- 生产 API 偶发 23–79s 慢窗口：注册/登录 UI 可能超时但服务端已成功——先用 console fetch `/api/login` 探测账号是否已建再决定重试（前端已加注册超时可行动提示，build 0c4f799a）。
- CDP `Emulation.setDeviceMetricsOverride` 在 ws 断开即还原，390px 全流程须在同一 ws 会话内完成。

## QA144/UX145 沉淀（2026-08-05）
- Chrome 崩溃后可自行重启：`DISPLAY=:0 /opt/.devin/chrome/chrome/linux-137.0.7118.2/chrome-linux64/chrome --remote-debugging-port=29229 --user-data-dir=<原目录>`；重启后 browser_console 工具可能连不上 CDP，全部 JS 注入/量测改走 python websocket-client（suppress_origin=True）即可。
- 从 https 页面 `location.assign('file://…')` 被拦截且静默不跳；预览本地 HTML 须用 CDP `Page.navigate`，截图前务必核 `location.href`，否则会把旧页面误当预览。
- fb093e9 起 app2 toast 时长公式 `min(8000, max(3000, len×160 + (action?2000:0)))` ms，量测 toast 存活期按此预估截图窗口；带 action 的 toast 按钮 min-h 44px（d96411c）。
- /app2/ 与 /app2/index.html 已 no-store（fb093e9），普通 F5 即拿新 bundle，stale-bundle 坑已消除；hash 资产仍长缓存。
- 邮件一键退订：GET /api/remind/unsub?u=<uid>&t=<hmac16>（免登录，验签失败返回 HTML 400 页）；正确 token 可用 wrangler dev --remote 临时 console.log unsubUrl 获取（勿留在生产代码）。

## QA146 沉淀（2026-08-05）
- 每轮结束测试账号会被清库：复用上轮账号前先 console fetch /api/login 探测；账号被清后旧版 /app 收 401 会自动清残留 zt_token 回落登录页（非 bug）。
- /app meta app-build 可能因边缘传播/部署顺序短暂滞后于实际部署内容：核对部署以 HTML 内容特征（grep 新代码关键字）为准，meta 仅作辅助。

## 内容审计沉淀（147/148 轮，2026-08-05）
- 全量考点/科目审计：16 个 /zhenti/<year> 年卷页正则可取回约 3/4 生产映射，缺的逐题抓详页补齐；curl 抓详页必须带 -A "Mozilla/5.0" UA。
- /api/real/kps 需登录（401）；公开考点清单从 /zhenti/kaodian 的链接解析（当前 104 个聚合考点）。
- 数据订正后本地 data/realexam* 与 D1 保持同步（commit 注明「D1与源数据同步」）；内容审计可直接以本地 JSON 为准、抽查生产防漂移。third_party_material=1 的题无独立详页。
- 订正 kp/subject 后须删 KV agg:kps / agg:years 缓存并推 IndexNow。
- /zhenti/kaodian 聚合页只显示「当前有题」的考点：订正落库后某考点若无挂题会从页面消失（如「三个代表」重要思想），白名单数量随订正波动属预期；每轮内容审计须重抓白名单，勿复用上轮快照（149 轮实抓 103）。
- 白名单已知缺口（148/149 轮反复出现）：抗美援朝、道德的本质与功能/道德修养、中华传统美德、中共七大、毛泽东思想形成发展、资本主义政治制度——遇到只能「勉强归类」的题优先记为白名单缺口而非强行改挂。（150 轮已补齐前 5 项进官方考点库 src/library.js；新增考点必须同时加进 LIBRARY 带 desc，否则该考点 AI 补练 kpdrill 404）

## kpdrill/额度测试沉淀（151 轮）
- kpdrill 闭环 UI 触发：弱项榜需某考点作答 total≥2 才出现「AI 补练 ›」（History.tsx）；最快做法是挑恰好 2 题的考点组免费真题卷故意 0/2。
- 免费账号每日额度=模拟卷 1 + 快练 1（/api/me 的 quota.paper_left/quick_left）；报「生成无反应」先查 quota。
- 真题区「按考点」chip 排列密集，UI 点击前先 zoom 核对坐标避免误点相邻考点（152 轮已加就地过滤输入框+移动端 chip 40px 热区）。
- app2 React 输入框用 computer-use type 注入中文可能不生效（value 保持空），改用 CDP `Input.insertText`（先 el.focus()）。
- 快练额度耗尽最快制造路径：新号真题区 2 题考点卷 0/2 → 弱项榜 AI 补练 → material 页 5 题生成一次；再点 5 题生成即复现额度 toast（Material.tsx gen() 客户端预检，不发 POST）。
