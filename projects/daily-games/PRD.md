# PRD：Daily Games 每日游戏矩阵（代号 DG）

- 作者：product-manager（按 SOP-01 阶段 1 产出）
- 日期：2026-07-31
- 输入：`项目一页纸.md`、`游戏方向调研汇总.md`、report-A/B/C（本目录）+ 本 PRD 附录 D 补充选品证据（2026-07-31 采集）
- 落地仓库：https://github.com/wookat/zalize-games （monorepo，现有 apps/detective、apps/craft、apps/portal、apps/puzzle 空骨架）
- 下游：spec-writer（工程 spec）、tech-lead（技术方案/ADR）、ui-designer+ux-researcher（设计稿）

---

## 0. 产品定义与目标

**一句话**：为英文市场「上班摸鱼/每日仪式感」休闲玩家提供一组每日一题、点开即玩（<2s）、结果可炫耀分享（emoji 矩阵）的轻量网页游戏矩阵，统一门户交叉导流，广告变现。

**北极星指标**：矩阵日活（跨游戏去重 DAU）；辅助：单游戏 D7 留存、分享点击率（分享带来的新访客/分享次数）、平均会话时长（Poki 对标 11-20 分钟）。

**商业目标**（承接一页纸）：首笔广告收入 ≤8 周；M4（8-12 周）月收入 $500+。

**目标用户**：
- P0 英语区（US/UK/CA/AU）25-45 岁办公人群：每天固定时间玩 5-15 分钟，玩完分享到群聊/社交（Wordle 行为模式，NYT 系日活千万级，见附录 D1）。
- P1 学生/泛休闲玩家：经 Poki/CrazyGames 分发进入，会话更长、广告容忍更高。

---

## 1. 选品清单（8 款）

### 选品方法论（为什么是这 8 款）
按调研报告 C 的成功共性（每日稀缺感 × 分享格式 × 单一强机制 × 低美术）+「低垂果实」三法（低分高需求 / 供给差 / 窗口期）筛选。每款必须满足：
1. 品类需求已验证（头部竞品有公开流量/玩家数证据）；
2. 有明确差异化（微创新或体验修复），不做像素级克隆；
3. 单款开发 ≤4 周（S≤1 周、M≤2.5 周、L≤4 周，单工程师实例）；
4. 覆盖品类：词类 ×2、数字/逻辑 ×1、合成/物理 ×1、地理 ×1、常识/年代 ×1、图形推理 ×1（其中 AI 原生 ×2，复用 G1/G2 底座）。

| # | 代号 | 品类 | 一句话 | 复杂度 | 波次 |
|---|---|---|---|---|---|
| DG-1 | WordBridge | 词类 | 每日词语分组+一条隐藏暗线 | S | 首批 |
| DG-2 | Numlock | 数字/逻辑 | 每日数字消除（反向数独） | S | 首批 |
| DG-3 | DropStack | 合成/物理 | 每日同种子合成掉落挑战 | M | 二批 |
| DG-4 | BorderRush | 地理 | 每日国家路径连线 | M | 二批 |
| DG-5 | EpochLens | 常识/年代 | 每日老照片猜年代+地点 | M | 二批 |
| DG-6 | GridSpark | 图形推理 | 每日星阵逻辑格（Queens 类） | S | 二批 |
| DG-7 | Interrogate（G1 深化） | AI 原生·推理 | 每日 AI 案件审讯嫌疑人 | L | 首批* |
| DG-8 | InfiniteAlchemy Daily（G2 深化） | AI 原生·合成 | LLM 无限合成的每日目标挑战 | M | 首批 |

\* DG-7 首批仅上「每日案件（预生成剧本）+ 审讯」最小闭环，自由输入审讯的防护与成本工程在二批完善（见 4 优先级）。

---

### DG-1 WordBridge（词类，S）

- **玩法一句话**：把 16 个词分成 4 组、每组 4 词，全部分对后揭晓贯穿 4 组的「隐藏暗线」第五主题，猜中暗线得额外一星。
- **参考竞品与流量证据**：
  - NYT Connections：日活 900 万+，NYT 第二大词游（WordsRated，https://wordsrated.com/guides/nyt-connections-statistics/ ）。
  - 衍生需求外溢：connectionsunlimited.org、connectionsplus.io 等 archive/unlimited 站点成规模存在（附录 D2），证明官方「一天一题、无存档」满足不了需求。
  - Wordle 本体 Q2-2025 仍 1200 万 DAU（electroiq.com/stats/wordle-statistics/），词类每日游戏是被验证的最大品类。
