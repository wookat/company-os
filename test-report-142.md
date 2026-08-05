# QA 第 142 轮测试报告 — 打卡后提醒引导 toast + /admin「每日提醒订阅」卡（生产 Worker 7dde0718）

- 日期：2026-08-05
- 环境：生产 https://zhenti.zalize.com/app2/ ，实际 bundle `assets/index-DmQjVwRZ.js`（curl `?nocache=` 与浏览器硬刷新一致，含 `zt_remind_hint`）；/admin 看板；admin key 走 X-Admin-Key（未打印）
- 计划：/home/ubuntu/zhentigongfang/test-plan-142.md
- 录屏：/home/ubuntu/screencasts/rec-e1a90300-b114-4dc7-b862-5b2ea249d437/rec-e1a90300-b114-4dc7-b862-5b2ea249d437-edited.mp4

## 测试账号（请清库）
| 邮箱 | uid | 用途 | 备注 |
|---|---|---|---|
| qa142a-1785888527@test.zalize.com | 205 | T1 首打卡（引导分支进入，toast 未截到帧） | 提醒未开 |
| qa142c-1785888527@test.zalize.com | 206 | T1 引导 toast 视觉证据（1440px） | 提醒未开 |
| qa142b-1785888527@test.zalize.com | 207 | T2 开提醒打卡无引导 + T3 admin ±1 | 提醒最终已关，KV 自删无残留 |
| qa142d-1785888527@test.zalize.com | 208 | T4 390px 引导 toast | 提醒未开 |

## 结果总览
| # | 验收点 | 结果 |
|---|---|---|
| T1 | 打卡成功后 ~3.5s 引导 toast + zt_remind_hint=1 | ✅ passed |
| T1' | 重复触发抑制（已有 key / 已开提醒不提示） | ✅ passed（以 T2 开提醒分支覆盖，key 写入已证） |
| T2 | 开提醒账号打卡无引导 toast（GET /remind on=true 分支） | ✅ passed |
| T3 | /admin「每日提醒订阅」卡出现且 0→1→0 与 KV 一致 | ✅ passed |
| T4 | 390px toast 不溢出 + console/pageerror/HTTP≥400 全零 | ✅ passed |

## T1 未开提醒账号：引导 toast + localStorage 键

qa142c（206，`zt_remind_hint` 打卡前实测 null）点「今日打卡」→ 先出「今日打卡成功 ✓…」toast，~3.5s 后出现引导 toast，文案逐字一致；随后 `localStorage.zt_remind_hint === '1'`。

![1440px 引导 toast「怕忘打卡？「我的」页可开启每天 8:00 邮件提醒」](https://app.devin.ai/attachments/27ae191d-c895-4509-9885-f4ca35e960c6/ss_6d736ae6.png)

备注：qa142a（205）首次执行时分支同样进入（打卡后 key 从 null 变 '1'），但因截图时机落在 toast 3s 显示窗之外未捕获到帧，遂用 qa142c 复现并截到视觉证据。

## T2 已开提醒账号：无引导 toast

qa142b（207）先在「我的」页开启提醒（switch 变蓝 + toast），回工作台、打卡前手动 removeItem('zt_remind_hint')（该 key 是浏览器级而非按 uid，需清除才能走 /remind 分支）。点「今日打卡」：

| 🔴 打卡成功 toast（t≈2s） | 🟢 t≈7s 无引导 toast |
|---|---|
| ![打卡成功](https://app.devin.ai/attachments/8e00dd9e-3ee2-48d0-b859-a4ce43236c43/ss_5a942ead.png) | ![无引导](https://app.devin.ai/attachments/d92bf4ac-eeda-4db8-a182-997c84a14dcf/ss_e4bd9367.png) |

t≈5s 与 t≈7s 两帧均无引导 toast；GET /api/remind = `{"on":true}`；`zt_remind_hint` 被写回 '1'（代码先写 key 再查 on，行为符合实现）。

## T3 /admin「每日提醒订阅」卡（0→1→0）

基线（测试前）`totals.remind_optin=0`。qa142b 开启提醒后看板出现新卡且数值 = 1：

| /admin 看板全景（卡在位，值=1） | 卡片放大 |
|---|---|
| ![admin 看板](https://app.devin.ai/attachments/f04d7710-a0d6-4136-97c7-7230171ac2c0/ss_2c9df0c2.png) | ![每日提醒订阅=1](https://app.devin.ai/attachments/b28a6e5f-6c6d-49ae-94cb-2c37e3ea9d2b/ss_zoom_be9efd96.png) |

副文案逐字「开启 8:00 邮件提醒的用户数（当天已打卡不发送）」。UI 关闭 switch 后（下图），X-Admin-Key curl `/api/admin/stats` 实测 `remind_optin=0`——与 KV `remind:` 前缀实际计数一致（+1/-1 双向验证）。

![qa142b 关闭提醒（switch 灰）](https://app.devin.ai/attachments/40971333-a776-4b41-80ea-03abf0bc15e8/ss_35cd0e70.png)

## T4 390px + 监控

qa142d（208）在 CDP 设备仿真 390×844（mobile, DPR2）下打卡，引导 toast 完整单行居中显示、rect left=16 / right=374（视口内）、`scrollWidth=390` 无横向溢出：

![390px 引导 toast 完整不溢出](https://app.devin.ai/attachments/93607592-9b11-4200-af0e-80ea4cdfa8c8/qa142_390_hint_toast.png)

监控：`window.__errs`（error/unhandledrejection）= []；performance 资源 `responseStatus>=400` = []（豁免：账号探测阶段 1 条计划内登录 401「邮箱或密码错误」，为确认 qa142b 未注册所发）。

## Escalations / 环境备注（非本轮改动缺陷）
- **生产 API 间歇性极慢（~23–79s）**：qa142b 注册/登录在 UI 上多次「请稍候…」后静默超时无 toast（客户端 fetch 超时被吞），实际服务端 23s 后 200 已入库。用户侧同样会遇到"点注册没反应"。建议关注 Worker 冷路径耗时（与 QA137 P2 同根源，注册/登录页也建议加超时错误提示）。
- 一次 CDP 调试连接短暂断连（~45s 自恢复），不影响结论。
- Cron 实际发信不在本轮范围。
