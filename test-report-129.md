# QA 第 129 轮回归报告 — UX128 修复验收（生产 app2, build ea37ddd）

- 对象：https://zhenti.zalize.com/app2/ （硬刷新后实际加载 bundle `assets/index-B2ON4owW.js`，与 curl 到的 ea37ddd 产物一致；/app meta `app-build=ea37ddd-202608041810`）
- 测试账号（请清库）：**qa129-1785867182@test.zalize.com**（密码 qa129pass）
- 造数顺序（时间序验证关键）：先做 2026 卷（Q1 故意答错 B + Q17 多选答错 C，提前交卷 **0/33**），后做 2019 卷（Q1 答对 C，提前交卷 **1/31 ≈ 3%**）。未触发任何 AI 出卷/生成额度接口。
- 录屏：`/home/ubuntu/screencasts/rec-1376a43f-95b2-4cb6-8644-8fd30e9af47b/rec-1376a43f-95b2-4cb6-8644-8fd30e9af47b-edited.mp4`

## 结论总览

| # | 修复项 | 结果 |
|---|--------|------|
| 1 | P1 移出错题本二次确认 | ✅ 通过 |
| 2 | P2 趋势图 created_at 升序 + Y 轴自适应 | ✅ 通过 |
| 3 | P3 周摘要卡差异化三格 | ✅ 通过 |
| 4 | P3 日期 zh-CN | ⚠️ 部分通过：#history 已改 `2026/8/4`；**错题卡「收藏于 8/4」仍为 M/D 短格式（fmtDate 未改）** |
| 5 | P3 tabBar 11px / ink-2 | ✅ 通过 |
| — | 390/1440 无溢出、console/pageerror/HTTP≥400 全零 | ✅ 通过 |

## 1. P1 移出错题本二次确认 — 通过

| 🔴 初始（rose 文字链） | 🟢 首次点击（确认移出胶囊+取消，未删除） |
|---|---|
| ![初始操作行](https://app.devin.ai/attachments/d31a0944-c1f2-4f8a-823b-feda9e032a13/ss_zoom_67b2e9b6.png) | ![确认态](https://app.devin.ai/attachments/c791a018-a8eb-45c2-a022-51adf39c6ff4/ss_zoom_8911c036.png) |

| 🟢 点「取消」恢复原状（计数仍 2） | 🟢 点「确认移出」才 DELETE（toast、计数 2→1） |
|---|---|
| ![取消恢复](https://app.devin.ai/attachments/7a44b886-7284-413b-852f-c9f7b70eee0a/ss_zoom_bfe12586.png) | ![移出成功](https://app.devin.ai/attachments/a1ce7f27-8c70-4117-a0e7-06e925f94145/ss_048b5118.png) |

- 首次点击不发 DELETE、卡片不消失，「确认移出」为 rose-500 实心白字胶囊，「取消」为灰文字链。
- 取消后完全恢复；再走一遍点「确认移出」→ toast「已移出错题本」，错题本（2）→（1）。

## 2. P2 趋势图升序 + Y 轴自适应 — 通过

| 🟢 工作台趋势图（Y 轴顶=13，上升线） | 🟢 第2卷 tooltip=3%（后做的 2019） |
|---|---|
| ![工作台](https://app.devin.ai/attachments/aaef7a7c-3a54-4afa-b0ec-c1b6c3c11bad/ss_b967c31c.png) | ![tooltip](https://app.devin.ai/attachments/6b2a32a6-8e89-4570-82d5-18d1a13ac085/ss_069488b8.png) |

- hover 实测：**第1卷 = 0%（先做的 2026 卷）、第2卷 = 3%（后做的 2019 卷）**——128 轮旧 bundle 是反的（第1卷=3%），本轮顺序已修正，趋势线为上升。
- Y 轴 domain 实测 [0,13]（dataMax 3 + 10），两点明显脱离底边，不再 0–100 贴地。
- #history 因两卷同日、按天聚合仅 1 个点，趋势区不渲染折线（与代码逻辑一致），无报错。

## 3. P3 周摘要卡差异化 — 通过

![周摘要](https://app.devin.ai/attachments/a6c61322-ee71-410f-a9b8-1fc24f497e42/ss_5843b27d.png)

- 头部 pill 保持「本周作答 2 次 · 正确率 2%」；摘要卡三格为 **64 本周做题（道）/ 1 有作答天数 / 2 待复习错题**（移出一题后待复习同步为 1），与 pill 不再重复；第一格为题目数（64=33+31）而非次数。

## 4. P3 日期 zh-CN — 部分通过（1 个 P3 残留）

| 🟢 #history 日期 2026/8/4 | 🔴 错题卡「收藏于 8/4」仍 M/D |
|---|---|
| ![history](https://app.devin.ai/attachments/5b0590d2-d567-495f-8e10-0eca5758229e/ss_fe77567c.png) | ![收藏于](https://app.devin.ai/attachments/12a2e840-a029-4bf0-aac8-d0f1d9dfe8fd/ss_zoom_5963646b.png) |

- #history「全部成绩」两条记录均显示 `2026/8/4 · 用时 …`，不再是 `8/4/2026` ✅。
- **P3 残留**：错题卡收藏筛选下「收藏于 8/4」走的是 `utils.ts fmtDate()`（返回 `M/D`，commit ea37ddd 未改该函数），未变成 `2026/8/4` 式。无年份歧义但与验收口径「错题卡日期改 zh-CN」不完全一致，建议确认口径或将 fmtDate 一并改 `toLocaleDateString('zh-CN')`。

## 5. P3 tabBar 11px / ink-2 — 通过

| 🟢 390px tabBar 特写 | 🟢 390px 工作台整页（scrollWidth=390） |
|---|---|
| ![tabBar](https://app.devin.ai/attachments/02d0b028-f862-42ac-82e2-38b6f1586d14/ss_zoom_ab6d0031.png) | ![mobile home](https://app.devin.ai/attachments/280d6d57-c6bf-47c9-9e39-259b1883ffd6/ss_5194c249.png) |

- computed 实测：标签 `font-size: 11px`；未选中色 `rgb(90,100,114)`（=ink-2，较旧 ink-3 更深）；选中态 brand 蓝 `rgb(46,107,236)` 区分明显。
- 390px `document.documentElement.scrollWidth = 390`，无横向溢出；趋势图/打卡按钮/首屏控件正常。

## 回归与监控

| 🟢 console errors-only 视图（仅扩展噪音） | 🟢 1440 桌面三栏回归 |
|---|---|
| ![console](https://app.devin.ai/attachments/d2e58072-2c7b-48f2-bf27-291946303530/ss_17f4b4c9.png) | ![desktop](https://app.devin.ai/attachments/764e0baa-1a5e-4785-bf89-473021ec92ac/ss_cede3a87.png) |

- console/pageerror：唯一 error 为扩展拦截 Cloudflare Insights beacon 的 `ERR_BLOCKED_BY_CLIENT`（既知豁免噪音）。
- HTTP≥400：`performance` resource entries 中 `responseStatus>=400` 为 0（登录前 401 发生在会话早期设置阶段，属预期）。
- 桌面 1440 三栏布局无回归；本轮 API 无慢响应复现。

## 覆盖说明 / 未测项
- #history 折线因同日两卷按天聚合只有 1 个点未画线（代码即如此），未能在 #history 验证多点升序；工作台「第N卷」fallback 已充分验证升序与 Y 轴。
- 设置阶段（造数）两次「提前交卷」按钮用了 console click（坐标偏移 workaround），仅数据准备，非被测行为。

测试账号请清库：**qa129-1785867182@test.zalize.com**