- **差异化点**：① 隐藏暗线机制（分组之上多一层 aha，Connections 没有）；② 免费全量存档+unlimited 练习模式（直接吃 D2 证明的外溢需求，也是 SEO 弹药）；③ 错误反馈更友好（提示「差一个」，Connections 高频抱怨点）。
- **每日机制**：全球统一每日题（编辑管线：LLM 批量生成候选 → 人审/自动校验歧义 → 排期表）；每日 UTC 切换；当日题唯一计入连胜与排行。
- **分享格式**：`WordBridge #214 ⭐⭐⭐⭐+🔗` + 4×4 猜测过程色块矩阵（🟨🟩🟦🟪 按组色；错猜行加 ⬜），暗线猜中附 🔗；不剧透答案。
- **难度曲线**：单题内 4 组按易→难配色排序；周内曲线周一最易→周六最难、周日主题彩蛋（NYT 同款心智，用户已被教育）。
- **复杂度**：S（纯前端+静态题库 API；无物理/无 LLM 实时调用）。

### DG-2 Numlock（数字/逻辑，S）

- **玩法一句话**：在数字网格中划掉若干数字，使每行每列剩余数字之和等于行/列目标值（Sumplete 式反向数独），步数与用时计星。
- **参考竞品与流量证据**：
  - Sumplete（sumplete.com）：2023 年「ChatGPT 发明的游戏」病毒事件，上线即数千人同玩并获 Gizmodo/Business Insider/Digital Trends 报道（附录 D3），玩法被出版成实体书——需求真实但本体多年无迭代、无移动优化。
  - Nerdle（nerdlegame.com/hq/nerdle-story.html）：上线 3 周破 100 万玩家、200+ 国家，证明「数字版每日 Wordle」品类容量。
  - 商店端 Sudoku/数字逻辑类头部 App 下载千万级但广告过载、差评集中（报告 C §2A + 附录 D6 同证）。
- **差异化点**：① 每日一题 + 连胜 + emoji 分享（Sumplete 官方无每日仪式与分享矩阵）；② 移动端手感（大触区、防误触，对照 Nonogram.com「fat finger」差评）；③ 无插屏广告的干净体验（低分高需求修复）。
- **每日机制**：确定性种子生成（seed = 日期），保证全球同题、可离线校验唯一解；难度参数随星期变化。
- **分享格式**：`Numlock #87 6×6 ✅ 2:41` + 网格缩略 emoji（🟥 被删格/⬜ 保留格）组成的抽象图案——不泄露解、但图案有辨识度。
- **难度曲线**：周一 5×5 → 周中 6×6 → 周末 7×7+负数/更大数域；每题保证逻辑可推、无需试错穷举。
- **复杂度**：S（生成器+求解器纯算法，无后端依赖）。

### DG-3 DropStack（合成/物理，M）

- **玩法一句话**：Suika 式「同类相合变大」物理掉落，但每天全球玩家用同一条固定水果序列+同一地图，比谁在 50 次掉落内得分最高。
- **参考竞品与流量证据**：
  - Suika Game：全球 1300 万+ 下载（App Store 官方文案，附录 D4）、Switch 连续两年下载第一；源头《合成大西瓜》2021 中国现象级传播（报告 C 案例 5/10）。
  - suikagame.io 等网页克隆站长期存活并有 SEO 流量，证明 web 端持续需求；但**无一家做成「每日同种子挑战」**——纯无限模式，无仪式感、无可比性（供给缺口）。
- **差异化点**：① 每日固定种子（序列+扰动全同），首次让 Suika 类可公平比分、可分享比较；② 50 次掉落限制把无限玩法压缩成 3-5 分钟每日仪式；③ 每日排行榜（可选匿名）。
- **每日机制**：种子=日期派生；物理引擎确定性回放（固定 timestep），支持「观看今日全球 Top1 回放」作为次日留存钩子。
- **分享格式**：`DropStack #33 🍉 8,420 pts` + 最终盘面网格化 emoji 快照（🍒🍇🍊🍉 按最大果实等级）+ 百分位（Top 12%）。
- **难度曲线**：种子生成时控制「甜度」：周一序列友好（同类相邻概率高）→ 周末刁钻；玩家技巧差异天然形成分布。
- **复杂度**：M（2D 物理引擎 matter.js/planck.js + 确定性保证 + 排行榜后端 Workers/D1）。

