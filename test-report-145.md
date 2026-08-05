# UX 第 145 轮 — 退订闭环 + 引导 toast 按钮走查报告（生产 build 7246aa6，体验/美工视角）

- 日期：2026-08-05；bundle 实测 `assets/index-bsOMxOYo.js`（含 d937a37 auth 防御）
- 测试账号（请清库）：**ux145-1785894976@test.zalize.com，uid=213**（1 条打卡，无 attempt；提醒从未开启，KV 无 `remind:213` 残留）
- 结论：4 项走查完成，**无 P0–P2**；输出 3×P3 + 2×P4 意见。

## P 级问题清单

| 级别 | 问题 | 建议 |
|---|---|---|
| P3-1 | **退订 400 场景返回裸 JSON**：用户从邮件点失效/篡改链接，看到 `{"error":"链接无效或已过期"}` 纯文本（截图见下）。邮件是唯一入口，受众是终端用户不是开发者。 | **结论：应改 HTML 友好页。** 复用成功页同款白卡：⚠️ +「链接无效或已过期」+ 副文案「可在应用内「我的」页管理提醒」+ 蓝色「打开真题工坊」按钮，成本一小段模板。 |
| P3-2 | **退订成功页 390px 卡片贴边**：`max-width:360` + `padding:32px`（content-box）实测卡片 rect 0–390 全宽贴边，圆角紧贴屏幕边缘，白卡浮起感丢失（截图见下）。 | body grid 加 `padding:16px`，或卡片改 `box-sizing:border-box`。 |
| P3-3 | **「去开启 ›」按钮触控热区 32px 偏矮**：实测 76.7×32px，低于 iOS HIG 44px/Android 48dp 推荐。移动端拇指在 5.2s 存活窗内点击这枚小胶囊有失误率。 | min-h 提到 40–44px 或扩 padding（负 margin 保持视觉尺寸）；toast 本体也可整体做点击热区。 |
| P4-1 | 引导 toast 白/20 半透明胶囊在绿色 ok 底（rgb(0,154,102)）上对比度合格（白字 600 weight 可读、hover 白/30），但**静止态与纯文字仅差一层 20% 白底**，扫一眼未必识别为按钮。 | 可加 1px 白/40 描边或改白底绿字实心胶囊，按钮感更强；现状可接受。 |
| P4-2 | 邮件底部退订链接与正文同灰 #94a3b8，仅靠默认下划线区分（源码级评审）。 | 可接受（退订链接刻意低调是行业惯例）；若要更合规醒目可用 #64748b。 |

## W1 引导 toast「去开启 ›」按钮（passed，P3-3/P4-1 意见）

| 🟢 1440px：绿色 ok toast + 白/20 胶囊按钮（放大） | 🟢 390px：文案+按钮单行不换行、无溢出 |
|---|---|
| ![1440 zoom](https://app.devin.ai/attachments/e2e617e8-3c78-4f6f-b62b-8f740ac7578f/ux145_toast_1440_zoom.png) | ![390 toast](https://app.devin.ai/attachments/a81c7c19-2b39-44a4-8644-496140ce4f12/ux145_toast_390.png) |

- 390 实测：toast rect 16–374（左右各 16px 留边）、文案 17 字+按钮**单行**、`scrollWidth=390` 无横向溢出；按钮 rect 76.7×32、`bg rgba(255,255,255,.2)`、白字 14px/600。
- 1440 全景：![1440 full](https://app.devin.ai/attachments/2ce61e57-cf1b-4c31-b56c-8023d2fc6eb5/ux145_toast_1440.png)
- 点击跳 #account 功能 QA144 已验，本轮不重复；打卡后 `zt_remind_hint` 0→1 正常。

## W2 退订确认页（成功页本地预览源码 HTML + 线上 400）

| 🟢 1440px 成功页：白卡居中、✉️/标题/副文案/品牌蓝胶囊层级清晰 | 🔴 390px：卡片贴边（P3-2） |
|---|---|
| ![unsub 1440](https://app.devin.ai/attachments/14d2201d-17dd-419a-bae9-19ffac1a1f5b/ux145_unsub_1440.png) | ![unsub 390](https://app.devin.ai/attachments/333a217e-cbf0-4e7e-af65-362a1d2a153e/ux145_unsub_390.png) |

- 视觉语言与产品一致：白卡 16px 圆角、#F5F7FB 底、品牌蓝 #3D7FFF 胶囊按钮、副文案 slate 灰——合格。
- 文案「不会再收到提醒邮件。如需重新开启，可在应用内「我的」页打开开关」预期管理+挽回路径齐全——好。
- **成功页为本地预览**（token 需 JWT_SECRET 签名、用户的已消费，无法线上实测），HTML 取自 src/index.js L1297 逐字，样式为内联无外部依赖，预览保真度高；线上成功分支标 **untested**。
- 🔴 线上 400 实测（浏览器直开）：![400 raw JSON](https://app.devin.ai/attachments/5178de39-75b9-4ba6-818b-793d84bf764c/ux145_unsub_400.png) → P3-1。

## W3 邮件底部退订文案（源码级评审）

- 「不想再收到提醒？点此一键退订，或在应用内「我的」页关闭。」——问句引导+两条并列路径（免登录快出口 / 应用内可逆管理），不冗余，12px 灰层级恰当——**合格**。
- `List-Unsubscribe: <unsubUrl>` 头已加（Gmail 等客户端原生退订入口）——源码确认，实际收信 untested（Cron 不可即时触发）。

## W4 回归：注册/登录（d937a37 防御后）— passed

| 🟢 UI 注册秒级成功直落工作台（QA144 静默失败未复现） | 🟢 退出→UI 登录回同号正常 |
|---|---|
| ![register ok](https://app.devin.ai/attachments/93f613b1-c077-4fb2-9e44-5810fafc3f23/ss_f1ab02ec.png) | ![login ok](https://app.devin.ai/attachments/82d15251-fcf8-4932-95f0-6c397926d5ce/ss_7fae8844.png) |

- console error / pageerror / exception：reload+12s CDP Log/Runtime 监听 **NONE**；HTTP≥400 仅计划内 unsub 400 探测。

## 环境备注
- browser_console 工具本轮仍无法连 CDP（QA144 Chrome 重启后遗留），全部 JS 量测走 python websocket-client（suppress_origin）完成，不影响结论。
- `location.assign('file://…')` 从 https 页面被浏览器拦截（首轮 unsub 预览截图实为工作台，已发现并改用 CDP `Page.navigate` 重截，报告内截图为正确版本）。
