# QA 第 61 轮 — 新客户端 /app2/ 独立验收报告

- 环境：生产 https://zhenti.zalize.com/app2/ （与旧版 /app 并行，共用线上 API）
- 测试账号（请清库）：**qa61-1785862018@test.zalize.com**
- 录屏：`/home/ubuntu/screencasts/rec-56f3ee84-3ffb-4396-9da7-130b259bc394/rec-56f3ee84-3ffb-4396-9da7-130b259bc394-edited.mp4`
- 说明：本轮跨越了一次中断续跑，前半程（注册/工作台/2026 卷作答/成绩页/错题本列表/真题区年份）结论沿用中断前已验证的记录；本报告截图以续跑后采集为主。

## 结论摘要

全链路、双视口、路由刷新、新旧并行均通过，但发现 **2 个需要关注的问题**：

### 问题 1（口径缺口）：app2 错题本「⭐ 收藏」筹码没有站内入口喂数据
- app2 错题本的「⭐ 收藏」读取 `/api/favorites`（客观题收藏），但 **app2 全站没有任何 UI 会 POST /api/favorites**（答题页/成绩页/错题卡上都没有星标按钮）；空态提示「在答题页、成绩页或错题卡上点星标即可收藏」与实际 UI 不符。
- app2 背题页的 ☆ 走的是另一套 `/api/realfav`（真题收藏，显示在「刷真题 → 收藏」页），两套收藏互不相通。
- 交叉验证：在旧版 /app 错题卡点星 → 旧版与 app2 错题本「⭐ 收藏」都变为 (1)，说明 API 与计数本身正常，缺的只是 app2 的入店入口/文案。