### DG-4 BorderRush（地理，M）

- **玩法一句话**：给定起点国和终点国，逐个输入中间接壤国家，用最少步数连出一条陆路路径。
- **参考竞品与流量证据**：
  - Travle（travle.earth）：Reddit r/geography 发布帖高热度、被 DLES/Playlin 等每日游戏聚合站收录为固定条目（附录 D5）。
  - Worldle（worldle.teuteuf.fr）：Wordle 地理变体开创者，衍生克隆与 unlimited 站成生态（worldle.online、worldlegame.io 等，附录 D5）——地理每日品类供给已多但仍在增长，聚合站（dles.gg）地理类目常年占坑。
  - 品类整体背书：Globle、GeoGuessr 免费版长期霸占「daily geography game」搜索结果。
- **差异化点**：① 路径玩法比「猜国家」信息量大、复玩性强，但 Travle 本体 UI 老旧、无统计云同步、移动端一般——做体验修复；② 每日双模式：经典路径 + 「主题周」（只走某大洲/沿海路线）；③ 错猜给「方向感」反馈（该国在路径的哪个方位），降挫败。
- **每日机制**：题库=国家对 (A,B) 按最短路径长度分难度排期；全球同题、UTC 切换。
- **分享格式**：`BorderRush #142 🌍 7/5+2` + 每步一行 emoji（🟩 在最短路上/🟨 可行但绕路/🟥 不接壤）+ 国旗 emoji 串（仅展示步数不剧透国名）。
- **难度曲线**：周一 3-4 步欧洲/北美熟悉区 → 周末 6-8 步非洲/中亚冷门区；提供 2 次免费「透视相邻国」提示。
- **复杂度**：M（国家邻接图数据+地图渲染（静态 SVG 世界地图即可）+输入联想）。

### DG-5 EpochLens（常识/年代，M）

- **玩法一句话**：看一张历史照片，猜拍摄年份和大致地点，越接近得分越高，每天 5 张。
- **参考竞品与流量证据**：
  - TimeGuessr（timeguessr.com）：有官方 App、Google Play 在架、web 端带去广告付费层（说明已在赚钱）；Chronophoto 同类并存（附录 D5）。
  - dles.gg 聚合站数据显示 TimeGuessr/Chronophoto 与 Globle、Clues by Sam 共享玩家群——「每日轮换 5-8 个游戏」的用户习惯已形成，年代猜图是标准配置之一。
  - 品类无垄断者：EraGuessr 等 2025-2026 新入场者仍能立足（附录 D5），供给未饱和。
- **差异化点**：① 照片配一句「事后揭晓」的历史小知识（把游戏做成每日冷知识内容，提升分享语料与 SEO 内容量）；② 年代+地点双滑杆一屏完成，移动端体验优先；③ 每周日「主题日」（体育/航天/时尚…）。
- **每日机制**：题库=公有领域/CC 授权历史照片（Wikimedia Commons、美国国会图书馆等）+人工排期；每天 5 张固定顺序全球同题。
- **分享格式**：`EpochLens #58 📷 42,180/50,000` + 每张一行 `🎯/🟢/🟡/🔴`（按年代误差档位）+ 地点命中 🌍/❌。
- **难度曲线**：5 张内部按「标志性事件→冷门场景」排列，保证第 1 张人人有成就感、第 5 张拉开分差。
- **复杂度**：M（照片策展管线是主要工作量；游戏本体简单）。**风险**：图片版权——只用 PD/CC 素材并保留来源记录，上线前过 compliance-counsel（SOP-01 阶段 5）。
- **每日机制补充**：得分制天然规避「对/错剧透」问题，分享无剧透风险。

### DG-6 GridSpark（图形推理，S）

- **玩法一句话**：在彩色分区网格中放置「星星」，满足每行、每列、每个色区恰好一颗且互不相邻（LinkedIn Queens 玩法系），比用时。
- **参考竞品与流量证据**：
  - LinkedIn Games（Queens/Tango/Zip）：2024-2025 LinkedIn 官方力推的增长功能，媒体广泛报道「move over, Wordle」（USA Today 等，附录 D6），各解答站/攻略站生态已成型——玩法被平台级验证。
  - 但 LinkedIn 域外玩不了（需 LinkedIn 账号/App），**开放 web 端缺一个干净的同玩法每日站**（供给缺口）。
  - Nonogram.com 等图形逻辑 App：App Store 4.6 分表象下近百条最新评论 52% 为 1-3 星，抱怨集中于广告轰炸与误触（appcustomerservice.com 统计，附录 D6）——低分高需求，体验修复空间明确。
