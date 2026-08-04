---
name: testing-zhenti
description: How to QA-test 真题工坊 production (https://zhenti.zalize.com) end to end — accounts, D1 data seeding, print/viewport checks.
---

# Testing 真题工坊 (zhenti.zalize.com)

- app2 update pill never renders on `#exam/:pid` — App.tsx marks exam as fullscreen (no Layout wrapper), so "pill interrupts mid-exam" scenarios are impossible by design; test answer persistence via F5 instead (answers/elapsed/marks auto-restore from localStorage `zt_exam_<pid>`).
- Slow-API submit trap: `POST /papers/:pid/submit` may succeed server-side while the client never gets the response (UI stays on exam page, no toast); a retry returns 409 with no user feedback. Check `/api/history` to confirm whether the attempt actually landed, and use `#result/:pid` directly to reach the result page. (Fixed in fd5ad30: submit button shows 交卷中… pending + disabled, and a 409 on retry is treated as success — clears `zt_exam_<pid>` and navigates to `#result/:pid`. To provoke the 409 branch deliberately: console `fetch POST /api/papers/:pid/submit` with `Authorization: Bearer localStorage.zt_token` first, then submit via UI.)
- Result-page 击败 line & share card need `pct>=40 && beat_pct>=20` (fd5ad30); below 40% both use the grade copy instead. To seed a ≥40% score cheaply: real papers are free/unlimited — open a year's 背题模式 to read the correct answers, then start that year's 整卷模考 and answer 14+/33 correctly via keyboard shortcuts (A–D select, →/Enter next), 提前交卷. Note: clicking 整卷模考 for an already-submitted paper just routes to its existing `#result/:pid` (no retake), and 立即重练本卷错题/错题重练 open the non-scored `#practice` mode (no result page / beat_pct).

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
