# TREND-REPORT-001：游戏趋势与选题报告（第一期）

- 角色：market-researcher（趋势研究员，常设）
- 日期：2026-08-01（数据采集日，时效敏感数据均为当日抓取）
- 决策用途：为 Daily Games 矩阵（https://daily.zalize.com/ ，现有 8 款）确定下一批立项选题，支撑 Poki/CrazyGames 分发 + SEO + 广告变现的增长目标
- 遵循：CHARTER.md、SOP-02（调研）、SOP-04（汇报）

---

## 【结论】

当前网页游戏最确定的三条上升曲线是：①「brainrot/梗文化」品类正从 Roblox 溢出到网页端（Poki/CrazyGames 新榜均已出现多款蹭该 IP 的游戏）；②「短循环+可炫耀」的日更谜题与一键小游戏仍是 TikTok/Reddit/HN 的传播主力，且 AI 对手/AI 裁判成为新的差异化钩子；③ idle/clicker 与 merge 合成类在 CrazyGames 新榜密度极高，是平台侧明确吃量的品类。建议本期立项 5 个选题（详见第 4 节），优先级：T1 音乐猜歌日更 > T2 AI 押注竞猜 > T3 物理解压玩具 > T4 每日经营挑战 > T5 每日 OSINT 侦探。如无异议将按此排序进入 SOP-01 立项。

---

## 1. Poki / CrazyGames 榜单扫描（证据：2026-08-01 抓取）

### 1.1 CrazyGames 新游榜（/new，前 70 款按品类统计）

抓取自页面结构化数据，样本 70 款，品类分布：**Puzzle ≈ 13、Arcade ≈ 17、Clicker/Idle ≈ 6、Action ≈ 7、Simulation ≈ 5、Strategy ≈ 4、Sports ≈ 4**，其余为 Adventure/Driving/Board/Word。可观察到的模式：

1. **Idle/Clicker 高密度**：新榜 70 款里 6 款纯 Clicker（Idle Dairy Tycoon、Train Miner、Card Billionaire、Need for Sheep、100 Million Clicks Together、Smashing Bottles）+ 多款 idle 混合（K-Pop: Dimension Slayer - Idle RPG、Idle Car Service）。平台明显持续收此类量。
2. **Hexa/方块消除 + Merge 合成**：Hexa Stack（同时进入热榜）、Hexa Fill Puzzle、Wood Hexa Factory、Merge Haven、Merge and Play、Monster Merge Battle 3D、Dig Drop Merge、DropTen——「俄罗斯方块系 + 合成系」是新游供给最密集的赛道。
3. **brainrot 梗品类上探网页端**：新榜有 Collect Brainrot Arena、Obby Memes Grow Fruits；热榜有 Infinite Brainrot: Craft Merge；Poki 首页有 Steal a Brainrot 网页版。源头 Roblox《Steal a Brainrot》2026-07 仍日均 CCU 20 万+、单日新增访问 4000 万+、估算日流水 $330K+（profitable.app，2026-07-21），2025-10 曾创 25.8M 同时在线的全平台纪录（lootbar.com 综述）。**梗文化流量正在被网页端二次收割**。
4. **Obby（Roblox 跑酷移植风）持续霸榜**：新榜/热榜合计 6+ 款 Obby 系（Obby: Pull a Sword、Obby: Ragdoll Boxing、Obby: Dig Down 等），与 brainrot 同属「Roblox 文化外溢」。
5. CrazyGames 站内新增「**Thinky（思考解谜）**」「5-minute fun」「Train your brain」等编辑化分类，说明平台在主动运营轻脑力短会话内容——与我们的 daily puzzle 定位吻合。

### 1.2 Poki 新游/首页（/en/new + 首页，2026-08-01）

新游列表前 50 款中可见聚类：**装扮/化妆/整理类**（fashion-fix-studio、fashion-dress-up-star、dress-up-party、clean-house、happy-tidy-time、snapstyle-dress-up、nails-diy-manicure-master 等 ≥8 款，女性/青少年向吃量明显）、**体育**（soccer-league、soccer-real、soccer-5、penalty-shooters-2，逢世界杯年）、**merge/物理**（planet-merge、stickman-merge、watermelon-drop、ball-vs-block）、**梗与整蛊**（steal-a-brainrot、level-devil、escape-from-scary-teacher、trapped-in-the-dollhouse）。Poki 长青位仍是 Subway Surfers / Retro Bowl / Monkey Mart / Drift Boss 一类「一键上手、无限重开」结构。