- **差异化点**：① 无需账号、点开即玩（对照 LinkedIn 登录墙）；② 零插屏；③ 每日 1 题竞速 + 无限练习题库；④ 色弱友好配色模式（图形类游戏普遍缺失）。
- **每日机制**：每日 1 张手工校验唯一解的网格（生成器+SAT 校验）；全球同题；计时从首次交互开始。
- **分享格式**：`GridSpark #29 👑 1:07` + 网格色区缩略 emoji 图案（🟪🟦🟩… 按区块形状，不含星星位置=不剧透）+ 速度徽章（⚡<1min）。
- **难度曲线**：周一 7×7 → 周末 9×9/10×10；每题保证纯逻辑链可解（不需猜测回溯）。
- **复杂度**：S（纯前端算法题；生成器可离线预产）。

### DG-7 Interrogate — 每日 AI 案件审讯（AI 原生·推理，L，G1 detective 深化）

- **玩法一句话**：每天一起新案件，玩家在限定提问次数内审讯 3-4 名 AI 嫌疑人（自由输入或选择追问），找出说谎者并指认真凶。
- **参考竞品与流量证据**：
  - Clues by Sam（cluesbysam.com）：每日推理品类近两年黑马，媒体称「my favorite Wordle-derivative」（Aftermath，附录 D7），聚合站高共享玩家数——每日破案需求被验证。
  - Murdle（murdle.com）：免费每日破案站起家 → 实体书全美/星期日泰晤士双榜第一的出版现象（附录 D7），证明「每日一案」IP 化潜力。
  - Suck Up!（AI NPC 说服玩法）媒体报道与持续更新证明 AI 对话玩法付费可行（报告 C §2C）。
  - 供给缺口：Clues by Sam/Murdle 均为**静态逻辑题**，「与嫌疑人对话审讯」的每日游戏无头部产品——AI 原生窗口期（报告 C 方向 2）。
- **差异化点**：① 审讯对话是内容本体（静态竞品做不到）；② 每日案件由管线预生成完整剧本（人物/时间线/矛盾点），LLM 审讯回答被剧本约束——保真且 token 可控；③ 指认后解锁「完整真相时间线」复盘页（分享语料）。
- **每日机制**：案件每日 UTC 更新；全球玩家同案；审讯回复按（案件×嫌疑人×问题语义簇）缓存，命中即免 LLM 调用（复用 zalize-games DeepSeek relay + KV，成本护城河）。
- **分享格式**：`Interrogate #12 🕵️ ✅ 7 questions` + 每次提问一格 emoji（🟦 有效线索/⬜ 无效提问）+ 指认结果 ✅/❌ + `The killer was… 🤫`（不剧透）。
- **难度曲线**：提问预算 10 次；周一案件 1 个决定性矛盾点 → 周末需交叉比对 3 人证词；新手首局提供「引导追问」按钮（降低自由输入门槛）。
- **复杂度**：L（剧本生成管线 + 审讯 LLM 编排 + 缓存/成本工程 + 内容安全过滤）。首批范围收缩：预生成剧本 + 引导式追问优先，自由输入在防护完善后开放。
- **风险**：LLM 输出合规（暴力描写分级、越狱防护）→ 输出过滤 + compliance-counsel 审查（一页纸风险 ⑤）。

### DG-8 InfiniteAlchemy Daily — LLM 无限合成每日挑战（AI 原生·合成，M，G2 craft 深化）

- **玩法一句话**：从水火土风四元素出发自由两两合成（LLM 实时判定结果），每天挑战「用最少合成步数做出今日目标物」（如 Dragon、Internet、Sushi）。
- **参考竞品与流量证据**：
  - Infinite Craft（neal.fun）：2024 峰值每日 3 亿次合成（Wikipedia，报告 C [S7]），官方 App 双端在架（附录 D8）；克隆站（infinitecraft-game.io、infinitecrafts.io 等）长期存活抢 SEO——品类流量巨大。
  - 供给缺口：Infinite Craft 本体**无每日目标、无分享矩阵、无连胜**——纯沙盒缺少回访钩子（这正是我们「每日制」框架的用武之地）；社区自发的「speedrun to X」内容（YouTube/Reddit）证明目标挑战玩法有观赏与传播性。
