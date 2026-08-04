# QA 第 140 轮 — 旧版 /app 交卷防重复修复（生产 Worker Version 97cd7711）

部署核对（已完成）：curl /app → meta `app-build=07780f5-202608042224`，HTML 内 `js-submit` ×4（新代码已上线）。执行时浏览器内再核对 `document.querySelectorAll('.js-submit')` 与 `typeof SUBMITTING`。
代码依据（public/app.html）：
- L1621-1622：两个交卷入口均有 class `js-submit`（提前交卷文字链 + 末题主「交卷」按钮）。
- L1681-1692：`SUBMITTING` 全局防重入；确认后 disabled + `dataset.t` 存原文案 + 文案「交卷中…」+ opacity-60。
- L1697/1703：成功或 409 → 清 `zt_exam_<pid>`、SUBMITTING=false、renderResult。
- L1707-1709：非 409 失败 → 恢复按钮文案/可点 + toast + `updateClock()` 恢复计时。

账号：新号 qa140-<ts>@test.zalize.com（报邮箱 + uid，uid 由 console 带 token GET /api/me 获取）。

## T1 正常交卷（2026 卷，兼低分回归）
答 2 题提前交卷：
- 断言 A：直接落 `#result/<pid>`，`zt_exam_<pid>`=null，performance 中该 pid 的 /submit POST **仅 1 条**（200）。
- 断言 B（回归）：3% 低分成绩页无「击败了 X%」行，grade 评语在位。

## T2 双击防重复（核心对抗，2025 卷）
console 包装 fetch：仅对 `/submit` 将响应 resolve 延迟 6s（请求照发，计数器 `__submitN` 记次数）。答 1 题 → 点「提前交卷→确定交卷」→ 立刻连点「提前交卷」文字链与主按钮各多次：
- 断言 C：pending 期间截图可见两个 js-submit 按钮文案「交卷中…」且 disabled（DOM 读 disabled=true + 屏幕截图）。
- 断言 D：`__submitN === 1`（狂点未发出第二次 POST；旧行为对照：QA139 中双击造出 2 条 attempt）。
- 断言 E：延迟结束后落成绩页，「历史成绩」仅 1 条；`zt_exam_<pid>`=null。

## T3 409 对抗（2024 卷）
答 1 题后 console 带 token 先 POST /submit（200），再 UI 交卷（收 409）：
- 断言 F：直接落 `#result/<pid>`、无错误 toast、`zt_exam_<pid>`=null、成绩页历史成绩仅 1 条（409 不产生第二条 attempt）。

## T4 非 409 失败恢复（2023 卷）
console 包装 fetch：对 `/submit` 首次调用直接 `reject(new TypeError('Failed to fetch'))`（模拟断网），之后恢复原 fetch。答 1 题 → UI 交卷：
- 断言 G：toast 报错出现（截图）；两个 js-submit 恢复原文案（「提前交卷（1/33）」等）且可点（disabled=false）；计时 ⏱ 恢复走动（间隔 2s 两次读数不同）。
- 断言 H：随后再点交卷（真实网络）→ 正常落成绩页，attempt 仅 1 条。

## T5 回归
- 390px：答题页底栏两个交卷入口完整可点、pending 文案不溢出（用 T2 或静态答题页核对）；1440px 正常。
- console/pageerror/HTTP≥400 清零（豁免：计划内 409、登录前 401、扩展 beacon；T2/T4 的 fetch 包装自证日志）。
- 工作台每日一题卡正常展开（揭晓前无答案泄漏）。

执行顺序：注册（记 uid）→ T1 → T2 → T3 → T4 → T5 汇总。产出 test-report-140.md + 录屏。
