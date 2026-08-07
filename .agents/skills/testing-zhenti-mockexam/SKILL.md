---
name: testing-zhenti-mockexam
description: How to QA-test 真题工坊「全真模考」mock-exam mode locally (wrangler dev + local D1), including AI grading and dark/viewport checks.
---

# Testing 真题工坊 全真模考 (local)

## Environment
- Run worker locally: `cd ~/repos/company-os && npx wrangler dev --port 8787 --local-protocol http` (needs `JWT_SECRET`, `DEEPSEEK_KEY` env vars). Frontend served at `http://localhost:8787/app2/` from `public/app2`; rebuild with `cd web && npm run build` after frontend changes.
- Verify local D1 data with `npx wrangler d1 execute DB --local --command "SELECT ..."` (`sqlite3` may not be installed). 2026 should have 33 rows in `real_questions` (third_party_material=0) + 5 in `real_subjective`.
- Never hit zhenti.zalize.com write endpoints; register throwaway accounts like `mockqa-<ts>@test.zalize.com`.

## Key flows & gotchas
- Mock exam entry: `#real` → year card → 全真模考 button → rules modal → 开始模考 (`GET /api/real/mockpaper?year=`). If a mock paper for that year already exists and was submitted, the button navigates straight to `#result/<pid>` — use another year to get a fresh exam page.
- Rules modal question counts are dynamic per year (from `/real/years` `y.n`: 整卷 n+5 题; 「共 50 分」only when n=33, e.g. 2026=38, 2025=36).
- Countdown: mock papers use 180 min; clicking the timer shows a toast and cannot disable it. Answers + elapsed persist in localStorage (`zt_exam_<pid>`, essays in `zt_essay_<pid>`), so F5 must restore state without timer rewind.
- Typing Chinese into the essay textarea via synthetic key events may not register; use clipboard: `printf '中文…' | xclip -selection clipboard` then Ctrl+V in the textarea.
- AI grading (`POST /subjgrade`) is a real DeepSeek call — keep total calls low; textarea prefills from the local essay answer; requires ≥20 chars.
- Dark mode toggle: 我的 (#account) → 外观 → 深色. Viewport checks: use Chrome DevTools device toolbar (Ctrl+Shift+I, Ctrl+Shift+M) at 390x844 and 1440x900.

## Devin Secrets Needed
- `DEEPSEEK_KEY` (AI grading), `JWT_SECRET` (worker auth) — injected as env vars for `wrangler dev`.
