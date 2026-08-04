# QA 第 136 轮 — 每日学习提醒开关 + 胶囊修复复验（生产 build f4df45a）

部署核对（已完成）：app2 curl=assets/index-Dv7J3b5U.js（执行时与 document.scripts 比对）。
代码依据：
- src/index.js L1911-1918：GET /api/remind → `{on: !!KV RATELIMIT.get("remind:<uid>")}`；POST {on:true} → KV put(值=email)，{on:false} → delete；rateLimit 20/h。
- web/src/pages/Account.tsx L14-34, L153-164：#account「每日学习提醒」卡，role="switch"，on 时 `bg-brand-500`+滑块 left-[22px]，off 时 `bg-black/15`+left-0.5；开 toast「已开启，每天 8:00 邮件提醒（已打卡当天不发）」，关 toast「已关闭每日提醒邮件」，失败回滚 setRemind(!next)。
- web/src/components/Layout.tsx L87：胶囊 `fixed top-2 … py-2 text-xs sm:text-sm whitespace-nowrap`（上轮 top-3/py-2.5 → top-2/py-2 修复）。
- Cron scheduled（src/index.js L2185 起）不要求实测发信（无法即时触发），跳过，报告注明 untested。

账号：新号 qa136-<ts>@test.zalize.com（报邮箱清库；测试结束把 switch 关掉，KV remind: 键自清）。

## T1 提醒开关核心流（1440px → #account）
1. 断言 A 初始态：「每日学习提醒」卡存在；switch 初始灰（bg-black/15、滑块居左）；console 带 token fetch GET /api/remind → `{"on":false}`。
2. 断言 B 开启：点 switch → 立即变蓝、滑块右移；toast 逐字「已开启，每天 8:00 邮件提醒（已打卡当天不发）」；GET /api/remind → `{"on":true}`。
3. 断言 C 持久化：F5 刷新 → switch 回显仍 on（蓝）。
4. 断言 D 关闭：点 switch → 变灰；toast「已关闭每日提醒邮件」；F5 后仍 off；GET → `{"on":false}`。
5. 断言 E 未登录 401：console 无 Authorization 的 fetch('/api/remind') → status 401。
6. 390px：#account switch 可点、不变形（h-7 w-12 圆角胶囊），开/关各一次回显正常，scrollWidth=390。
   （最终状态留 off，避免遗留 KV remind: 键。）

## T2 回归：390px 新版本胶囊（QA135 P4 残留修复复验）
伪 bundle 覆写 + visibilitychange → 胶囊出现：
- 断言：单行（高 ≤36px，py-2 应为 ~32px）、top=8（top-2，QA135 为 top-3/12px 且底边 48 与问候 top 40 有 8px 叠）——本轮胶囊 bottom 应 ≤ hero 问候 rect top（无几何重叠）；视口内无溢出。负例：刷新后不拦截 dispatch → 胶囊数 0。

## T3 回归杂项
- #result 成绩页「📷 生成成绩分享图 ›」按钮仍在（用 qa136 号做卷成本高——改用直接断言：本号不做卷则无成绩页；改为在 #home 确认无报错 + 至少验证按钮所在 Result 路由不回归可跳过，若时间允许做 2 题交卷复查按钮存在）。
- console/pageerror/HTTP≥400 清零（既知豁免：扩展 beacon、登录前 401、canvas data:URL sourcemap 噪音）。

执行顺序：注册 → T1（1440 开关全链 + 401 + 390 开关）→ T2 胶囊 → T3 汇总。
产出：test-report-136.md（内嵌截图）+ 录屏 + 测试邮箱 + KV 清理确认（关掉即无需清理）。