- **差异化点**：① 每日目标+步数比拼把沙盒变成竞技仪式；② 全球合成结果共享缓存（同配方全网只算一次 LLM）——成本与一致性双赢，也保证每日比拼公平；③ 保留自由沙盒模式承接长尾时长（广告曝光主力）。
- **每日机制**：目标词每日 UTC 更新（人工排期，保证 5-12 步可达且趣味）；「首个发现」冠名（First Discovery by …，可选昵称）复刻 Infinite Craft 最上瘾的社交钩子。
- **分享格式**：`InfiniteAlchemy #45 🎯 Sushi in 9 steps` + 合成链 emoji 摘要（🔥+💧=♨️ → … 只展示前 2 步防剧透）+ 步数百分位。
- **难度曲线**：目标词按「常识可推 → 脑洞跳跃」在周内爬坡；无步数上限但计分随步数衰减，休闲玩家也能完成。
- **复杂度**：M（G2 底座已有 LLM 合成概念；新增每日目标层、共享缓存、步数记录）。

---

## 2. 通用产品需求（矩阵级，适用于全部 8 款）

### 2.1 统一门户与交叉导流（apps/portal）
- 门户首页：今日 8 款游戏卡片（已玩 ✅/未玩 ● 状态一目了然）+「今日全勤」徽章。
- 每款游戏完局页固定展示「今天还可以玩」推荐位（未玩游戏优先、随机 2 款），一键跳转。
- 全站统一顶栏：logo/游戏切换器/连胜火焰图标/设置；游戏间跳转不丢当日进度。
- 域名结构（默认，spec 阶段确认）：`games.zalize.com` 门户 + `games.zalize.com/<game>` 或子域每游戏一落地页（SEO 需求见 2.8）。

### 2.2 统一每日种子（时区处理）
- **每日题号 = UTC 日期**（`#N` 自纪元日递增），全球同题，保证分享可比性与社交讨论一致（跟随 Wordle/Connections 惯例）。
- UI 倒计时展示「距下一题」按用户本地时区渲染；切题时刻前后 5 分钟内提交按开始时的题计。
- 客户端在游戏开始时锁定题号，跨零点游玩不换题、不算断签。
- 反作弊底线：种子/答案不得以明文出现在首屏包体（答案哈希校验或延迟拉取），不追求强反作弊。

### 2.3 连胜与统计
- 本地存储（localStorage）：每游戏 played/win 分布/当前连胜/最长连胜/直方图；矩阵级「全勤天数」。
- 可选云同步：匿名设备 ID 起步（无注册墙），提供「同步码」跨设备迁移；后端 Workers+D1/KV。**账号注册永远可选**（非目标见 §3）。
- 断签宽限：连胜按「玩过即算」（不要求赢），周末不豁免（保持规则简单）；漏一天可用 1 次/月的「补签」（激励视频解锁，见 2.9）。

### 2.4 分享卡片
- 统一分享组件：emoji 结果矩阵（每游戏格式见 §1）+ 题号 + 成绩 + 短链（UTM 标记游戏与题号）。
- 一键复制（桌面）/ Web Share API（移动）；分享文本永不剧透答案。
- 完局页附加可选「图片卡」（canvas 生成，含品牌色与二维码）供 IG/Story 场景。

### 2.5 排行榜（可选功能，非首批阻塞项）
- 仅计分型游戏（DG-3/5/8）默认展示每日全球分布（百分位），可选提交昵称进 Top100。
- 无账号、脏词过滤、按日重置；服务端做基本合理性校验（分数上限/提交频率）。

### 2.6 移动端优先响应式
- 所有游戏以 375px 宽为第一设计目标，触控目标 ≥44px；桌面为增强布局。
- 竖屏单手可完成全部操作；不依赖 hover；支持系统深色模式。
- 技术栈遵循公司规范：Tailwind CSS + 现代组件规范（老板指令：移动端适配与视觉现代感是验收硬指标）。

### 2.7 性能：加载 <2s
- 每游戏首屏可交互 <2s（4G 中端机、Lighthouse 移动模拟）；门户 <1.5s。
- 手段：静态优先（Cloudflare Pages/CDN）、每游戏独立 bundle ≤200KB gz、题库按日拉取、物理/LLM 游戏懒加载引擎。
- 预算入 CI（Lighthouse CI 阈值），超标视为 blocker。

