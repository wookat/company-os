# QA 第 141 轮测试报告 — 旧版 /app「每日学习提醒」邮件开关（生产回归）

- 目标：https://zhenti.zalize.com/app （Worker Version 5b8fd1e8；页面 meta `app-build=f6a294f-202608042251`，浏览器内实测 HTML 含 `toggleRemind`，新代码已加载。注意：无 cache-buster 的 curl 命中 cf-cache HIT 返回旧版 HTML，浏览器需硬刷新）
- 测试账号（请清库）：**qa141-1785884033@test.zalize.com，uid=203**（无 attempt；KV `remind:203` 测试结束已关闭、自删无残留）
- 时间：2026-08-04 22:53–23:05（北京）
- 录屏：/home/ubuntu/screencasts/rec-0bffb1a0-28da-423d-acd3-c4748f6703fe/rec-0bffb1a0-28da-423d-acd3-c4748f6703fe-edited.mp4

## 结论

**本轮 4 个验收点全部通过。**

## T1 开关开/关 + 持久化（旧版 /app「我的」页）— passed

| 断言 | 结果 |
|---|---|
| 初始开关灰/关，`REMIND_ON=false`，带 token GET /api/remind=`{"on":false}` | ✅ |
| 点开：开关变蓝、knob 右移，toast 逐字「已开启，每天 8:00 邮件提醒（已打卡当天不发）」，GET=`{"on":true}` | ✅ |
| F5 后仍为开（持久化） | ✅ |
| 点关：toast「已关闭每日提醒邮件」，GET=`{"on":false}`，F5 后仍为关 | ✅ |

| 🔴 初始关态 | 🟢 点开后（toast + 蓝色开关） |
|---|---|
| ![初始关](https://app.devin.ai/attachments/c4b6e74b-a3f8-40f5-88dd-266fd44e04f6/ss_52b4b44a.png) | ![开启 toast](https://app.devin.ai/attachments/288f1838-94b6-40c1-8314-75942643c540/ss_08ba783a.png) |

| F5 后仍为开 | 点关（toast「已关闭每日提醒邮件」） |
|---|---|
| ![F5 持久化](https://app.devin.ai/attachments/438bca25-fd49-4052-95f7-7d76381e6523/ss_zoom_115e3981.png) | ![关闭 toast](https://app.devin.ai/attachments/1f2b1f10-88c4-4d4d-b2ee-bed7f2b6e173/ss_4f1accf8.png) |

## T2 互通（旧版 ↔ app2，同一 KV remind:<uid>）— passed

- 旧版关 → /app2/#account 开关同为关（正向前置）✅
- app2 点开（toast「已开启，每天 8:00 邮件提醒（已打卡当天不发）」）→ 回旧版 /app「我的」→ 开关为蓝/开 ✅

| 🟢 app2 点开 | 🟢 旧版 /app 同步为开 |
|---|---|
| ![app2 开](https://app.devin.ai/attachments/9cf4e827-59aa-4669-b0df-f73c4433c26b/ss_dc689913.png) | ![旧版同步开](https://app.devin.ai/attachments/82252e46-b126-4256-99ed-d2823f9c96ae/ss_e4ea947f.png) |

## T3 失败回滚 — passed

console 包装 fetch 对 `/remind` POST 单次 `reject(TypeError('Failed to fetch'))`（模拟断网），当前为开、点关：
- 乐观变灰后回弹为蓝（截图时已回弹完成）✅
- 错误 toast「Failed to fetch」出现 ✅
- 服务端状态未变：GET 仍 `{"on":true}` ✅
- 移除包装后真实点关成功，最终留关、F5 后仍为关 ✅

![T3 失败回滚：toast 报错、开关回弹为开](https://app.devin.ai/attachments/821d89b2-732b-4154-93aa-1bc0e79f1f94/ss_4ea79340.png)

![最终关态（F5 后）](https://app.devin.ai/attachments/9812d0cb-82b0-470e-ae6e-add5b401c93c/ss_zoom_ae52f748.png)

## T4 390px + 监控 — passed

- CDP 设备仿真 390px：`innerWidth=390, scrollWidth=390` 无横向溢出；开关卡完整，`#remindBtn` 56×32 位于视口内（x=297）可点。
- console/pageerror/HTTP≥400：`__errs=[]`、performance 无 ≥400 请求（注入自证日志豁免）。

![390px「我的」页开关卡](https://app.devin.ai/attachments/a1677602-468c-46f1-a36a-65f531656e50/qa141_390_account.png)

## 说明 / 未覆盖

- 「乐观变灰的中间帧」未截到（reject 同步返回、回弹瞬时完成），以回弹终态 + 错误 toast + 服务端未变为证据。
- 加载中 disabled 初始态（`REMIND_ON===null` 期间）因 GET 返回极快未肉眼目击，进入页面时已回显完成（disabled=false, off）。
- 实际邮件发送（Cron）不在本轮范围（QA136 已标 untested）。
- 环境插曲：CDP 调试连接两次短暂断连（约 15s 自动恢复），期间用 UI 继续，不影响结论。
