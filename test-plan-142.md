# QA 第 142 轮 — 打卡后提醒引导 toast + /admin 提醒订阅卡（生产 Worker 7dde0718）

部署核对（已完成）：`/app2/?nocache=` 实际 bundle `assets/index-DmQjVwRZ.js` 含 `zt_remind_hint` ×1；admin key（~/.zhenti_admin_key，勿打印）curl /api/admin/stats 200，基线 `totals.remind_optin=0`。
代码依据：
- web/src/pages/Home.tsx L253-276：`doCheckin()`（工作台「今日打卡」按钮）成功 toast 后，若无 `zt_remind_hint` 则写 `=1` 并 GET /remind，`!d.on` 时 3.5s 后 toast「怕忘打卡？「我的」页可开启每天 8:00 邮件提醒」；已开提醒（d.on）不提示；已有 key 完全跳过。
- public/admin.html L221：「每日提醒订阅」卡 `totals.remind_optin`，副文案「开启 8:00 邮件提醒的用户数（当天已打卡不发送）」。
- src/index.js L1115-1116：KV `remind:` 前缀 list 计数。
注意：`zt_remind_hint` 是浏览器级（非按 uid），账号 B 打卡前需手动 removeItem 才能走 /remind on 分支。

账号：qa142a-<ts>（未开提醒）、qa142b-<ts>@test.zalize.com（先开提醒）。报邮箱+uid。

## T1 未开提醒账号：引导 toast 出现（qa142a）
前置：`localStorage.zt_remind_hint` 为空。工作台点「今日打卡」：
- 断言 A：先出打卡成功 toast；约 3.5s 后出现第二条 toast **逐字**「怕忘打卡？「我的」页可开启每天 8:00 邮件提醒」（截图为凭）。
- 断言 B：`localStorage.zt_remind_hint === '1'`。

## T2 已开提醒账号：无引导（qa142b）
qa142b 先在「我的」页开启提醒（顺手为 T3 造数 +1）→ 回工作台，console `removeItem('zt_remind_hint')` 后点「今日打卡」：
- 断言 C：打卡成功 toast 出现后 **等待 ≥6s 无第二条引导 toast**（截图 6s 时刻无 toast）；`zt_remind_hint` 已被写回 '1'（分支进入但 d.on=true 抑制）。

## T3 /admin「每日提醒订阅」卡
- 断言 D：qa142b 开启提醒后，/admin 看板出现「每日提醒订阅」卡且数值 = 1（基线 0 → +1）；curl stats 同值。
- 断言 E：qa142b 关闭提醒后，curl stats `remind_optin` 回落 0（看板可 F5 复核）。

## T4 回归
- 390px（CDP 仿真）：qa142a 的引导 toast 若可复现（新号 c 或用 T1 时机直接 390 截图）文本完整不溢出；至少验证 390 下工作台无横向溢出。
- console/pageerror/HTTP≥400 全零（豁免：登录前 401）。

执行顺序：注册 a（记 uid）→ T1（390 下执行以兼 T4 toast 截图）→ 注册 b → 开提醒 → T3-D → T2 → 关提醒 → T3-E → 汇总。产出 test-report-142.md + 关键截图。