### 1.3 平台技术风向（Poki 官方博客，2026-06-05）

Poki 工程负责人 Erik 访谈：WebGPU 设备覆盖已达 Poki 玩家的 ~68%，预计 2026 年底接近全覆盖；**竖屏/移动优先已是默认要求**；加载体积是转化率第一杀手（Unity 大包劣势，轻量 HTML5/Canvas 优势）。来源：https://poki.com/blog/building-web-browser-games-2026 。我们 Svelte+Cloudflare 的轻量栈在加载速度上是结构性优势（事实，置信度高）。

## 2. 病毒式传播案例拆解（Reddit / HN / TikTok，近 4 个月）

| 案例 | 渠道与数据 | 传播钩子拆解 |
|---|---|---|
| Center This Div（把 div 居中到 0.0001px） | r/webdev 单帖 134K 浏览/265 赞，14 国上榜，0 人通关（作者复盘，2026-04） | ①职业梗（开发者共鸣）②「不可能任务」+全球排行榜 ③反作弊攻防成为二次话题 |
| Firewood Splitting Simulator（劈柴模拟） | HN 首页 ~600 分（2026-06） | ①单一动作+物理/音效解压（ASMR）②零门槛零目标 ③技术人围观实现方式形成讨论 |
| Brush Jjaemu（给橘猫梳毛，梳快了被咬） | itch.io，多家媒体报道（Dexerto/realhacker.news，2026-04） | ①萌+惊吓反差 ②「You Died」梗 ③失败瞬间天然适合短视频截取 |
| 67 Speed（拼手速计数） | TikTok #67speed 标签 230 万+ 视频，DAU 6 天从 1.2 万→34 万（官方博客，2026-01 起） | ①玩家狰狞表情+屏幕计数同框的 UGC 模板 ②CapCut 滤镜把游戏视觉语言变成通用梗 ③一键玩法 15 秒内讲完 |
| TracklistMusic（音乐猜歌） | r/WebGames 近月最高帖 264 赞 + 25 次 crosspost（reddlx 聚合） | ①听歌识曲的普适话题性 ②每日同题+分数分享 ③曲风分区触发圈层传播 |
| Linex（棋盘会反击的每日放置谜题） | HN 82 分/38 评论（2026-05） | ①「board that fights back」一句话玩法 ②移动浏览器优先 ③每日挑战留存结构 |
| Yapword / Word Here 等新一代日更词游 | Yapword：AI 对手「Yapoleon」实时嘲讽；Word Here：全球同板、3 次出词拼最高分 | **共同信号：Wordle 系进入 2.0——「AI 人格对手/裁判」与「同板竞分」取代纯猜词**（推断，置信度中高） |
| TikTok 平台面（dinogame.gg 行业综述，2026-06） | 「TikTok 已是浏览器游戏最大发现渠道」；病毒窗口 1–3 周 | 吃量三类：日更谜题（"I did mine, did you do yours?"）、idle 大数字、一键技巧游戏；5 秒演示片段 > 长实况 |

**传播钩子公式（归纳，置信度高）**：`5 秒能看懂的单一动作 × 强烈情绪瞬间（惊吓/爽感/挫败梗） × 可分享的成绩凭证（emoji 网格/排行榜/表情同框）`。我们已有 8 款均具备第三项，普遍缺第二项的「短视频可剪性」。

## 3. 我方现状对照

现有 8 款（daily.zalize.com）：WordBridge（词组分组）、Numlock（数独变体）、InfiniteAlchemy（AI 合成）、GridSpark（星星放置）、BorderRush（地理接壤）、DropStack（物理合成）、EpochLens（历史照片）、Interrogate（AI 审讯）。品类覆盖：词/数/逻辑/地理/历史/物理/AI×2。技术底座：Svelte + Cloudflare Pages/Workers + LLM relay（DeepSeek 等），日更 seed 全球同题、免账号、emoji 分享——**留存结构成熟，但缺少：音乐/听觉品类、竞猜对抗结构、解压/梗向的短视频素材型玩法**。

