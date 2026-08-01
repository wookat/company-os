# 平台提交材料包：Poki & CrazyGames（M4 准备）

- 作者：product-manager
- 日期：2026-08-01（M3 收口后复核更新）
- 输入：PRD.md（8 款选品）、zalize-games `integration/daily-games` 分支 **M3 收口最终代码**（PR [#73](https://github.com/wookat/zalize-games/pull/73)，8 轮线上迭代完成）、Poki/CrazyGames 官方开发者文档（2026-08-01 调研，链接见附录 R）
- 线上基准：生产域名已迁移至 **https://daily.zalize.com/**（门户+8 款游戏同域路由；games.zalize.com 已归还原团队并对游戏路径 301）
- 用途：M4 平台分发提交的一站式材料包——两平台要求速览、提交流程、8 款游戏的英文标题/描述/标签/缩略图需求、SDK 适配自检表（含提交前必改项）

---

## 1. 两平台最新提交要求速览（2026-08-01 官方文档核对）

### 1.1 Poki（sdk.poki.com）

| 维度 | 要求 |
|---|---|
| 准入方式 | 邀请制/申请制：先通过 game submission form 申请 Poki for Developers（P4D，closed beta）；团队人工筛选，看重 fun/audience 契合、web 优化程度 |
| 画面尺寸 | **必须 16:9**，全画布自适应缩放；参考逻辑分辨率 640×360 / 836×470 / 1031×580；桌面+移动+平板全支持，移动端全屏（竖屏或横屏至少其一） |
| 包体 | 初始下载 **目标 <8MB**（首屏进入 gameplay 前） |
| 静态缩略图 | P4D 上传，上线后更新需人工审核（详细规格以 P4D 后台 Thumbnail Guide 为准；准备方形 + 高分辨率原稿最稳妥） |
| 动态缩略图 | 全球发布必备：**1080×1080（1:1）mp4、50fps+、4-6 秒、静音、≤100MB**；聚焦核心玩法 2-3 个场景、少文字、隐藏鼠标指针、以静态图为首帧过渡 |
| 描述/分类 | P4D Settings 中提交：最多 **4 个建议分类** + 游戏描述（说明核心机制与差异点；Poki 会在此基础上改写成平台统一的 SEO 文案，**无严格字数上限，建议 80-150 词**） |
| SDK 审核点 | ① 事件不得连发（两个 gameplayStart 不能相邻）；② gameplayStart 必须在**玩家首次输入**时触发（不是加载完成时）；③ 任何 gameplay 中断（暂停/菜单/结算/过场）必须 gameplayStop；④ 广告期间不得触发任何 SDK 事件；⑤ commercialBreak 只允许在「离开暂停/结算回到 gameplay」的时机；⑥ 广告播放期间自动静音；⑦ 不得自建广告频控计时器；⑧ rewarded 按钮必须带 🎬/🎞️ 图标、不得用绿色，且必须同时提供等大或更大的绿色普通按钮替代 |
| 内容/政策 | **默认屏蔽一切外部请求**（Google Fonts/外链 CDN/Google Analytics 一律禁止；多人服务器与第三方分析个案审批且需提交 hosted Privacy Policy）；移除 splash 屏与所有出站链接；除 Poki SDK 外禁止任何广告；不得做 adblock 检测提示；不得有内购/去广告购买 UI；incognito 模式必须可玩（localStorage try/catch）；多人昵称输入需脏词过滤 |
| 审核/测试流程 | 上传 → Poki Inspector 自检 → Playtest 录像 → **Player Fit Test** → **Web Fit Test（5-7 天）** → 签约 → **Soft Release（2-3 周**，类目页限量放量，需随时修 bug/调优）→ Global Release（首页与推荐位、约先进 new games 类目 ~5k plays/天 压测） |
| 分成模式 | 广告收入分成：**玩家由你带来（搜索/书签/社群直达）= 100% 归你；玩家来自 Poki 平台/推广 = 50/50**。独占协议（默认 5 年）换取额外推广资源；亦有一次性买断（flat license fee）选项。打款：wire/PayPal，月结 |

### 1.2 CrazyGames（docs.crazygames.com / developer.crazygames.com）

| 维度 | 要求 |
|---|---|
| 准入方式 | 开放自助：Developer Portal 注册即可提交；QA 团队按 requirements 逐项审 |
| 两段式上线 | **Basic Launch**（SDK 可选、无变现、限量 2 周测试）→ 数据达标被选入 **Full Launch**（SDK 必须、开广告分成） |
| 画面尺寸 | 桌面横屏必须可玩（16:9 iframe，常见 907×510→1920×1080 十档尺寸下文本可读）；竖屏游戏允许（侧边黑边/背景图）；`devicePixelRatio:1` 下必须清晰；物理表现须与刷新率无关（144/165Hz 一致） |
| 包体 | 初始下载 ≤50MB（**≤20MB 才能进移动端首页**）；总包 ≤250MB；文件数 ≤1500；只允许相对路径 |
| 封面图 | **3 张必传**：横 16:9（1920×1080）+ 竖 2:3（800×1200）+ 方 1:1（800×800）；三张视觉一致；禁止边框/除标题外的文字（不得写 New/Play now）/平台 logo/侵权素材/模糊图；建议非纯截图、主视觉+标题字 |
| 预览视频 | 横屏 1080p 16:9（必传）+ 竖屏 1080p 2:3（必传）；15-20 秒、≤50MB、无声、无黑屏转场/上下黑边/鼠标指针/促销文字；首帧=静态封面 |
| 描述/分类 | 提交时填 qualitative metadata：游戏描述 + 操作说明（controls）+ 分类/标签；**建议描述 100-200 词** + 分条 controls |
| SDK 审核点 | Basic：`Gameplay start` 事件必须触发（用于测初始包体）；Full：gameplayStart/Stop 全程正确 + （如适用）Data 模块云存档 + User 模块账号集成 + 可选 loading start/stop；广告仅经 SDK（midgame/rewarded），adblock 下游戏必须可玩；广告期间静音 |
| 内容/政策 | **PEGI 12 合规**（13+ 受众）；英文本地化必须；禁止自建全屏按钮；**禁止跨推广**（不得链接其他平台/自有可玩网页版；社区 Discord/开发者官网仅限菜单非主 CTA；App Store 链接一律不得进游戏内）；名称/素材需原创且不与他game 混淆；收集额外个人数据需 T&C/Privacy 通知（推荐非阻断式） |
| 审核/测试流程 | Developer Portal 提交（QA tool 分步引导+预览）→ QA 审核（通常数个工作日~2 周）→ Basic Launch 2 周限量 → 数据达标邀请 Full Launch → SDK 全量接入复审 → 全量发布；50k plays 后可获 1 对 1 SDK 技术支持 |
| 分成模式 | 广告收入分成，按月由平台按「游戏流量 × 广告表现」计算（开发者条款 2025-08-18 版 Art. V）；分成条件：Full Launch + 无外部广告 + 无其他平台品牌露出 + 非原创素材 ≤50%；被选中游戏可申请内购（Xsolla，邀请制）；月结 |

### 1.3 对我方矩阵的共性含义

- 两平台都**禁止游戏内出现 daily.zalize.com 反向导流**（Poki: no outgoing links；CG: no cross-promotion）。平台构建里 caps.externalLinks=false 的 UI 门控已具备（home/moreGames/archive/**sync 设置**均已按 caps 隐藏），但**分享文案仍带自有域名 URL——必改**（见 §4）。
- 两平台都要求**平台构建物不发外部请求**（Poki 硬性；CG 需 consent 通知）：M3 反作弊收口后 **API 依赖面扩大到 5 款**——DG-7/DG-8 的 `/api/llm/*`、DG-1 题目改由 `/api/wordbridge/*` 按日下发（未来日答案收口）、DG-5 题表+判分改为 `/api/epochlens/schedule|guess` 服务端判分、DG-3 排行榜 `/api/dropstack/*`。纯静态零外部依赖的只剩 **DG-2 Numlock、DG-6 GridSpark、DG-4 BorderRush**（见 §4 专项与批次调整）。
- 两平台都要求 adblock 下可玩、广告期间静音、事件时序正确——Poki Inspector 与 CG QA tool 均可提前自测。
- 每日制游戏对两平台是差异化卖点（平台上少见 daily ritual 品类），但注意 CG「landing 直接进 gameplay」要求：每日题结算页停留时间长，需保证首次进入 1 次点击内可玩。

---

## 2. 提交流程 step-by-step

### 2.1 Poki

1. **账号**：poki.com/developers 提交 game submission form 申请（附游戏可玩链接，用 web 构建的 demo 域名即可；P4D 为 closed beta，通过筛选后受邀开通）。
2. **团队信息**：P4D → General/Users/Billing 填公司信息、成员、（后期）收款信息。
3. **上传**：P4D → Games → Upload（zip，相对路径，`vite build --mode poki` 产物）。
4. **自检**：Poki Inspector 跑 QA Modules（SDK 事件时序/尺寸/外部请求逐项过）+ Preview 模式实景预览。
5. **元数据**：Settings 填标题、≤4 个建议分类、描述；上传静态缩略图（动态缩略图在 Soft Release 阶段补）。
6. **测试**：申请 Playtest 录像 → Player Fit Test → Web Fit Test（5-7 天）。指标不足则迭代重测。
7. **签约**：通过 Web Fit 后 Poki 主动联系，选 deal 类型（分成制 vs 独占 vs 买断；**建议先谈非独占分成**，保留自有站与 CG 渠道）。
8. **Soft Release**：排期 1-2 周等 slot；上线类目页 2-3 周，期间盯 play conversion/错误率/变现数据，随时热修。
9. **Global Release**：先入 new games 类目（~5k plays/天）压测，稳定后全量+推荐位。
10. **收款**：P4D Billing 配置 wire/PayPal，月度结算。

### 2.2 CrazyGames

1. **账号**：developer.crazygames.com 自助注册（邮箱即可），接受 Developer Terms。
2. **提交**：Submit a game → 走 QA tool 分步向导：上传 zip（`--mode crazygames` 产物）或 iframe 外链、填描述+controls+分类标签、传 3 张封面 + 2 条预览视频、勾选支持的设备/朝向。
3. **自测**：用 Portal 的 Preview/QA 工具在真实 iframe 环境跑一遍（尺寸档位、SDK 事件面板、包体测量）。
4. **QA 审核**：数个工作日~2 周；未过会附具体不合规项，改后重提（反复提交不合规游戏会被限制）。
5. **Basic Launch**：2 周限量曝光测数据（无变现、SDK 可选但建议先接好 gameplayStart 以便测包体）。
6. **Full Launch 邀请**：数据达标后按 Full 要求补齐（SDK 全事件、adblock 兼容、直落 gameplay ≤1 次点击），复审后全量上线并开启分成。
7. **运营**：Developer Dashboard 看 players/playtime/retention/revenue；50k plays 后可申请 1 对 1 SDK 支持；封面可择机更新拉回流。
8. **收款**：Portal 配置收款，月结（按流量×广告表现计算）。

**排期建议**：CG 先行（自助、周期短、反馈具体），用 CG QA 反馈打磨构建物后再投 Poki 申请（Poki 邀请制、周期 6-10 周，但流量与单价更高）。

---

## 3. 8 款游戏提交材料

> 命名说明：平台版沿用自有站英文名；CG 要求名称原创不混淆，以下名称已避开现有头部游戏重名。缩略图具体画面供 ui-designer 制作参考，规格为两平台并集：**Poki 动图 1080×1080 mp4 4-6s；CG 三图 1920×1080 / 800×1200 / 800×800 + 横竖两条 15-20s 1080p 视频**。所有游戏共用需求：三图视觉一致、标题字上图、无平台 logo/无宣传语、首帧=静态封面。

### DG-1 WordBridge

- **英文标题**：WordBridge — Daily Word Groups
- **短描述**（Poki 分类建议语/CG 一句话，≤140 字符）：Sort 16 words into 4 secret groups, then crack the hidden theme that bridges them all. A new puzzle every day.
- **长描述**（100-180 词，两平台通用底稿）：
  > WordBridge is a daily word association puzzle. Sixteen words, four hidden groups — drag them together and find what connects them. But there's a twist: once you've solved all four groups, a fifth *hidden bridge theme* connects them all. Guess it for a bonus star. One official puzzle per day, same for every player worldwide: compare your emoji result grid with friends without spoiling the answer. Miss a day? The full archive and unlimited practice mode are free. Mistake-friendly feedback tells you when you're just one word off. Quick to learn, satisfying to master — the perfect 3-minute coffee-break ritual.
- **标签/分类建议**：Poki: Puzzle / Word / Brain / Daily；CG: Puzzle → Word，tags: word, daily, brain, logic, connections
- **缩略图需求**：主视觉 = 4×4 彩色词块网格中 4 块正在"搭桥"连线发光；品牌色块（🟨🟩🟦🟪）+ 大字标题；动图：词块吸附成组 → 第四组完成 → 隐藏暗线揭晓闪光（3 场景）。
- **SDK 自检**：见 §4 总表；游戏级注意——archive/practice 入口在平台构建已按 caps.externalLinks 隐藏路由 ✅（App.svelte:58-63），但需确认 practice 模式在平台版保留（无外链即可，玩法留住时长）。**M3 新增**：题目不再随包发行，改由 `/api/wordbridge/manifest|puzzle?day=N` 按日下发（未来日答案收口）——平台构建需「随包题包 + UTC 按日解锁」改造或走外部请求豁免（§4 必改项 2）。

### DG-2 Numlock

- **英文标题**：Numlock — Daily Number Puzzle
- **短描述**：Delete the right numbers so every row and column adds up. Pure logic, no guessing. New puzzle daily.
- **长描述**：
  > Numlock is a daily "reverse sudoku": cross out numbers in the grid until each row and each column sums to its target. Every puzzle is generated with a unique solution and can be solved by pure logic — no trial-and-error required. The grid grows through the week: cozy 5×5 on Monday, brain-melting 7×7 with negatives by the weekend. Unlimited undo, big touch-friendly tiles, and zero interruptions. Finish the daily and share your time with an abstract emoji snapshot that never spoils the solution. How fast can you lock it?
- **标签/分类建议**：Poki: Puzzle / Math / Logic / Daily；CG: Puzzle → Math，tags: math, logic, sudoku, daily, numbers
- **缩略图需求**：数字网格上一只发光的锁形图标，若干格被红色划除；高对比深色底；动图：手指划除数字 → 行列和达成高亮 → 完成锁扣动画。
- **SDK 自检**：注意 happyMoment 目前无条件触发（App.svelte:202，失败也庆祝）——提交前改为仅胜利触发（CG happytime 语义）。M3 最终代码下纯静态零外部依赖 ✅，首批提交候选。

### DG-3 DropStack

- **英文标题**：DropStack — Daily Merge Drop
- **短描述**：Suika-style merge physics with a twist: everyone plays the same 50 drops each day. Top the global chart.
- **长描述**：
  > Drop, merge, grow — DropStack takes the addictive watermelon-game formula and makes it fair. Every day, all players worldwide get the exact same sequence of 50 drops on the same board. No luck, no endless grinding: pure skill, directly comparable. Merge identical fruits into bigger ones, plan your stacks, and squeeze every point out of your 50 drops. When you're done, see your global percentile and share your final board as an emoji snapshot. Come back tomorrow for a fresh seed — and watch the world's #1 replay to steal their tricks.
- **标签/分类建议**：Poki: Puzzle / Physics / Merge / Arcade；CG: Casual → Merge，tags: merge, physics, suika, daily, arcade
- **缩略图需求**：饱满的水果堆即将合成大西瓜的瞬间（挤压形变+高光），角标"50 DROPS · 1 DAILY"；动图：连续两次合成连锁 → 大果诞生爆汁 → 分数跳字（体现物理手感）。
- **SDK 自检**：排行榜 `/api/dropstack/score|top` 请求在平台构建的处理需专项确认（见 §4 必改项 2；服务端已有昵称白名单字符集+共享脏词过滤 ✅，满足 Poki bad words 硬性）；物理需验证 144/165Hz 刷新率一致性（CG 硬性）。

### DG-4 BorderRush

- **英文标题**：BorderRush — Daily Country Path
- **短描述**：Connect two countries through their land borders in as few steps as you can. A new route every day.
- **长描述**：
  > France to Vietnam — which countries do you cross? BorderRush gives you a start and a destination every day; type the countries that chain them together through shared land borders. Fewer steps, more stars. Wrong guess? You still learn: color feedback tells you if a country is on the optimal path, a detour, or a dead end, and direction hints keep you moving. Two free "reveal neighbors" hints when you're stuck. From easy 3-step European hops on Monday to wild 8-step routes through Central Asia on the weekend. Geography nerds, this is your daily fix.
- **标签/分类建议**：Poki: Puzzle / Geography / Educational / Daily；CG: Puzzle → Geography，tags: geography, countries, map, daily, trivia
- **缩略图需求**：程式化世界地图上一条发光路径连接两枚旗帜图钉，途经国家逐个点亮；动图：输入国名 → 地图上路径延伸 → 到达终点烟花（3 场景）。
- **SDK 自检**：国名自动补全为本地数据 ✅ 无外部请求；教育类标签有利于 CG kids/school 流量，但保持 PEGI12 文案（避免争议边界表述，台湾/科索沃等按数据源口径并注明）。

### DG-5 EpochLens

- **英文标题**：EpochLens — Daily Photo Time Travel
- **短描述**：Guess when and where 5 historic photos were taken. Learn one fun fact per photo. New set daily.
- **长描述**：
  > Step into history: EpochLens shows you five real photographs every day — you guess the year and the place. The closer you are, the more points you score. Every reveal comes with a one-line piece of history you'll want to tell someone about. Photos are curated from public-domain archives, from iconic moments to everyday scenes that will fool you completely. One thumb-friendly screen: slide the year, drop a pin, done in five minutes. Compare your daily score worldwide and keep your streak alive. Sunday is themed day — sports, space, fashion and more.
- **标签/分类建议**：Poki: Puzzle / Quiz / Educational / Daily；CG: Puzzle → Trivia，tags: history, photo, trivia, daily, geography
- **缩略图需求**：复古相纸质感的黑白老照片 + 彩色年代滑杆/放大镜元素，突出"猜年代"概念；动图：照片翻出 → 滑杆滑动 → 🎯 命中 + 分数（用已授权 PD 照片制作）。
- **SDK 自检**：照片文件本身已随构建静态发布（哈希文件名防剧透 ✅），但 **M3 起题表与判分全部服务端化**——`/api/epochlens/schedule` 只下发当日脱敏题表（无年份/坐标/作者/来源），`/api/epochlens/guess` 服务端判分后才揭晓答案（含每照片 10 次猜测上限）。平台构建离线化等于把答案放回客户端；图片 PD/CC 授权记录（/credits 页 + 策展管线数据）随提交材料备查。
- **注意**：服务端判分与"包体内置"冲突是 EpochLens 平台版的结构矛盾——平台版要么走外部请求豁免（保留服务端判分），要么改「精选题包」模式（打包 30-60 天题目+本地判分，接受平台场景防剧透降级），详见 §4 必改项 2。

### DG-6 GridSpark

- **英文标题**：GridSpark — Daily Star Logic
- **短描述**：Place one star in every row, column and color region — no two touching. One handcrafted puzzle daily.
- **长描述**：
  > GridSpark is the daily star-placement logic puzzle: fill the grid so each row, each column and each color region contains exactly one star, and no two stars touch — not even diagonally. Every puzzle is verified to have a unique solution you can reach by pure deduction, never guessing. Conflicts light up red instantly, so you always know where you stand. Race the clock, share your solve time, and grow the grid from a friendly 7×7 on Monday to a fiendish 10×10 on the weekend. Includes a color-blind friendly mode and an unlimited practice library. No account, no fuss — just tap and think.
- **标签/分类建议**：Poki: Puzzle / Logic / Brain / Daily；CG: Puzzle → Logic，tags: logic, queens, star, daily, brain
- **缩略图需求**：彩色分区网格中一颗大星星落位发出电火花，周边格子微光；动图：星星逐个落位 → 冲突红闪修正 → 完成全盘亮起 + 计时定格。
- **SDK 自检**：计时器在广告（rewarded 提示）期间必须暂停——确认 showRewarded 调用路径包裹了计时暂停；色弱模式是差异化卖点，截图/视频中展示。
- **注意（法务）**：描述与标签**避免使用 "Queens"/"LinkedIn" 字样**（商标风险 + CG 原创性条款），用 "star logic puzzle" 品类词。

### DG-7 Interrogate

- **英文标题**：Interrogate — Daily AI Detective
- **短描述**：A new case every day. Question the suspects, catch the liar, name the culprit — in 10 questions or less.
- **长描述**：
  > Someone is lying — and you have ten questions to prove it. Interrogate serves a brand-new detective case every day: read the case file, question three or four suspects, and watch their answers contradict each other. Every suspect has an alibi; only one has a motive that survives scrutiny. Choose smart follow-up questions, spot the crack in their story, and make your accusation. Solve it and unlock the full truth timeline to see everything you missed. Same case for the whole world each day: share how many questions you needed — no spoilers. A fresh mystery in five minutes, every single day.
- **标签/分类建议**：Poki: Puzzle / Mystery / Detective / Daily；CG: Puzzle → Mystery，tags: detective, mystery, deduction, daily, story
- **缩略图需求**：审讯室场景剪影——单灯下三名嫌疑人档案卡+一个大问号/放大镜，noir 风格但明快配色（PEGI12：无血腥无武器特写）；动图：档案翻开 → 提问气泡与嫌疑人对答 → "CULPRIT FOUND ✅" 揭示。
- **SDK 自检**：**依赖 `/api/daily?game=detective` + `/api/llm/interrogate` + `/api/detective/accuse`（apps/detective/src/api.ts 相对路径 fetch，路由 slug 为 `/interrogate/`）——平台构建现状会直接 404**，是提交 blocker，处理方案见 §4 必改项 2。**M3 收口后生产形态利好审核**：审讯只接受白名单脚本问题 id（自由输入服务端 422 拒绝），提示词全部服务端构建，60 次/IP/天硬配额 + 全局 2000 次/天熔断——LLM 越狱面已关闭，PEGI12 自查压力集中在预生成案件文本本身。

### DG-8 InfiniteAlchemy Daily

- **英文标题**：InfiniteAlchemy — Daily Crafting Challenge
- **短描述**：Combine elements to craft today's target in the fewest steps. Infinite recipes, one daily goal.
- **长描述**：
  > Start with water, fire, earth and wind. Combine anything with anything — the alchemy engine understands nearly every idea you throw at it — and craft your way to today's target: maybe Dragon, maybe Sushi, maybe the Internet. Every combination is shared globally, so the same recipe always gives the same result, and the fastest crafting chains climb the daily percentile chart. Discover something nobody has ever made? Your discovery gets your name on it, forever. When you're done with the daily, free-play sandbox mode lets you keep exploring the infinite crafting tree. New target every day.
- **标签/分类建议**：Poki: Puzzle / Crafting / Simulation / Daily；CG: Casual → Simulation，tags: crafting, merge, alchemy, sandbox, daily
- **缩略图需求**：两个元素图标（🔥+💧 风格的自绘图形）相撞迸发新元素剪影，目标物（如龙）以问号剪影悬于上方；动图：三连合成链 → 目标物揭晓 → "9 steps · Top 8%"。
- **SDK 自检**：同 DG-7，**LLM 合成必须调 `/api/llm/combine`（apps/craft/src/api.ts，路由 slug 为 `/alchemy/`）——平台构建 blocker**，见 §4 必改项 2。M3 收口：60 次/IP/天硬配额 + 2000 次/天全局熔断（429/503 已有专属 UX 文案），服务端只接受 `{a,b,name}` 白名单字段；**共享脏词过滤（规范化+子串匹配）已在服务端实现 ✅**，满足 Poki bad words list 硬性。

---

## 4. SDK 适配自检表（对照 packages/core/src/platform/ 实现逐项核对）

### 4.1 现状盘点（integration/daily-games 分支，2026-08-01）

已达标 ✅：

| 项 | 位置 | 状态 |
|---|---|---|
| 三模式构建（web/poki/crazygames，tree-shaking + 相对路径 zip） | apps/*/vite.config.ts（`base: './'`）+ package.json build:poki/build:crazygames | ✅ 全部 8 款就绪 |
| PlatformAdapter 接口与 poki/crazygames 双实现 | packages/core/src/platform/{poki,crazygames}.ts | ✅ init/loadingFinished/gameplayStart/Stop/happyMoment/interstitial/rewarded 全覆盖 |
| 8 款游戏生命周期全接线 | apps/*/src/App.svelte（init→loadingFinished，首次输入 gameplayStart，结算 gameplayStop） | ✅ 逐款 grep 核对通过 |
| gameplayStart 在首次输入触发（Poki 审核点 #3） | 各 App.svelte（如 wordbridge:152 在交互回调内） | ✅ |
| 平台构建隐藏外链 UI（caps.externalLinks 门控 home/moreGames/archive 路由） | 各 App.svelte showHomeLink/showMoreGames | ✅ |
| localStorage try/catch（Poki incognito 硬性） | packages/core/src/storage（探针写入 try/catch） | ✅ |
| CG loadingStart/loadingStop（加载时长上报） | crazygames.ts init/loadingFinished | ✅ |
| adblock 下可玩（CG rewarded adError → resolve false 不卡死；Poki rewardedBreak 返回 false） | 两 adapter | ✅ 基本满足，注意「adblock 时不得发奖励」条款（见必改项 5） |
| 昵称/用户输入脏词过滤（Poki 硬性） | workers/core-api 共享 containsProfanity（规范化+子串匹配）+ DropStack 昵称白名单字符集 | ✅ M3 收口新增 |
| LLM 成本护栏（60/IP/天 D1 精确配额 + 2000/天全局熔断） | workers/core-api `ip_quota`/`llm-calls` | ✅ 平台放量后的成本风险已封顶 |
| 安全响应头（X-Frame-Options/nosniff/HSTS 等） | build:web 产物 `_headers`（9 条路由 curl 断言通过） | ✅ web 构建；平台 zip 由平台自管，无需携带 |

### 4.2 提交前必改项（按优先级）

| # | 必改项 | 位置 | 说明 | 严重度 |
|---|---|---|---|---|
| 1 | **分享文案去除自有域名 URL** | packages/core/src/share/index.ts `buildShareText` 恒拼 URL；各 App.svelte 传 `daily.zalize.com/<slug>`（M3 复核：域名已迁，问题不变） | Poki「remove all outgoing links」/CG「no cross-promotion」直接违规。改法：ShareCardInput.url 改可选，平台构建（caps.externalLinks=false）不传 url，分享文案以游戏名+题号结尾 | P0，两平台拒收级 |
| 2 | **5 款 API 依赖游戏的 `/api` 相对路径在平台域名下 404**（M3 后范围扩大：DG-1 题目下发、DG-3 排行榜、DG-5 题表+服务端判分、DG-7/DG-8 LLM） | apps/wordbridge `/api/wordbridge/*`、apps/dropstack `/api/dropstack/*`、apps/epochlens `/api/epochlens/*`、apps/detective/src/api.ts、apps/craft/src/api.ts | 平台上游戏跑在 poki-gdn/CG CDN 域，相对 `/api/*` 无后端。改法：平台构建注入 `VITE_API_ORIGIN=https://daily.zalize.com`（绝对地址）+ core-api CORS 精确放行平台域（M3 已有先例：`/api/sync` 仅对 games.zalize.com 导出页开 CORS）；**Poki 需按「多人/外部服务」个案申请外部请求豁免并提交 hosted Privacy Policy——https://daily.zalize.com/privacy/ 已上线且内容如实 ✅**；CG 需游戏内非阻断式 Privacy 通知。若豁免谈不下：DG-1/5/7 退化为随包题包（30-60 天，UTC 按日解锁+本地判分，接受平台场景防剧透降级），DG-3 平台版隐藏排行榜（本地分数照玩），DG-8 不提交 Poki 首批 | P0，波及 5 款 |
| 3 | **Poki 16:9 全画布适配核验** | 全部 8 款（移动优先 375px 竖屏设计） | Poki 硬性 16:9 缩放（640×360 基准）；CG 十档 iframe 尺寸文本可读。需逐款在 Poki Inspector/CG Preview 过桌面横屏布局（当前桌面为「增强布局」，未按 16:9 画布验收过） | P0，Poki 拒收级 |
| 4 | **广告期间静音未实现** | poki.ts commercialBreak/rewardedBreak 未传 onStart 静音回调；crazygames.ts requestAd 未用 adStarted 回调 | 两平台审核点。改法：PlatformAdapter 增加音频 mute 钩子（或全局 AudioContext suspend），poki 传 `commercialBreak(muteFn)`，CG 在 adStarted/adFinished 里 mute/unmute。当前游戏均无音效则可暂记「N/A-无音频」，一旦加音效即为必改 | P1（无音频时可豁免，需在提交备注声明） |
| 5 | **adblock 检测下不发奖励** | web.ts showRewarded 恒 `granted:true` 仅限 web 构建 ✅；poki/cg 路径依赖 SDK 返回 | 核验 rewarded 兑换（提示/补签）仅在 granted=true 时发放；Poki 明令 adblock 时不得发奖 + 不得展示自定义 adblock 提示 | P1 |
| 6 | **rewarded 按钮视觉规范（Poki）** | 各游戏提示/补签 UI | 🎬 图标必须有；不得绿色；必须并列等大绿色普通按钮。逐款 UI 走查（ui-designer 配合） | P1 |
| 7 | **happyMoment 误触发** | apps/numlock/src/App.svelte:202、epochlens:154、dropstack:159、craft:272（无条件调用，M3 最终代码复核仍在） | CG happytime 用于「高光时刻」信号影响推荐；对齐 wordbridge/detective/borderrush 的 `if (won)` 写法 | P2 |
| 8 | **SDK 事件防重入** | packages/core adapter 层 | Poki 审核点 #1/#2（不得连发两个 start/stop）。改法：adapter 内部记录 gameplay 状态，重复调用去重（一处改，8 款受益）；另 poki.ts showInterstitial/showRewarded 内部自带 stop/start，若游戏层也调用会连发——约定游戏层不包裹，或 adapter 去重兜底 | P1 |
| 9 | **CG mobile CSS（user-select:none）与 iOS AudioContext resume** | 各 index.html/app.css | CG 文档要求 body 加 user-select:none 防长按放大镜；有音频后需 touchend resume | P2 |
| 10 | **CG 直落 gameplay ≤1 click（Full 要求）** | 各游戏首屏 | 每日游戏天然「点开即今日题」✅，但已完成当日题的回访用户会落在结算页——保留「练习/回放」一键入口即可满足 | P2 |
| 11 | **提交物 QA 演练** | — | 每款分别过 Poki Inspector 全模块 + CG QA tool 无 blocker（TECH-SPEC 里程碑 P2/P3 对应项），产出勾选记录归档 | 流程项 |

### 4.3 提交批次建议

1. **第一批（CG Basic Launch）**：DG-2 Numlock、DG-6 GridSpark、DG-4 BorderRush——M3 最终代码下仅剩的**纯前端零外部依赖**三款（DG-1 因未来日答案收口改为 API 下发题目，退出首批），只需必改项 1/3/6/7/8 即可提交。
2. **第二批**：DG-1 WordBridge（随包题包改造或 API 豁免后）、DG-5 EpochLens（题包模式改造后）、DG-3 DropStack（排行榜绝对路径+CORS 后）。
3. **第三批**：DG-8、DG-7（外部请求豁免后；Privacy Policy 已上线 ✅；Poki 谈判期间先上 CG——CG 对外部请求仅要求 consent 通知，门槛更低）。
4. Poki 申请与 CG 提交并行启动：Poki 用 web 构建 demo 链接申请 P4D，等待期正好完成必改项。

---

## 附录 R：调研来源（2026-08-01 核对可访问）

- Poki 总要求：https://sdk.poki.com/new-requirements.html （16:9/incognito/外部请求屏蔽/8MB/无外链/rewarded 按钮规范/SDK 事件审核点）
- Poki 动态缩略图：https://sdk.poki.com/animated-thumbnails.html （1080×1080 mp4 4-6s 规格）
- Poki P4D 与元数据：https://sdk.poki.com/what-is-p4d.html （≤4 分类/描述/缩略图审核）
- Poki 发布流程：https://sdk.poki.com/releaseprocess （Soft Release 2-3 周/Global）；流程实录：https://kuyimobile.substack.com/p/my-game-production-process-and-how （Player Fit → Web Fit 5-7 天）
- Poki 分成：https://sdk.poki.com/ 与 https://sdk.poki.com/deals （直达流量 100% / 平台流量 50-50；独占默认 5 年；PocketGamer 2026-07 报道佐证）
- CrazyGames 要求总览：https://docs.crazygames.com/requirements/intro/ （Basic/Full 两段、包体、PEGI12）
- CrazyGames 技术要求：https://docs.crazygames.com/requirements/technical/ （50/20MB、相对路径、SDK Basic/Full、sitelock、consent）
- CrazyGames 玩法要求：https://docs.crazygames.com/requirements/gameplay/ （iframe 尺寸档、跨推广禁令、直落 gameplay）
- CrazyGames 封面/视频：https://docs.crazygames.com/requirements/game-covers/ （1920×1080/800×1200/800×800 + 视频规格）
- CrazyGames 开发者条款（分成条件）：https://files.crazygames.com/documents/developer_terms_20250818.pdf
- 代码核对：zalize-games `integration/daily-games` 分支（M3 收口最终提交 `6e92766`）packages/core/src/platform/{types,poki,crazygames,web}.ts、packages/core/src/{share,storage}、apps/*/src/{platform.ts,App.svelte,api.ts,game.ts}、apps/*/vite.config.ts、workers/core-api/src/routes/
- M3 收口范围：https://github.com/wookat/zalize-games/pull/73 （8 轮线上迭代：未来日答案收口、LLM 硬配额+熔断、服务端判分、同步码 8 款全接、迁移页、三层限流、安全响应头等）
- 复核结论：**PlatformAdapter 双实现（packages/core/src/platform/）自 M1 后零改动，§4.1 已达标项与 §4.2 必改项 1/3-11 在最终代码上全部仍成立**；必改项 2 的波及面因 M3 反作弊收口从 2 款扩大到 5 款（已更新）。
