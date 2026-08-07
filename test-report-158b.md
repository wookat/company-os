# QA158b 测试报告 · 工作台「本周摘要」窄屏近四周热力格（build 4ce3333）

- 生产：https://zhenti.zalize.com/app2/ ，bundle `assets/index-BKZ-tePV.js`（已确认内含「近四周打卡」×2 与 `xl:hidden`，即 4ce3333 已部署）
- 测试账号：**qa158b-1786100223@test.zalize.com，uid=275**（打卡 1 条 daily_checkin、每日一题揭晓；无卷/attempt/错题/material）——请用户清库
- 代码依据：web/src/pages/Home.tsx L583-592（新块）、L255-262（daySet/streak）、L727（右栏 HomeRail 原热力格）
- 方法：注册新账号 → UI 揭晓每日一题触发今日打卡 → CDP 设 390×844 mobile / 1440×900 桌面双视口断言 + 截图；全程 CDP 监听 console/pageerror/HTTP≥400。有简短录屏。

## T1 390px 移动端新块 — PASSED

DOM 量测（CDP）：
```json
{"text":"近四周打卡· 连续 1 天 🔥","cells":28,"lit":1,"litTitles":["2026-08-07"],
 "today":"2026-08-07","visible":true,"iw":390,"sw":375}
```
- 本周摘要卡内出现「近四周打卡 · 连续 1 天 🔥」✓
- 7×4 网格恰 28 格、唯一点亮格 title=今日（2026-08-07，右下角品牌蓝）✓
- innerWidth=390、scrollWidth=375 无横向溢出 ✓

| 390px 本周摘要卡（zoom） | 打卡成功（1440px 前置） |
|---|---|
| ![390 摘要卡热力格](https://app.devin.ai/attachments/1bd35d5a-7cef-4f44-b252-6567162ee045/ss_zoom_bc919796.png) | ![打卡成功庆祝](https://app.devin.ai/attachments/6429005a-2cf7-4ac3-a09b-198bf7054ac6/ss_4494b1ff.png) |

## T2 1440px 桌面隐藏 + 右栏照旧 — PASSED

DOM 量测：
```json
{"mobileBlkDisplay":"none","mobileBlkW":0,
 "rail":{"cells":28,"lit":1,"litTitle":"2026-08-07","visible":true},
 "iw":1440,"sw":1425}
```
- 摘要卡内新块 `display:none`（xl:hidden 生效），截图可见卡内无热力格 ✓
- 右栏「近四周打卡」卡照旧：28 格、今日格点亮 ✓
- scrollWidth=1425 ≤1440 无溢出 ✓

| 🟢 1440px 摘要卡（无热力块） | 🟢 1440px 右栏热力格照旧 |
|---|---|
| ![1440 摘要卡](https://app.devin.ai/attachments/c71b4c47-dec7-43be-9e7d-30ce73614043/ss_zoom_2fb780c0.png) | ![右栏近四周打卡](https://app.devin.ai/attachments/3be08e59-5f8b-4dae-bad8-cc64b262a9bf/ss_zoom_8a458ae8.png) |

整页 1440：![1440 整页](https://app.devin.ai/attachments/e0357f5f-c609-40c7-a36b-e48ac53d0add/ss_c18e9f8b.png)

## T3 运行时监控 — PASSED（1 条豁免说明）

- console error = 0、pageerror = 0
- HTTP≥400：仅 1 条 **409 /api/checkin**——为未学习状态点「今日打卡」时服务端 gating 的预期响应（前端据此展示「今天还没学习哦…」提示，Home.tsx postCheckin 对 409 的既定处理），非缺陷；除此之外全零。

## 结论

三条断言全部通过，无新 P 级问题。改动符合规格：<xl 视口本周摘要卡内新增 28 格近四周热力+「连续 N 天 🔥」，xl 及以上隐藏且右栏原热力格不变。

录屏：/home/ubuntu/screencasts/rec-dffeb4af-a23d-4f95-8e3b-8d323bff4d06/rec-dffeb4af-a23d-4f95-8e3b-8d323bff4d06-edited.mp4
