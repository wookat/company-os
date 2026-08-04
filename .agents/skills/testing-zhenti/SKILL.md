---
name: testing-zhenti
description: How to QA-test 真题工坊 production (https://zhenti.zalize.com) end to end — accounts, D1 data seeding, print/viewport checks.
---

# Testing 真题工坊 (zhenti.zalize.com)

- Repo: `~/zhentigongfang` (Cloudflare Worker, `src/index.js` + `public/*.html`). Verify deployed build via `<meta name="app-build">` on /app.
- Accounts: self-register at /app with email+password (e.g. `qaNN-<ts>@test.zalize.com`); report the email so the boss can purge it.
- Wrangler `d1 execute --remote` fails with code 7403 for the available tokens. Instead use the D1 HTTP API with `CLOUDFLARE_GLOBAL_API_TOKEN`:
  `POST https://api.cloudflare.com/client/v4/accounts/ddff52d24ee44e21a021c15eaffcc86d/d1/database/152f4fee-d77d-400d-a994-7db3dcfa5430/query` with `{"sql":"..."}`.
  Useful for backdating `attempts.created_at` to test week-over-week comparisons (times are UTC, `YYYY-MM-DD HH:MM:SS`).
- To get wrong-book entries: unanswered questions do NOT enter the wrong book — deliberately answer a multi-select question with a single obviously-wrong option, then submit early (提前交卷 → 确定交卷).
- Weekly summary line (dashCard): only renders when the user has attempts in the current 7-day window; N = number of attempts, pct = Σscore/Σtotal rounded.
- Public SEO pages live at `/zhenti/<year>` (NOT `/real/<year>`, which 404s). Print buttons use `window.print()` on a hidden `#printArea` div; Chrome preview shows it directly.
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
