# 第 152 轮 UX 走查报告（生产 build 3c89b0c）

- 角色：用户体验官
- 目标：https://zhenti.zalize.com （app2 bundle `assets/index-CmWlq5YR.js`，已确认内含 f208396 新 toast 文案）
- 计划：/home/ubuntu/zhentigongfang/test-plan-152.md
- 录屏：/home/ubuntu/screencasts/rec-9d4ebbf8-06a5-455a-8679-c6afeaf3fce8/rec-9d4ebbf8-06a5-455a-8679-c6afeaf3fce8-edited.mp4
- **测试账号（请清库）：qa152-1785900460@test.zalize.com，uid=216**（attempt×1〔抗美援朝 0/2〕、快练卷×1〔exam/339，未作答〕、官方考点库·史纲 material 118、错题 2 条；quick_left=0、paper_left=1 未消耗）

## W1 公开考点索引与新考点页（passed）

首页口径已更新为「119 内置官方考点」（library.js 实数 119，旧值 114）：

![首页 119 官方考点](https://app.devin.ai/attachments/1b0087a2-f68e-43e0-bdcb-856c63c3f5a9/ss_bff19c19.png)

/zhenti/kaodian 科目分组抓取（curl 解析）：

| 科目组 | 组内考点数 | 新考点 |
|---|---|---|
| 马原·哲学 | 31 | — |
| 毛中特 | 35 | 毛泽东思想的形成与发展、习近平新时代中国特色社会主义思想 |
| 史纲 | 17 | 抗美援朝 |
| 思修法基 | 12 | 中华传统美德、道德的本质与功能 |
| 形势与政策 | 23 | — |

5 个新考点分组全部正确；组内按题数降序排列，新考点（1-2 题）自然落在组尾，与相邻小题数考点（如「延安整风运动 2」「社会主义道德的核心与原则 2」）口径协调，命名与官方教材表述一致，无突兀。页面口径备注：kaodian 聚合页 118 个链接 / 107 个唯一考点（11 个考点跨两科目重复展示；仅显示「当前有题」的考点），首页 119 为官方考点库总数——两处口径不同但各自自洽，非缺陷。

| 索引页分组（1440） | 抗美援朝考点页 |
|---|---|
| ![kaodian 分组](https://app.devin.ai/attachments/ceb1df73-b0fa-4778-a55f-9ac17f167904/ss_359133f2.png) | ![抗美援朝页](https://app.devin.ai/attachments/74a7202c-5ea3-4f52-87fd-856e01ac0b13/ss_74d8b582.png) |

新考点详情页与老考点页**同构**：H1「「××」考研政治历年真题（N 道）」+ 年份 chips + 答案速查表（题号/答案/年份三列）+ 自测模式开关 + 题目卡（题干/选项/答案解析）+ CTA「在线刷真题」。抗美援朝（2 题）与中华传统美德（2 题）均核验：

![中华传统美德页](https://app.devin.ai/attachments/e6074f5d-eb66-4d85-bb69-728005841894/ss_02c45621.png)

390px 抽查 kaodian：scrollWidth=390 无溢出，且公开页**自带关键词筛选框 + 科目锚点 chips**（体验优于 app2 内列表，见 W2 建议）：

![kaodian 390](https://app.devin.ai/attachments/31ea18e7-b761-43de-bcf9-5bdb579fd65c/t152-390-kaodian.png)

## W2 app2 真题区「按考点」chip 列表可用性（passed，附 P3 建议）

CDP 实测（1440 与 390 双视口）：

| 指标 | 实测值 | 判定 |
|---|---|---|
| chip 高度 | 32px | 达到 32px 达标线（低于移动端 44px 推荐值） |
| 行距（行间垂直间隙） | 8px（行距 40px） | 相邻行热区无重叠，误触风险可控 |
| 考点 chip 总数 | 120 | 密集但有科目分组标题分段 |
| 390px 单屏可见 chip | 19 个 | 找组尾考点需多屏滚动 |
| 390px scrollWidth | 390 | 无横向溢出 |
| 科目分组 | **有**（马原·哲学/毛中特/史纲/思修法基/形势与政策 分段标题） | ✓ |
| 搜索过滤 | 列表本身无过滤；顶部「搜真题」框输入关键词回车后给出「按考点练：××」直达捷径 | 部分覆盖 |

任务法：找「量变质变规律」（马原组尾）——1440px 需滚动约 1.5 屏（docTop 1915px）、约 8-10 秒；390px 需滚约 4.4 屏（docTop 3711px）、约 15-20 秒。改用搜索框输入「量变」回车，结果页第一条即「按考点练：量变质变规律 1 题」，数秒直达——**路径存在但不易被发现**（搜索框 placeholder 是「搜真题…」，用户不会想到可以用它找考点）。

| 1440 chip 列表 | 390 chip 列表 |
|---|---|
| ![1440 按考点](https://app.devin.ai/attachments/4e5f9a7b-8f31-4456-92d5-2896d7f09713/ss_5ce85615.png) | ![390 按考点](https://app.devin.ai/attachments/9c15344d-ad94-40eb-9390-85e2387241a2/t152-390-real.png) |

搜索直达捷径实测：

![搜索直达考点](https://app.devin.ai/attachments/a77d0afc-f9dc-436e-86f3-b3c426431f85/ss_0b9619d2.png)

**分级建议**（本轮不改代码）：
- **P3-1**：「按考点」视图顶部加一个就地过滤输入框（复用 kaodian 公开页「输入关键词筛选考点」交互），或把搜真题框 placeholder 改为「搜真题 / 考点…」提升可发现性。120 chip + 移动端 4 屏多滚动是真实摩擦，但因已有科目分组 + 搜索捷径，不到 P2。
- **P3-2**：移动端 chip 高度 32px 低于 44px 推荐热区；QA151 曾实际误点相邻考点。建议 390px 下 chip min-height 提至 40px 或行距增至 10-12px。
- P4：科目分组标题无吸顶/锚点跳转，长列表滚动时失去分组上下文。

## W3 额度提示修复复验（passed）

新号 qa152 经「抗美援朝 0/2 → 弱项榜 AI 补练 → material/118」路径先用 5 题快练烧掉 quick 额度（exam/339 正常生成，题目为抗美援朝主题）；刷新 material 页后额度行显示「模拟卷剩 1 份 · **快练已用完** · 每天刷新」：

![快练已用完额度行](https://app.devin.ai/attachments/01f1d707-d724-4ef9-ac23-3961519d3619/ss_d9a002be.png)

选 5 题·快练点「生成仿真模拟卷」——**立即出现黑色 toast，逐字命中「今日快练已用完，可改选 10 题走模拟卷额度」，不再静默**（QA151 P4 已修复）；未发出 POST /papers，paper_left=1 保留未消耗：

![额度 toast 逐字](https://app.devin.ai/attachments/bef63e5e-9220-4d39-b0b6-f9e6429b8033/ss_zoom_46b4305c.png)

快练卷 exam/339 生成正常（附带回归）：

![exam/339 生成成功](https://app.devin.ai/attachments/351d4698-1070-4861-ad85-c923556c9df2/ss_9ce52af3.png)

## W4 常规回归（passed）

- CDP 监听 app2 #real 重载 14s：console error=0、pageerror=0、HTTP≥400 仅 1 条 401（本人 CDP 探测 /api/me 未带 token，计划外产物，豁免）。
- 390px：/zhenti/kaodian 与 app2 #real 均 scrollWidth=390 无横向溢出。

## 结论

| 走查点 | 结果 |
|---|---|
| W1 首页 119 口径 + 5 新考点分组/命名/同构 | passed |
| W2 chip 列表可用性 | passed（P3-1 过滤可发现性 / P3-2 移动端热区，P4 分组吸顶） |
| W3 额度 toast 逐字复验 | passed（不再静默） |
| W4 console/pageerror/HTTP≥400 + 390px | passed（全零，豁免自测 401） |

无 P0-P2。测试号 qa152-1785900460@test.zalize.com（uid=216）请清库。
