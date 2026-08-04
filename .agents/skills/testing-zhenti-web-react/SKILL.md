---
name: testing-zhenti-web-react
description: How to run and QA-test the 真题工坊 React web client (web/ in company-os-app, branch zhenti-web-react) against the live API.
---

# Testing 真题工坊 React Web (web/)

- Start: `cd web && npm run preview` → http://localhost:4173/app2/ (or `npm run dev`, port 5173). `/api` is proxied to live https://zhenti.zalize.com in vite.config.ts — it WRITES to production D1, so self-register a throwaway account `qaNN-<ts>@test.zalize.com` and report the email for purge.
- Hash routes: `#home #real #realyear/<y> #exam/:id #result/:id #wrong #practice #realsubjlist #realsubj/<y> #history #account`. Token in localStorage `zt_token`.
- Free endpoints (no AI quota): GET `/real/paper?year=`, `/real/randpaper` (#realrand), `/wrongbook/:id/review`. NEVER click 生成仿真模拟卷 (POST /papers), 今日模拟卷/快练 (POST /papers/daily), or material-page generate buttons.
- To seed the wrong book: do the 2026 整卷模考 and deliberately answer wrong; unanswered questions do NOT enter the wrong book. Multi-select questions (Q17+) support keyboard A–D shortcuts; the exam footer 下一题 button stays at a fixed position, so alternate key presses + clicking 下一题 is fast.
- Desktop 1440x900: don't change VNC resolution with xrandr mid-session — computer-use click mapping goes stale (clicks land at wrong coords). Instead keep the native resolution and size Chrome with `wmctrl -r <title> -e 0,0,0,1472,1029`, then verify `[innerWidth, innerHeight] == [1440, 900]` in console.
- Mobile 390x844: DevTools device toolbar (F12 → Ctrl+Shift+M), set 390x844, then F5 to re-render tabBar layout.
- Chinese text input: `type` action may fail on some fields; focus the field then `DISPLAY=:0 xdotool type --delay 100 "文本"`.
- Gotcha: `stats.attempt_day_ts` from the live API is `"YYYY-MM-DD HH:MM:SS"` strings, NOT unix seconds — parsing with `new Date(t*1000)` blank-crashes the page (`RangeError: Invalid time value`; hit and fixed in History.tsx 2026-08 via string/localDay parsing). If a page is blank, check the console for this error first.
- After a rebuild (`npm run build` → public/app2), `npm run preview` serves the new bundle immediately; just F5 in the browser (verify the `index-*.js` hash changed via `curl -s localhost:4173/app2/ | grep -o 'index-[^\"]*\.js'`).

## Devin Secrets Needed
- none (self-registered accounts; live API via proxy)
