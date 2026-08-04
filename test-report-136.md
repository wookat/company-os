# QA 第 136 轮测试报告 — 每日学习提醒（opt-in）+ 胶囊修复复验（生产 build f4df45a）

- 站点：https://zhenti.zalize.com/app2/ （硬刷新后实际加载 `assets/index-Dv7J3b5U.js`，与 curl 到的 f4df45a 产物一致）
- 测试账号（请清库）：**qa136-1785878881@test.zalize.com**
- KV 清理：**无需清理**。测试最终把 switch 关闭，POST {on:false} 走 `RATELIMIT.delete("remind:<uid>")`（src/index.js L1918），关后 GET 实测 `{"on":false}`，键已自删。
- 录屏：/home/ubuntu/screencasts/rec-2382fefc-5437-4ab8-a165-09a804508f4d/rec-2382fefc-5437-4ab8-a165-09a804508f4d-edited.mp4

## 结论
本轮全部执行的验收项通过；**Cron 定时发信（Resend 邮件）未实测**（`0 0 * * *` 无法即时触发，按本轮要求跳过），失败回滚分支未注入失败故障（untested，代码路径 Account.tsx L30-33 存在）。

## T1 每日学习提醒开关（#account）

| 步骤 | 期望 | 实测 | 结果 |
|---|---|---|---|
| 初始态 | 卡存在、switch 灰 | 「每日学习提醒」卡 + 文案「每天 8:00 发邮件提醒：到期错题数 + 每日一题；当天已打卡则不打扰」，switch 灰、滑块居左 | ✅ |
| 初始 API | GET /api/remind = {"on":false} | `{"on":false}`（console 带 Bearer token fetch） | ✅ |
| 未登录 | 401 | 无 Authorization fetch → status 401 | ✅ |
| 点开 | 变蓝 + toast | toast 逐字「已开启，每天 8:00 邮件提醒（已打卡当天不发）」，switch 蓝、滑块右移 | ✅ |
| 开后 API | {"on":true} | `{"on":true}` | ✅ |
| F5 | 仍 on | switch 蓝色回显 | ✅ |
| 点关 | 变灰 + toast | toast「已关闭每日提醒邮件」 | ✅ |
| F5 | 仍 off | switch 灰 | ✅ |
| 关后 API | {"on":false} | `{"on":false}` | ✅ |
| 390px | 可点不变形 | switch rect 48×28（h-7 w-12），开/关各一次 toast 正常，scrollWidth=390 | ✅ |
| 失败回滚 | 回滚 + 错误 toast | 未注入失败（untested） | ⏸ |
| Cron 发信 | — | 未实测（按要求跳过） | ⏸ |

| 🔴 1440px 初始 off | 🟢 点开后（toast + 蓝色） |
|---|---|
| ![初始off](https://app.devin.ai/attachments/71c49f68-4dbf-442b-91de-6c042fc842fc/ss_614b8e06.png) | ![开启toast](https://app.devin.ai/attachments/c41cc845-b49c-4aa9-8412-cae0d9bec6fb/ss_a2209a7c.png) |

| 🟢 F5 后仍 on（持久化） | 🟢 点关后（灰 + 已关闭 toast） |
|---|---|
| ![F5仍on](https://app.devin.ai/attachments/105cece7-4ff9-4729-865b-510432d12b56/ss_d699a9c4.png) | ![关闭toast](https://app.devin.ai/attachments/6e0b116f-ce88-43aa-843a-1af5e3eb5e22/ss_5f61e2b8.png) |

| 🟢 390px 点开（toast「已开启…」） | 🟢 390px 点关（toast「已关闭每日提醒邮件」） |
|---|---|
| ![390开](https://app.devin.ai/attachments/e478d69d-dc5b-455b-a698-8bd3b32fec8f/ss_abb768e6.png) | ![390关](https://app.devin.ai/attachments/acdc261e-df4f-46a0-bf05-e965920c6241/ss_37eb2f93.png) |

## T2 回归：390px 新版本胶囊（top-2/py-2 修复复验）
- 负例：不拦截 dispatch visibilitychange → 胶囊数 0（不误报）✅
- 正例（伪 bundle index-FAKE0000.js）：胶囊单行，rect `top=8 bottom=40 height=32`（QA135 为 top=12 bottom=48 height=36）；hero 问候「你好，qa136-…」rect `top=40`；**bottom(40)=hero top(40)，几何重叠=false**——QA135 的 ~8px 微叠已消除 ✅

| 🟢 390px 胶囊与 hero 问候（放大，无重叠） |
|---|
| ![胶囊](https://app.devin.ai/attachments/e6fd76ac-3cd7-4120-b543-5e0bb67882da/ss_zoom_11da8999.png) |

## T3 回归杂项
- 成绩分享图按钮：qa136 号做 2026 卷 1 题提前交卷 → #result/321 页「📷 生成成绩分享图 ›」按钮仍在（1/33 · 正确率 3% · 击败 34%）✅

| 🟢 成绩页分享按钮仍在 |
|---|
| ![result](https://app.devin.ai/attachments/e1c3f63d-5b74-4949-92c2-bc1bc8fbac7d/ss_5156ad06.png) |

- 监控：console error / pageerror 清零；performance 资源 HTTP≥400 = 0 ✅
- 环境插曲（非产品问题）：测试中 CDP 调试连接短暂断连约 1 分钟后自动恢复，期间用 UI 完成了 F5 复核，不影响结论。
