# QA 第 146 轮 — 双向导流轻量回归（生产 build b65869d）

部署核对（已完成）：`/app?nocache=` HTML 含 `zt_app2_banner` ×2（banner 代码在线）；app2 bundle `assets/index-BWB7O8yI.js`（b65869d 产物）。注意：/app meta app-build 字符串仍显示 `7246aa6-202608050204`（未随本次 commit 重新生成），以 HTML 内容为准。
代码依据：
- public/app.html L508-513：登录后工作台 `!localStorage.zt_app2_banner` 时渲染白卡 banner（「新版」蓝 badge + 文案「新版客户端已上线：更快更清爽，数据完全互通」+ 蓝胶囊「体验新版 →」href=/app2/ + ✕ `localStorage.zt_app2_banner=1; parentElement.remove()`）。
- L495-502：isNew 引导卡（无 attempt 且无 papers 时）与 banner **并存**（banner 不受 isNew 门控）——ux145 无 attempt，正好同屏验证共存布局。
- web/src/pages/Account.tsx L194-200：app2「我的」退出登录按钮下方灰色小字「用不惯新版？返回旧版客户端（数据完全互通）」，`<a href="/app">` 下划线。
账号：复用 ux145-1785894976@test.zalize.com（uid=213，不新增注册）。

## T1 旧版 banner + 体验新版免登录跳转（1440px）
- 登录态进 `/app?nocache=`：断言 banner 白卡出现在 2026 卡（isNew 引导卡）下方，含「新版」badge、逐字文案、「体验新版 →」蓝胶囊、✕；与 isNew 引导卡共存布局不乱（截图）。
- 点「体验新版 →」：断言落 `/app2/` 且**免登录**直接渲染工作台（sidebar 显示 ux145 邮箱，无登录表单）——同 zt_token 互通。

## T2 ✕ 永久关闭
- 返回旧版，点 ✕：断言 banner 立即消失；`localStorage.zt_app2_banner === '1'`。
- F5 刷新：断言 banner 不再出现（对抗点：若只做了 remove 没写 localStorage，刷新会复现）。

## T3 app2「我的」底部返回旧版链接
- /app2/#account 滚到底：断言退出登录按钮下方有灰色小字「用不惯新版？返回旧版客户端（数据完全互通）」，「返回旧版客户端」带下划线（截图）。
- 点击：断言落 /app 且登录态保持（工作台渲染 ux145 数据而非未登录 landing）。

## T4 390px（CDP 仿真）
- 旧版 banner（需先 removeItem zt_app2_banner 恢复）：文案+按钮+✕ 不溢出，scrollWidth=390（截图）。
- app2 #account 底部链接：显示正常不溢出（截图）。
- 测完恢复 zt_app2_banner=1 状态无所谓（测试账号）。

## T5 回归
- console error/pageerror 零（CDP 监听 reload 周期）；HTTP≥400 零（豁免登录前 401 类）。

产出：test-report-146.md + 截图（无需录屏）。顺序：T1 → T2 → T3 → T4 → T5。
