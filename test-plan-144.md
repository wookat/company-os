# QA 第 144 轮 — UX143 四项修复回归（生产 build fb093e9）

部署核对（已完成）：`curl -I /app2/` → `cache-control: no-store`；无 cache-buster 的 `/app2/` 已返回新 bundle `assets/index-BV7nC1cC.js`（内含「去开启」×1）；`/app?nocache=` 已含统一文案。
代码依据：
- Home.tsx L264-276：`zt_remind_hint` 改为计数（'0'→'1'..'3'，≥3 不再提示；GET /remind d.on=true 时直接写 '3'）；toast 文案改为「怕忘打卡？可开启每天 8:00 邮件提醒」（17 字）+ action `{label:'去开启 ›', hash:'account'}`。
- store.tsx L46-51：toast 时长 `min(8000, max(3000, len*160 + (action?2000:0)))`——引导 toast ≈17×160+2000=4720ms；注册超时文案 45 字 ≈7200ms（无 action）。
- public/_headers：`/app2/` 与 `/app2/index.html` → `Cache-Control: no-store`。
- public/app.html L2385：说明文案与 app2 逐字一致。
账号：qa144a-<ts>、qa144b-<ts>@test.zalize.com（限频 5/时，共用 2 个）。报邮箱+uid。

## T1 引导 toast 可点击 + 计数（qa144a）
前置：`zt_remind_hint` 为空、提醒未开。MutationObserver 记录 toast 出现/消失时间戳。工作台点「今日打卡」：
- 断言 A：~3.5s 后出现 toast，**逐字**「怕忘打卡？可开启每天 8:00 邮件提醒」且**带可见「去开启 ›」按钮**（截图为凭；旧版无按钮）。
- 断言 B：toast 存活时长实测 4720±500ms（旧固定 3000ms 会 fail）。
- 断言 C：点「去开启 ›」→ 路由跳到 `#account`，「每日学习提醒」卡可见。
- 断言 D：`zt_remind_hint === '1'`（旧版为 '1' 一次性写死，但旧代码逻辑无计数语义——以 D+E 组合区分）。

## T2 计数递增至 3 封顶 + 开提醒直接写 3（qa144b，同浏览器）
- 断言 E：console 将 `zt_remind_hint` 置 '2'，注册/登录 qa144b 打卡 → toast 出现且事后值='3'；（若 b 因限频失败则改为置 '3' 后用 a 无法复打卡，标 untested 并说明）。
- 断言 F：开提醒分支——qa144b 先在「我的」开启提醒，console `removeItem('zt_remind_hint')`，再打卡（b 当日首次）→ **无引导 toast**（打卡后观察 ≥7s），且 `zt_remind_hint === '3'`。
  - 注：E 与 F 只能消耗 b 的唯一一次打卡，二选一时优先 F（d.on 写 3 是新逻辑核心），E 退化为「a 打卡后值=1 且代码路径 hintN<3」+ 手工置 '3' 后无法验证（标 untested）。执行时若 b 打卡可先做 E 再无法做 F——**顺序定为：b 先开提醒 → removeItem → 打卡 → 验 F**；E 的递增仅以 a 的 0→1 证据 + 源码为据（如无法双证据实测则 E 标 partially/untested）。

## T3 注册超时 toast 时长自适应（未登录，fetch 包装，不打真实请求）
- 包装 `/api/register` 为 never-resolve + abort reject（SKILL 法）→ 点注册：
- 断言 G：~20s 后 toast「网络较慢，注册请求可能已在服务端完成……」出现，MutationObserver 实测存活 7200±500ms（旧固定 3000ms 会 fail）；截图含 toast。

## T4 缓存 no-store（浏览器侧）
- 断言 H：浏览器**普通刷新（F5，非硬刷新）**后 `script src` = `index-BV7nC1cC.js`（UX143 时普通加载曾拿到旧 bundle）。

## T5 旧版文案统一（浏览器侧）
- 断言 I：/app#account「每日学习提醒」副文案逐字「每天 8:00 发邮件提醒：到期错题数 + 每日一题；当天已打卡则不打扰」（截图，与 app2 卡对照）。

## T6 回归
- 390px（CDP 仿真）：引导 toast（若时机可复现）或「我的」页 scrollWidth=390 无溢出。
- console error/pageerror/HTTP≥400 全零（豁免：计划内注入、登录前 401）。
- 测试结束：两号提醒均留关（KV 自删）。

执行顺序：注册 a → T1（A-D）→ T4 → 注册 b → 开提醒 → removeItem → 打卡验 F → 关提醒 → T5 → T3 → T6 汇总。产出 test-report-144.md + 录屏。
