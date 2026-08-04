# QA 第 141 轮 — 旧版 /app「我的」页每日提醒开关（生产 Worker 5b8fd1e8）

部署核对：curl 加 `?nocache=` 后 HTML 含 `remindBtn` ×2（无 nocache 时 cf-cache-status: HIT 返回旧 f6a294f 版本——浏览器需硬刷新并核对 `document.getElementById('remindBtn')` 存在）。
代码依据（public/app.html）：
- L2382-2388：「我的」页（viewAccount）修改密码卡上方新增「每日学习提醒」卡 + `#remindBtn`（iOS 风格开关，初始 disabled 灰色）。
- L2402-2412：`REMIND_ON` 全局；`loadRemind()` GET /api/remind 回显，加载前 disabled。
- L2414-2423：`toggleRemind()` 乐观更新 + POST /api/remind；成功 toast「已开启，每天 8:00 邮件提醒（已打卡当天不发）」/「已关闭每日提醒邮件」；失败回滚 `REMIND_ON=!next` + 错误 toast。
- 开态样式：`bg-brand-500` + knob `translateX(24px)`；关态 `bg-slate-200`。
后端与 app2 同一 KV `remind:<uid>`（GET 返回 {on:bool}）。

账号：新号 qa141-<ts>@test.zalize.com（报邮箱+uid，uid 取自 /api/me）。

## T1 开关开/关 + 持久化（旧版 /app）
「我的」页：
- 断言 A：初始开关灰色/关（`REMIND_ON===false`，btn 无 bg-brand-500）；console 带 token GET /api/remind = `{"on":false}`。
- 断言 B：点开 → 开关变蓝、knob 右移，toast 逐字「已开启，每天 8:00 邮件提醒（已打卡当天不发）」；GET = `{"on":true}`。
- 断言 C：F5 后仍为开（持久化）。
- 断言 D：点关 → toast「已关闭每日提醒邮件」，F5 后仍为关，GET = `{"on":false}`。

## T2 互通（旧版 ↔ app2）
- 旧版点开（留 on）→ 打开 /app2/#account（同 token 或重登）→ app2「每日学习提醒」switch 应为开。
- app2 点关 → 回旧版 /app「我的」F5 → 开关应为关（反向）。

## T3 失败回滚
console 包装 fetch 对 `/remind` POST 单次 reject(TypeError)：
- 断言 E：点开关 → 先乐观变色，随后回弹到原状态（截图）+ 错误 toast「Failed to fetch」；GET /api/remind 实际值未变。
- 之后移除包装，真实点一次恢复正常，最终留 **关**（KV 自删无残留）。

## T4 390px + 监控
- CDP 设备仿真 390px：「我的」页开关卡完整、scrollWidth=390 无溢出、开关可点。
- console/pageerror/HTTP≥400 全零（豁免：登录前 401、注入自证）。

执行顺序：硬刷新核对部署 → 注册（记 uid）→ T1 → T2 → T3 → T4。产出 test-report-141.md（关键截图，可不录长录屏）。
