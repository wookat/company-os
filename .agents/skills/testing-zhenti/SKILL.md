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
