---
name: testing-zhenti-taro-h5
description: How to run and QA-test the 真题工坊 Taro client (clients/zhenti-taro, branch zhenti-client) as H5 against the live production API, including accounts, quota rules, and known input pitfalls.
---

# Testing zhenti-taro H5 against production

## Start the app
```bash
cd /home/ubuntu/company-os/clients/zhenti-taro && npm run dev:h5
```
Serves at http://localhost:10086 (also reachable via LAN IP). devServer proxies `/api` → https://zhenti.zalize.com (LIVE production — never modify backend data destructively).

## Viewport
Use Chrome DevTools device emulation at 375×812 for all UI checks. DevTools must stay open for emulation; the recording will show it — acceptable, the phone-sized viewport on the left is the app under test.
Check overflow per page in console: `document.documentElement.scrollWidth <= 375`.

## Test accounts
- Fresh account (no data, good for onboarding-card tests): devin.taro@test.zalize.com / TaroTest2026
- Account with history: devin.taro.test@example.com / TaroTest123
New registrations may be IP rate-limited; prefer these accounts.

## Free-tier quota (per day, resets 00:00)
1 模拟卷 (10 题) + 1 份 5 题快练, max 10 题; 15/20 题 locked 🔒 for non-pro. AI generation takes ~1–2 min with a polling "AI 正在出卷" state that auto-enters the exam page. Run the full AI loop only ONCE per day; after the 快练 is used, generating a 5-题 drill shows toast「今日快练已用完，可改选 10 题走模拟卷额度」 (useful to verify the quota-exhausted path without burning quota).

## Known pitfalls
- Taro controlled `<input>` fields (login, search, kps filter) can drop/duplicate characters with fast automated typing. Workaround: click field, clear with End + repeated BackSpace (Ctrl+A/Delete may not work), then type slowly or paste via clipboard (xdotool/Ctrl+V).
- Drill page opened directly (`#/pages/drill/index`) without a `material` param has no kp chips; enter via kps page AI button or `?material=<id>`.
- Share cards (打卡/成绩) are 640×800 Canvas PNGs; on H5 the download lands in ~/Downloads — verify PNG signature and dimensions.
- Result page: accuracy <40% (or beat<20%) shows grade copy instead of「击败 X% 研友」.
- Onboarding card hides via localStorage key `zt_onboard_done:<uid>` — clear it to re-show.

## 三期 (R1-R16) feature testing tips
- Free non-quota papers for multi-attempt tests: 时政月更 card on years tab (`/api/real/shizheng`, 20 题) and any 年份真题 模考 — neither consumes AI quota. Never POST /api/papers or hit /api/kpdrill during acceptance runs.
- Timed mode: localStorage values are Taro-wrapped — draft is under `JSON.parse(localStorage['zt_exam_draft:<paperId>']).data.sec`. To trigger red warn set sec≈3350 and refresh; to trigger auto-submit set sec≈3590 and refresh (toast「时间到，已自动交卷」→ result page shows 用时 60:00). Anti-rewind: lowering sec is overwritten by max(prevSec, elapsed) at the 10s persist tick.
- First-paper badge uses server attempt_count plus localStorage `zt_done1:<email>`; test order matters — do 409 check-in test BEFORE any exam on a fresh account.
- Score count-up (900ms) is hard to screenshot; prove it with a MutationObserver on `.result-score` logging text changes (should log 0..N).
- Register per-run throwaway accounts as `taroN-*@test.zalize.com` and list them (email+password) in the report for cleanup.

## 五期 feature testing tips
- Chinese text typed via computer-use `type` does NOT land in Taro textareas (value stays empty). Use clipboard: `printf '中文…' | xclip -selection clipboard` on the box, then click the field and Ctrl+V.
- Direct shell HTTP requests (curl/python) to https://zhenti.zalize.com return 403 (WAF). To seed data (e.g. wrong-book entries via paper submits), run `fetch` in the browser console with the app's `zt_token` — same-origin `/api/*` via the dev proxy works (200).
- Wrong-book endpoint is `/api/wrongbook` (`/api/wrong` → 接口不存在). Restore a session with `localStorage.setItem('zt_token', JSON.stringify({data: token}))` — tokens can expire mid-run (「登录已过期」); just register a fresh `taroN-*@test.zalize.com`.
- AI 逐点批改 (recite page) hits `/api/subjgrade`, 10/day/account, takes 5-20 s; <20 chars keeps the button `disabled` with zero requests — use that for the guard path instead of burning quota on 400s.
- Seeding wrong answers: submit a 年份真题 paper with all answers "A" via browser fetch (`/api/papers/<id>/submit`) — mismatched keys create due wrong-book entries immediately.

## 六期 feature testing tips
- The two documented test accounts may 401 (邮箱或密码错误) — go straight to registering a fresh `taroN-*@test.zalize.com` if the first login fails, don't burn time retrying.
- 全真模考: entry is the「全真模考」pill on each years-page row; modal question count is dynamic (`n+5`). Full-mock papers get title「…全真模考卷」, exam page keeps essays in the flow (last 5), forces timed mode with 180-min countdown, drafts under `zt_exam_draft:<paperId>` (+ `zt_essay_<paperId>` for essay text) so F5 restores answers/essay/index/timer.
- In DevTools device emulation, mouse clicks may NOT focus Taro textareas (activeElement stays BODY). Fix: focus programmatically in console `document.querySelectorAll('textarea')[i].focus()` then Ctrl+V paste — this fires proper React input events.
- Verify essay-self / subjgrade network calls non-invasively via `performance.getEntriesByType('resource').filter(e=>/essay-self|grade/.test(e.name))` in the console (works through the dev proxy).
- Big-font pills: result page toggles `zt_result_bigfont`, recite page `zt_subj_bigfont` (Taro-wrapped `{"data":"1"}`); prove with computed fontSize before/after (result 14→17px, recite 15→18px).
- Dark mode: three-state seg on mine page writes `zt_theme` ("dark"/"light", removed for auto); dark html gets class `theme-dark`, body `rgb(15,20,32)`. Auto mode follows DevTools Rendering → emulate prefers-color-scheme.

## Web→小程序 parity reference
`clients/zhenti-taro/功能对照表.md` already maps every Web feature to the mini-program/APP implementation with platform-limitation notes (print → PNG save, payment stays on Web). 微信开发者工具 is Windows/macOS only — weapp screenshots cannot be produced on the Linux box.