## 4. 选题建议（5 个，按优先级排序；如无异议按此执行）

### T1《TrackGuess》—— 每日音乐猜歌（S/M：M）
- **一句话玩法**：每天 5 段渐长的歌曲片段（hook 逐秒放开），越早猜中得分越高，emoji 网格分享；按年代/曲风开分区日题。
- **竞品与流量证据**：TracklistMusic 为 r/WebGames 近月最高帖（264 赞+25 crosspost）；前辈 Heardle 曾被 Spotify 收购后关停，需求真空至今存在；SongTrivia/BandleGame 长尾稳定。音乐是 TikTok 原生话题，剪辑素材天然合规痛点需注意（见风险）。
- **差异化钩子**：LLM relay 生成「AI DJ 毒舌点评你的猜歌历史」（对标 Yapword 的 AI 人格路线）；周日「连猜 7 首接力」冲榜模式。
- **开发量**：M（核心难点是曲库版权——用 30 秒预览 API（iTunes Search API 免版权预览）或 hum/合成 riff 方案，需立项时定案）。
- **分发**：TikTok/Shorts（猜歌反应视频模板）+ r/WebGames + SEO（"music wordle""guess the song game"搜索量长期稳定）。
- **⚠️ 风险**：音频版权是唯一硬门槛，必须走官方预览接口或原创音频，法务过 compliance-counsel。

### T2《OddsCall》—— 每日 AI 押注竞猜（S/M：S+）
- **一句话玩法**：每天 10 道「你猜大多数人会怎么选/明天会发生什么」的概率题，用虚拟筹码押注，次日开盘结算，连对续 streak。
- **竞品与流量证据**：Google Trends 上 prediction market（Polymarket/Kalshi）2025-26 破圈；NYT 系没有此形态；r/WebGames 对 press-your-luck 类（5x21.com 等）持续有正反馈。
- **差异化钩子**：题目由 LLM relay 每日从新闻/常识生成 + 全体玩家真实投票数据即时形成「赔率」——玩家既是选手也是盘口，天然社交谈资。
- **开发量**：S+（一个 Worker + D1 聚合投票即可，无实时对战）。
- **分发**：HN/Reddit（数据向人群）+ SEO（"daily prediction game"）+ 站内互导。
- **⚠️ 需注意**：纯虚拟分数、不涉真钱，避免赌博合规问题；美国区措辞避开 betting 字样。

### T3《SplitIt / 解压工坊》—— 物理解压玩具 + 每日挑战壳（S/M：S）
- **一句话玩法**：单一解压动作（切/劈/捏爆，物理+音效打磨到 ASMR 级），无限模式免费玩，每日一个限定挑战关（限定次数内达成目标分）可分享。
- **竞品与流量证据**：Firewood Splitting Simulator HN ~600 分；Brush Jjaemu 全网被报道；Poki 长青位 Slice Master/watermelon-drop 同族。证明「单一爽感动作」在 HN 和分发平台双吃。
- **差异化钩子**：我们把「解压玩具」套上已验证的 daily 壳（全球同题+streak+emoji 分享），同类竞品均无留存结构；失败/爆炸瞬间设计成 15 秒可剪素材（学 Brush Jjaemu 的反差惊吓）。
- **开发量**：S（Canvas/Matter.js，无 LLM 依赖，可提交 Poki/CrazyGames 分发拿平台量）。
- **分发**：**这是 5 个中唯一主打 Poki/CrazyGames 上架的选题**（Arcade+满足其轻量/竖屏要求），TikTok 素材型。

### T4《ShelfRush》—— 每日经营挑战（S/M：M）
- **一句话玩法**：每天同一张小店布局与顾客流，50 个操作内拼最高营收（Monkey Mart 式补货/收银微操 + DropStack 式「全球同 50 次操作」竞分）。
- **竞品与流量证据**：Monkey Mart 常年 Poki 首页顶部；My Perfect Hotel、Idle Dairy Tycoon 等经营/idle 在两平台新榜热榜高密度出现；Basketball Dynasty（r/WebGames，经营 GM 类）单帖良好反响验证「无账号即点即玩的经营」需求。
- **差异化钩子**：经营类全是无限肝模式，无人做「每日限定挑战+全球同题竞分」；短会话（3-5 分钟）适配我们矩阵调性。
- **开发量**：M（Svelte 2D 网格即可，无重物理）。
- **分发**：Poki/CrazyGames（经营是其吃量品类）+ 站内矩阵互导。

