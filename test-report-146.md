# QA 第 146 轮报告 — 双向导流轻量回归（生产 build b65869d）

- 时间：2026-08-05（UTC）
- 目标：验证旧版 /app「新版」banner（可关闭、永久关闭、跳 /app2/ 免登录）与 app2「我的」页底部「返回旧版客户端」链接（跳 /app 登录态保持），390px 无溢出，console/pageerror/HTTP≥400 全零。
- 部署核对：`/app?nocache=` HTML 含 `zt_app2_banner` 代码；app2 bundle `assets/index-BWB7O8yI.js`（b65869d 产物）。**注意：/app meta `app-build` 仍显示 `7246aa6-202608050204`（构建串未随本 commit 更新），以 HTML 内容为准。**
- 测试账号：**qa146-1785895759@test.zalize.com，uid=214**（无 attempt、无打卡；请清库）。
  - 备注：原计划复用 ux145 账号，但该账号已被清库（登录 401/邮箱或密码错误，旧版 /app 收到 401 后清掉了残留 zt_token 正确回落登录页），故新注册 1 个账号（限频预算内一次成功）。

## T1 旧版 banner + 体验新版免登录跳转 — passed

登录后 `/app?nocache=` 工作台：banner 白卡出现在 isNew 引导卡（第一次来？先测测水平）下方、倒计时卡上方，含蓝色「新版」badge、逐字文案「新版客户端已上线：更快更清爽，数据完全互通」、蓝胶囊「体验新版 →」、✕，两卡并存布局整齐。

![旧版工作台 banner 与 isNew 卡并存（1440）](https://app.devin.ai/attachments/f6ee468e-5181-44f6-ad11-184490490f30/ss_ebb98323.png)

![banner 放大逐字核对](https://app.devin.ai/attachments/37dc0652-d9a0-4955-abb4-eeb772d076dd/ss_zoom_0eb69c29.png)

点「体验新版 →」→ 落 `https://zhenti.zalize.com/app2/`，**免登录**直接渲染工作台（sidebar 显示 qa146 邮箱，无登录表单）——同 zt_token 互通实证。

![点击后直落 app2 工作台（免登录）](https://app.devin.ai/attachments/2f68a6af-3bec-4bb1-8a61-45d269dc3322/ss_e7d19002.png)

## T2 ✕ 永久关闭 — passed

- 点 ✕：banner 立即消失；`localStorage.zt_app2_banner === '1'`（CDP 实测）。
- F5 刷新：banner 不再渲染（innerText 无「新版客户端已上线」+ 截图无 banner）。

![刷新后 banner 不再出现](https://app.devin.ai/attachments/a222ce53-f169-43e6-9cf5-40f87fa417c0/ss_efe0f8d9.png)

## T3 app2「我的」底部返回旧版链接 — passed

- `#account` 底部、退出登录按钮下方出现灰色小字，DOM 逐字：「用不惯新版？返回旧版客户端（数据完全互通）」，「返回旧版客户端」为带下划线的 `<a href="/app">`。

![app2「我的」底部链接（1440）](https://app.devin.ai/attachments/c85eea33-36d2-473f-86a0-3a92087d2c6c/ss_507b9af4.png)

- 点击 → 落 `/app`，登录态保持（直接渲染工作台今日任务，无登录表单）。此时 banner 已被 T2 关闭，刷新后仍不出现（永久关闭再证）。

![点击后落旧版工作台（登录态保持）](https://app.devin.ai/attachments/3b61f2f4-a430-43b5-8b51-93fee61c3f6d/ss_a918e80d.png)

## T4 390px（CDP 仿真）— passed

- 旧版 banner（removeItem 后重载）：scrollWidth=390 无横向溢出，banner rect 16–374 留边；文案折 3 行、「体验新版 →」胶囊与 ✕ 完整可点。

![390px 旧版 banner](https://app.devin.ai/attachments/1663f493-7d53-405a-8aac-994aa5b1f5ea/qa146-390-app-banner.png)

- app2 #account 底部链接：scrollWidth=390，链接 rect 137–229、高 32px，单行完整不裁切。

![390px app2 返回旧版链接](https://app.devin.ai/attachments/db150451-9eea-4a4f-8830-8b4b2adf2c79/qa146-390-app2-back.png)

- 测试后已恢复 `zt_app2_banner='1'` 并清除视口仿真。

## T5 回归监控 — passed

CDP 监听（Runtime/Log/Network）下依次重载 `/app?nocache=` 与 `/app2/#account` 各 12s：console error / pageerror / HTTP≥400 **全零**。（豁免项：测试前旧 token 残留导致的一次 401 与 ux145 登录探测 401，均为账号已清库的预期结果，非本轮改动。）

## 结论

5 项验收全部通过，无新 P0–P3。唯一备注：/app meta `app-build` 构建串未随 b65869d 更新（仍 7246aa6），不影响功能，但会影响未来部署核对——建议构建脚本同步刷新。

**请清库：qa146-1785895759@test.zalize.com（uid=214）**