### 2.8 SEO
- 每游戏独立落地页：玩法介绍 + **How to play**（分步图文）+ FAQ + 历史题存档页（如 DG-1 archive）+ 结构化数据（FAQPage/VideoGame）。
- 关键词策略吃已验证流量：`<game> unlimited`、`daily <category> game`、`games to play at work`、`wordle alternatives`（附录 D2/D9：unlimited 类聚合词月搜百万级）。
- 门户博客位：每日/每周题目讲解自动生成页（DG-5 历史冷知识、DG-7 案件复盘）作为内容飞轮。
- 技术基线：SSR/SSG 落地页、sitemap 每日更新、OG 卡片每题动态生成。

### 2.9 广告位规划（不骚扰原则）
- **禁止**：插屏打断、开局强制视频、误触诱导、声音自动播放。
- 展示位：完局页下方 1 个 + 门户信息流 1 个 + 桌面侧栏 1 个（移动端不做锚定底栏，首批从简）。
- 激励视频仅两种兑换：① 提示/透视（DG-1/2/4/6/7 各自定义）；② 连胜补签（矩阵级，1 次/月）。不提供「看广告复活改成绩」破坏公平的兑换。
- 平台分发版本（Poki/CrazyGames）按平台 SDK 规范替换广告层；自有站缺口期用占位广告位（一页纸资源清单）。
- 预留「去广告」轻内购（$2.99，LemonSqueezy）开关，首批不上线（遵循「支付暂缓」原则，等老板重新要求）。

---

## 3. MVP 边界与非目标（矩阵级）

**MVP 必须有**：8 款游戏每日可玩闭环（每日题/连胜/分享）、统一门户与完局导流、移动端优先、<2s、每游戏 SEO 落地页、展示广告位占位、DG-3/5/8 的每日分布百分位。

**明确非目标（本期不做）**：
- 不做强制账号/邮箱注册（云同步用匿名同步码）。
- 不做买量投放；不做微信小游戏/Steam/iOS 版本（后续阶段另立项）。
- 不做多人实时对战、好友系统、聊天。
- 不做重美术/3D/长篇内容；不做 IAP 数值运营盘。
- 不做完整反作弊（每日游戏行业惯例：分享可造假不影响生态）。
- 不做多语言（英文 only；国际化架构预留但不翻译）。
- DG-7 首批不开放完全自由输入审讯（引导式追问先行）。

---

## 4. 每款游戏用户故事与验收标准

> 通用验收（全部游戏适用，逐条对照用）：
> - [AC-G1] 移动端 375px 竖屏可完整游玩，触控目标 ≥44px，无横向滚动。
> - [AC-G2] 首屏可交互 <2s（Lighthouse 移动模拟，CI 把关）。
> - [AC-G3] 当日题全球一致（UTC 题号）；本地倒计时正确；跨零点开局不换题。
> - [AC-G4] 完局后连胜/统计正确累计并持久化；清缓存有同步码可恢复（若已开启同步）。
> - [AC-G5] 分享文本一键复制/系统分享，包含题号+成绩+emoji 矩阵+链接，无答案剧透。
> - [AC-G6] 完局页展示交叉导流推荐位且可跳转。
> - [AC-G7] 无插屏/无自动播放广告；广告位不遮挡玩法区域。

**DG-1 WordBridge**
- 故事：作为通勤玩家，我想在 3 分钟内完成今日分组并把彩色矩阵发到群里，证明我猜到了隐藏暗线。
- 验收：① 16 词 4 组正确分组判定无歧义（每组唯一归属，题库校验器保证）；② 错 4 次游戏结束并展示答案与暗线；③ 「差一个」提示在恰有 3 词正确时出现；④ 暗线猜测入口在 4 组完成后出现，猜中分享文案追加 🔗；⑤ archive 页可玩任意历史题但不计连胜。

**DG-2 Numlock**
- 故事：作为数独爱好者，我想每天解一道保证纯逻辑可解的消除题，并和同事比用时。
- 验收：① 每日题有且仅有唯一解（生成器+求解器双向验证，CI 抽检 30 天题）；② 行/列和实时更新、达成时高亮；③ 误触可撤销（无限步 undo）；④ 完成时间入分享文案；⑤ 周一至周日难度参数按 §1 曲线生效。

**DG-3 DropStack**
- 故事：作为 Suika 老玩家，我想和全球玩同一条序列，看自己分数排到百分之几。
- 验收：① 同日任意两台设备序列与物理表现一致（确定性回放测试）；② 50 次掉落后强制结算；③ 分数提交后返回百分位；④ 断线/刷新可恢复局中状态；⑤ 物理帧率在中端手机 ≥50fps。