### T5《ColdCase OSINT》—— 每日开源情报侦探（S/M：M）
- **一句话玩法**：每天给一张照片/一段账号痕迹，玩家像 GeoGuessr+OSINT 一样用线索推断时间/地点/人物侧写，逐条线索解锁扣分。
- **竞品与流量证据**：r/WebGames 近期「password security OSINT investigation game」获正反馈；GeoGuessr/EpochLens 证明推断类留存；我们 Interrogate 玩家画像高度重合。
- **差异化钩子**：复用 Interrogate 的 LLM 案件生成管线（边际成本最低）；「侦探宇宙」双游联动 streak。
- **开发量**：M（素材生成管线是主要工作量）。
- **分发**：Reddit（r/WebGames、r/OSINT）+ HN + 站内 Interrogate 互导。

**不建议本期做**：brainrot/Obby 蹭梗类（流量确凿但 IP 侵权与品牌调性风险高，且生命周期 1-3 周，与 daily 留存模型冲突——推断，置信度高）；.io 实时多人（服务器与反作弊成本，违背零运维底座）。

## 5. 【下一步】（无异议即执行）

1. T1-T3 三个选题各出一页纸立项书（templates/project-one-pager.md），T1 先由 compliance-counsel 出音频版权可行性结论，再定 T1/T2 谁先开工。
2. T3 同步调研 Poki/CrazyGames 开发者提交流程与收益分成（PokiForDevs / CrazyGames Developer Portal），作为矩阵接入平台分发的首个试点。
3. 为现有 8 款补「短视频可剪性」：优先给 DropStack/Interrogate 设计 15 秒高光时刻（失败爆炸/AI 嫌犯语出惊人截图卡）。
4. 本报告纳入常设机制：每 2 周更新一期 TREND-REPORT，跟踪榜单位移与选题命中率。

## 6. 【需注意】

- **音频版权（T1）**：唯一可能产生法律风险的选题，未过法务前不写一行代码。
- **数据时效**：榜单数据为 2026-08-01 单日快照，Poki/CrazyGames 无公开历史排名 API，「上升」判断基于新榜密度+社区信号交叉验证，个别单款热度为单来源（已标注），置信度中。
- **TikTok 病毒窗口仅 1-3 周**：分发策略应以 daily 留存承接脉冲流量，不追求单次爆款。

---

## 附录 A：原始数据来源

- CrazyGames 新游榜/热榜结构化数据：https://www.crazygames.com/new 、https://www.crazygames.com/hot （2026-08-01 抓取）
- Poki 新游/首页：https://poki.com/en/new 、https://poki.com/ （2026-08-01 抓取）
- Poki 官方开发者播客总结：https://poki.com/blog/building-web-browser-games-2026 （2026-06-05）
- Steal a Brainrot 数据：https://profitable.app/roblox/games/steal-a-brainrot ；https://www.lootbar.com/blog/en/steal-a-brainrot-roblox-top-charts.html
- Center This Div 作者复盘：https://github.com/raxxostudios/center-this-div/blob/main/blog-3000-attempts.md
- Firewood Splitting Simulator 报道：https://coding4food.com/en/post/firewood-splitting-simulator-ultimate-dev-procrastination-tool （2026-06-15）
- Brush Jjaemu 报道：https://realhacker.news/viral-cat-brushing-browser-game-is-as-addictive-as-it-is-terrifying/ （2026-04-17）
- 67 Speed 官方复盘：https://67speedgames.com/blog/67-tiktok-takeover/
- TikTok 浏览器游戏综述：https://dinogame.gg/blog/browser-games-on-tiktok-2026/ （2026-06-01）
- r/WebGames 近月热帖聚合：https://reddlx.com/sub/WebGames
- HN：Linex https://news.ycombinator.com/item?id=47145082 ；Borderhold https://news.ycombinator.com/item?id=47396496 ；Hormuz Havoc https://news.ycombinator.com/item?id=47729477
- Yapword：https://yapword.com/ai-word-game/ ；Word Here：https://wordhere.com/ ；Parseword 评测：https://allthingsgeek.me/gaming/parseword-review-cryptic-wordplay/