| 🔴 app2 错题本收藏空态（提示与 UI 不符） | 🟢 旧版点星后 app2 同步显示 ⭐(1) |
|---|---|
| ![app2 fav empty](https://app.devin.ai/attachments/9895c955-2c9a-4a6c-b994-cb3a592be619/ss_8a587d0d.png) | ![app2 fav synced](https://app.devin.ai/attachments/45477902-4370-4954-ad00-f849c9092c82/ss_148dceea.png) |

### 问题 2（性能）：间歇性 API 慢响应导致长骨架屏
- 测试中多次出现页面骨架屏停留 20–90 秒：`performance` 显示 `/api/wrongbook`、`/api/favorites`、`/api/flags` 单次耗时 76 秒、`/api/wrongbook/4823/review` 90.8 秒（同一接口其他时刻仅 100–150ms）。
- 非 app2 前端 bug（等待后均正常渲染、无报错），疑似 Workers/D1 间歇性抖动，建议后端排查。

## 通过项（断言与证据）

### T1 全链路（桌面 1440）
- 注册登录 → 三栏工作台、打卡「已打卡 ✓」、今日任务、2026 新卷卡、周摘要 — passed（中断前已验证）
- 2026 卷 33 题、左题目右答题卡、单选/多选作答、交卷判分 1/33 — passed（中断前已验证）
- 成绩页环形分/薄弱考点/错题入口 — passed（中断前已验证）
- 错题本筛选（今日复习/全部/⭐收藏）计数、展开含题干/选项/所选/答案/解析 — passed
- 背题模式 ☆ 收藏 →「刷真题-收藏」页 1 道并可取消（走 /realfav）— passed

| 🟢 错题重练答对判定 | 🟢 打印错题预览（题干/选项/答案/你当时选） |
|---|---|
| ![retry](https://app.devin.ai/attachments/a2f0d140-1867-4c58-b38c-1a2d80e0e838/ss_308381e4.png) | ![print wrong](https://app.devin.ai/attachments/c24098be-c732-4bba-aa45-88a0df22dd12/ss_8a740e30.png) |

- 分析题背诵 #realsubj/2026：展开 6 条要点、逐条自评（想到 2/6）、「标为背会了」→「✓ 背会了」且列表计数 1/85、打印背诵版（5 题设问+要点、UI 全隐）— passed

| 🟢 要点自评 2/6 | 🟢 打印背诵版预览 |
|---|---|
| ![self eval](https://app.devin.ai/attachments/4a0f5aad-d7f0-4aeb-960f-fd0e989b4a2d/ss_bc2abc04.png) | ![print subj](https://app.devin.ai/attachments/8687f0a1-21aa-45d9-8806-c5a39c8ff9d7/ss_0af05897.png) |

- 我的：「今日额度：模拟卷剩 1 份 · 快练剩 1 份」显示、退出登录回登录页 — passed（未触发任何 AI 生成/出卷额度接口）

| 🟢 我的-额度显示 | 🟢 退出登录回到登录页 |
|---|---|
| ![account](https://app.devin.ai/attachments/458aaeec-14ca-49c8-a5a1-c42c37221f05/ss_0f4cd514.png) | ![logout](https://app.devin.ai/attachments/8d37b392-bd1c-4b98-8395-2561dbf59b4f/ss_7e0c2057.png) |

### T2 390px 视口
- home/real/wrong/account/realsubj 逐页：底部 5 格 tabBar 可见、左导航隐藏、`scrollWidth=390` 无水平溢出、tabBar 热区切页正常 — passed
- 打印按钮（错题本/背诵版）在 390px 均隐藏 — passed

| 🟢 390px 工作台（tabBar） | 🟢 390px 错题本（打印按钮隐藏） |
|---|---|
| ![390 home](https://app.devin.ai/attachments/9d6ed150-bf2e-486a-9cb3-ccca33919c75/ss_d8111072.png) | ![390 wrong](https://app.devin.ai/attachments/e2764b33-c9f4-4f64-a07b-ca9121542ad7/ss_b133ca40.png) |

### T3 路由与刷新
- #history 直接加载：累计 33 题、弱项榜、全部成绩列出 2026 卷（8/4/2026 · 1/33，日期正常）— passed
- 新标签直达 /app2/#realsubj/2019 直接渲染 2019 分析题 — passed
- #real、#wrong、#account 直接刷新无白屏 — passed

| 🟢 #history 直刷 | 🟢 #realsubj/2019 意图 hash 直达 |
|---|---|
| ![history](https://app.devin.ai/attachments/8aedda8c-68da-4523-a8ee-316634bda87e/ss_c16891c8.png) | ![realsubj2019](https://app.devin.ai/attachments/d8dfaced-96b2-4333-af91-92c6d71075de/ss_abcb74f6.png) |

### T4 与旧版 /app 并行
- 同账号登录旧版 /app：工作台正常、打卡/今日任务状态一致、错题本（2）与 app2 一致、最近成绩 3%（1/33 口径一致）— passed
- 旧版点星收藏后 app2 同步 ⭐(1)；回 app2 刷新，打卡/错题/背会状态未被重置 — passed

| 🟢 旧版 /app 工作台 | 🟢 旧版错题本 ⭐收藏(1) |
|---|---|
| ![old app](https://app.devin.ai/attachments/50881767-3d19-4f59-bf0e-07ef63f50ebf/ss_e28ccc67.png) | ![old wrong](https://app.devin.ai/attachments/e49e6df9-f265-4770-ac7c-ea3ec6ddf6b7/ss_6cd62c16.png) |

### T5 监控
- console error / pageerror = 0（多次抽查，含收尾全量检查）；HTTP≥400 未观察到（resource timing 中所有 /api/ 均 200）。因中途浏览器多次整页刷新，非全程单会话连续监听，此为抽查结论。

## 其他小口径提示（非阻塞）
- app2「我的」页邀请链接仍指向旧版 `https://zhenti.zalize.com/app#reg-Z57`（是否应改为 /app2 待产品定夺）。
- 工作台周摘要 app2 文案为「本周做题 33 道」，旧版为「本周作答 1 次」，单位口径不同（一个按题、一个按卷），数字均正确但展示口径不一致。
- 地址栏直接输入 `.../app` 时 Chrome 自动补全易补成 /app2（仅测试操作注意事项，非产品问题）。