**DG-4 BorderRush**
- 故事：作为地理迷，我想用最少步数连通两国，并在猜错时得到方位线索而不是干瞪眼。
- 验收：① 邻接判定与数据集一致（含桥隧规则，数据源注明）；② 猜测国家自动补全（输错拼写容忍）；③ 🟩/🟨/🟥 反馈规则正确（在最短路/可行/不接壤）；④ 2 次「透视相邻国」提示可用且入分享统计；⑤ 结算页展示最短路径对照图。

**DG-5 EpochLens**
- 故事：作为历史爱好者，我想每天看 5 张老照片猜年代，并学到一条冷知识发给朋友。
- 验收：① 年代/地点双输入一屏完成，滑杆触控可用；② 计分公式（年代误差+地点距离）与规则页一致；③ 每张揭晓页含来源署名与冷知识一句话；④ 5 张流程 <5 分钟可完成；⑤ 所有图片有 PD/CC 授权记录（合规审查材料）。

**DG-6 GridSpark**
- 故事：作为 LinkedIn Queens 玩家，我想不登录任何账号就玩到同样爽的每日一题并跟朋友比速度。
- 验收：① 每日题唯一解且纯逻辑链可解（SAT 校验入管线）；② 冲突（同行/列/区/相邻）实时红标；③ 计时从首次交互开始、作弊性刷新不清零；④ 练习模式与每日模式分离（练习不计连胜）；⑤ 色弱模式下所有色区可区分（纹理叠加）。

**DG-7 Interrogate**
- 故事：作为推理迷，我想每天审一起新案子，用有限的提问拆穿说谎的嫌疑人，并把「7 问破案」战绩发出去。
- 验收：① 每日案件剧本完整（人物/时间线/凶手/2+ 可发现矛盾点），复盘页与剧本一致；② 审讯回答不泄露剧本外事实、不直接认罪（越狱测试集通过）；③ 提问预算扣减与 🟦/⬜ 有效性判定符合规则说明；④ 指认后展示真相时间线；⑤ 单用户单案 LLM 调用成本 ≤$0.01（缓存命中率报表验证）；⑥ 输出内容过滤（无血腥细节分级越界）通过合规抽查。

**DG-8 InfiniteAlchemy Daily**
- 故事：作为 Infinite Craft 玩家，我想每天有个目标词挑战最少步数，而不是在沙盒里漫无目的。
- 验收：① 每日目标词可在 ≤12 步内达成（排期时验证机可达）；② 相同配方全球返回相同结果（共享缓存命中）；③ 步数记录与分享百分位正确；④ 首个发现冠名正确归属且可过滤脏词；⑤ 沙盒模式与每日模式数据互通（已发现元素共享）；⑥ 单日 LLM 成本随 DAU 次线性增长（缓存设计验证）。

---

## 5. 上线优先级排序

**首批 3 款（M1，2 周内随门户上线）：DG-1 WordBridge、DG-2 Numlock、DG-8 InfiniteAlchemy Daily**

理由：
1. **品类容量优先**：DG-1 落在被验证的最大品类（Connections 900 万 DAU、Wordle 1200 万 DAU），SEO 外溢需求（unlimited/archive）现成可吃——矩阵需要一个「大门游戏」拉新。
2. **速度与确定性**：DG-1/2 均为 S 复杂度纯前端，2 周内两款可玩没有技术风险，保证 M1 里程碑「门户+3 款+管线通」兑现。
3. **差异化旗舰**：DG-8 复用 G2 craft 底座与 DeepSeek relay，M 复杂度可控，且是三款中唯一 AI 原生——首批即立「别家没有」的招牌，配合 Infinite Craft 既有巨大流量做 SEO 截流（`infinite craft daily challenge` 类词）。
4. **风险错峰**：最重的 DG-7（L，含 LLM 安全工程）与有版权工作量的 DG-5 放二批，避免拖累 M1；DG-3 排行榜后端、DG-4 数据集制作与二批一起进行。

**二批 5 款（M2，第 4-5 周全量上线）**：DG-6 → DG-3 → DG-4 → DG-5 → DG-7（组内顺序按复杂度递增排产；DG-7 最后压轴并预留安全测试时间）。

**上线后（SOP-05）**：按 4 周数据（D7 留存、分享率、会话时长）砍差留优——表现后 1/4 的游戏停止迭代，资源集中到头部 2 款加深内容（一页纸风险 ② 组合策略）。

---

## 6. 依赖与交接

