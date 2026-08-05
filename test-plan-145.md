# UX 第 145 轮 — 退订闭环 + 引导 toast 按钮走查（生产 build 7246aa6，体验/美工视角）

部署核对（已完成）：bundle `assets/index-bsOMxOYo.js`（含 d937a37 auth 防御）；`/api/remind/unsub?u=999999&t=xxx` 实测 400 JSON `{"error":"链接无效或已过期"}`。
代码依据：
- ui.tsx L144-151：toast action 按钮 `bg-white/20 min-h-[32px] rounded-full px-3 font-semibold hover:bg-white/30`，绿色 ok toast 底（bg-emerald-*）上白色半透明胶囊。
- src/index.js L1292-1305：unsub GET 验签失败 → `err(400,"链接无效或已过期")`（JSON）；成功 → 内联 HTML 白卡片（✉️ 40px + h1 18px「已退订每日学习提醒」+ 灰副文案 + 蓝胶囊「打开真题工坊」，`place-items:center`，max-width 360px）。
- src/index.js L2228：邮件底部「不想再收到提醒？<a>点此一键退订</a>，或在应用内「我的」页关闭。」灰 #94a3b8 12px + List-Unsubscribe 头。
- 成功页无法在线走查（token 需 JWT_SECRET 签名、用户的已消费）——按用户指示用源码内联 HTML 存本地文件预览。
账号：ux145-<ts>@test.zalize.com ×1（限频预算内），报邮箱+uid。

## W1 引导 toast「去开启 ›」胶囊按钮视觉（1440px + 390px）
- 新号注册（顺带回归 W4）→ 工作台打卡 → ~3.5s 出 toast（存活 ~5.2s）。
- 1440：截图评估白/20 半透明胶囊在绿色 ok toast 上的对比度/可读性（文字白+underline offset？半透明背景是否够醒目）；给 P 级意见。
- 390（CDP 仿真，同 ws 会话内打卡）：断言 toast 文案 17 字+按钮是否单行/换行、rect 是否在 16–374 内、scrollWidth=390 无横向溢出；按钮实测 min-height≥32、可点（点击热区评估：量 getBoundingClientRect 高宽）。
- 点击按钮 → 跳 #account（QA144 已验功能，本轮只评手感/热区，不重复断言）。

## W2 退订确认页走查（本地预览源码 HTML，1440px + 390px）
- 保存 src/index.js 内联 HTML 至 /tmp/unsub-preview.html，浏览器打开：
  - 1440：白卡居中、✉️/标题/副文案/蓝胶囊层级；与产品设计语言（白卡圆角/品牌蓝 #3D7FFF）一致性评审。
  - 390（CDP）：卡片 max-width 360 是否留边、无溢出。
- 400 场景（线上真实）：浏览器直开 `…/unsub?u=999999&t=xxx` 截图——用户从邮件点进看到裸 JSON。**给结论：是否应改 HTML 友好页**（P 级建议）。

## W3 邮件底部退订文案评审（源码级，无法实测收信）
- 评审文案「不想再收到提醒？点此一键退订，或在应用内「我的」页关闭。」：动作清晰度、两条路径并列是否冗余、灰 12px 层级是否合适；链接颜色与正文同灰 #94a3b8 是否可发现（可给意见）。
- List-Unsubscribe 头存在性仅源码确认（Cron 发信不可即时触发，标 untested）。

## W4 回归：注册/登录流程无回归（d937a37 防御后）
- ux145 新号 UI 注册：断言正常秒级完成进入工作台（或若再现 QA144 静默失败——本次 d937a37 后应至少弹可见错误 toast，逐字记录）。
- 退出→UI 登录回同号：正常进入。
- console/pageerror/HTTP≥400 全零（豁免登录前 401、计划内 unsub 400 探测）。

产出：test-report-145.md + 1440/390 截图（无需录屏——按用户指示轻量走查，仅截图）。执行顺序：W4 注册 → W1 → W2 → W3 汇总 → 关提醒清态（若开过）。
