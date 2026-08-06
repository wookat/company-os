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

## Web→小程序 parity reference
`clients/zhenti-taro/功能对照表.md` already maps every Web feature to the mini-program/APP implementation with platform-limitation notes (print → PNG save, payment stays on Web). 微信开发者工具 is Windows/macOS only — weapp screenshots cannot be produced on the Linux box.