- spec-writer：将本 PRD §1/§2 转成工程 spec（每日种子协议、统计/同步数据模型、分享组件接口、各游戏状态机）。
- tech-lead：monorepo 架构 ADR（共享 packages：daily-seed / stats / share / ui）、确定性物理与 LLM 缓存 PoC 先行（SOP-01 阶段 2）。
- ui-designer + ux-researcher：门户+首批 3 款设计稿先行，统一设计语言（深浅双模式）。
- compliance-counsel：DG-5 图片授权流程、DG-7 内容安全基线（阶段 5 前介入）。
- 外部资源：无新增（沿用一页纸清单：AdSense/平台开发者账号/zalize.com 域名），不阻塞开工。

---

## 附录 D：选品补充证据（product-manager 于 2026-07-31 经 Brave Search 采集，均当日可打开）

- **D1 词类品类容量**：Connections 日活 900 万+ https://wordsrated.com/guides/nyt-connections-statistics/ ；Wordle Q2-2025 约 1200 万 DAU https://electroiq.com/stats/wordle-statistics/ ；NYT Games 整体数据 https://en.wikipedia.org/wiki/The_New_York_Times_Games
- **D2 需求外溢（unlimited/archive 生态）**：https://www.connectionsunlimited.org/ 、https://connectionsplus.io/nyt-archive 、「Wordle Unlimited」相关词月搜 110 万+（站方口径，方向性参考）https://www.todayswordle.org/wordle-unlimited
- **D3 数字/逻辑**：Nerdle 3 周 100 万玩家（官方）https://nerdlegame.com/hq/nerdle-story.html ；Sumplete 病毒事件报道 https://gizmodo.com/suplete-openai-chatgpt-ai-sudoku-puzzle-1850207085 、https://www.businessinsider.com/sudoku-like-puzzle-game-online-chatgpt-sumplete-2023-3
- **D4 合成/物理**：Suika 1300 万+ 下载（官方 App 文案）https://apps.apple.com/us/app/suika-game/id6741622025 ；Switch 端 400 万里程碑 https://www.vg247.com/watermelon-game-aka-suika-popular-nintendo-switch-download-milestone ；web 克隆生态 https://suikagame.io/
- **D5 地理与年代**：Worldle 本体 https://worldle.teuteuf.fr/ 与克隆生态（worldle.online / worldlegame.io）；Travle https://travle.earth/ 与 r/geography 高热帖 https://www.reddit.com/r/geography/comments/12tkkxi/ ；TimeGuessr（App+付费去广告层）https://play.google.com/store/apps/details?id=com.timeguessr.app ；每日游戏聚合站佐证用户「每日多游戏轮换」习惯 https://dles.gg/game/chronophoto
- **D6 图形推理与低分高需求**：LinkedIn Games 报道 https://ftw-eu.usatoday.com/story/entertainment/pop-culture/2025/01/21/linkedin-daily-games-queens-tango-crossclimb-pinpoint/77845722007/ ；LinkedIn 官方游戏页 https://www.linkedin.com/games ；Nonogram.com 最新 100 条评论 52% 为 1-3 星（广告/误触抱怨）https://appcustomerservice.com/app/1452992954/nonogram-com-number-games
- **D7 每日推理**：Clues by Sam 媒体背书 https://aftermath.site/clues-by-sam-wordle-daily-puzzle-game/ ；Murdle 出版现象（National Bestseller / Sunday Times #1）https://murdle.com/ 、https://www.publishersweekly.com/pw/by-topic/childrens/childrens-book-news/article/96378-a-case-of-murdle-little-brown-releases-children-s-books-based-on-online-puzzle-sensation.html
- **D8 LLM 合成**：Infinite Craft 峰值日 3 亿合成（报告 C [S7]）https://en.wikipedia.org/wiki/Infinite_Craft ；官方双端 App https://apps.apple.com/us/app/infinite-craft-by-neal/id6499235533 ；克隆/SEO 截流生态 https://infinitecraft-game.io/
- **D9 摸鱼场景关键词**：「games to play at work」内容生态常年产出（frvr.com/gamezipper/solitaire.com 2026 年仍在发文），报告 C §2B 同证。

> 证据强度说明：D1/D3/D4/D7/D8 有官方或权威媒体一手数据（高置信）；D2 搜索量为第三方站点口径（中置信，方向性使用）；D5/D6/D9 为竞品存在性+生态观察（中置信）。所有「差异化点」均基于可复核的竞品现状描述，无拍脑袋项。
