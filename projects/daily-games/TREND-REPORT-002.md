# TREND-REPORT-002：游戏趋势与第三批选题报告

- 角色：market-researcher（趋势研究员，常设）
- 日期：2026-08-01（数据采集日；时效敏感数据均为当日抓取）
- 决策用途：Daily Games 矩阵已扩至 **12 款**（新增 BladeFlip、Heatword、HexPile、BusyBazaar 均已上线 daily.zalize.com），为第三批立项选出 2-3 个候选
- 输入材料：TREND-REPORT-001、COMPETITOR-DEEPDIVE-001、projects/clone-improve/ 四份拆解书（Slice Master/Contexto/Hexa Sort/Monkey Mart 已消化并转化为 BladeFlip/Heatword/HexPile/BusyBazaar）
- 遵循：CHARTER.md、SOP-02、SOP-04

---

## 【结论】

本周最有价值的信号是 **「群体智慧日更」品类正处于供需失衡窗口**：r/WebGames 过去 24 小时内同时出现两款「玩家群体的答案就是明日题目/对手」的新游（Hold The Line、Top 5 每日 Family Feud），品类热度刚点燃、无领跑者，且与我们「全球同题」底座天然契合。第三批推荐 3 个候选，优先级：**C1 CrowdCall（每日群体竞猜，抢窗口）> C2 SharpEye（每日找不同/隐藏物，低分高需求+AI 生图零版权）> C3 ReflexDaily（每日反应力体检，截流 humanbenchmark 月 290 万访问的老站）**。如无异议将按此顺序出一页纸立项书并进入灰盒验证。

## 1. 本周榜单与社区扫描（证据：2026-08-01 抓取）

### 1.1 Poki / CrazyGames 位移

与上期（同为 08-01 早间快照，间隔较短、位移有限）相比可确认的信号：

1. **Poki 新游榜出现 blind box/潮玩梗**：`lafufu-blind-box-dress-up`（Labubu 谐音蹭 IP）、`make-brainrots-online` 进入新榜——潮玩开盒的「变量奖励」心理机制被网页游戏借用（Labubu 2026 世界杯开幕式亮相后全球热度未退，Xinhua 2026-07-20；但盲盒 IP 生命周期已缩至 3-6 个月，需求在「开盒惊喜感」而非特定 IP）。
2. **CrazyGames 新榜结构与上期一致**：idle/clicker + hexa/merge 供给最密集（Hexa Stack 仍同时挂新榜+热榜，验证 HexPile 选题方向正确）；**隐藏物/观察类抬头**：Maldives Hidden Objects、Draw One Line、Help Me: Tricky Puzzle 等轻观察解谜持续进新榜；brainrot 网页化继续（Collect Brainrot Arena、Infinite Brainrot: Craft Merge、Rob Brainrot 2 等聚合站泛滥）。
3. 体育窗口（世界杯年）：International Cup Football 2026、Sportia Football Cup 进新榜——窗口真实但与 daily 模型和我方美术能力不匹配，本期不追。

### 1.2 Reddit / 社区热点（r/WebGames，过去 7 天）

- **群体智慧日更爆点（本报告核心发现）**：24 小时内两款同机制新游——「**Hold The Line**：每日估算题，全体玩家的群体猜测对抗一个 AI」「**Top 5**：每日 Family Feud，'survey says' 的答案来自昨天所有玩家的回答」。加上长青参照 Google Feud（猜搜索联想词，运营 10 年+），该机制 **内容自生成（玩家即出题人）、零版权、天然日更**。
- 音乐猜歌需求持续：TracklistMusic 仍是近月最高帖（264 赞+25 crosspost）、新帖「Guess the Sabrina Carpenter Song」（29 赞）——需求真实但版权结论不变（clone-improve README 已否决）。
- 其他信号：TAPZO（30 秒反应测试+挑战链接）、Tenza（每日数字）、每日估算/体检类小游戏发帖密度明显上升。
- GMTK Game Jam 2026 刚结束（22.3 万评分、1 万+ 参赛作品），未来 2-4 周 itch.io 会溢出一批可借鉴的网页玩法原型，值得下期跟踪。

### 1.3 TikTok

无新爆点级案例（上期 67 Speed 模式仍是模板）；「satisfying compilation」剪辑格式继续吃量，利好 BladeFlip/HexPile 的素材化（沿用 TREND-REPORT-001 结论）。

## 2. 第三批候选选题（3 个，按优先级；如无异议按此执行）

### C1《CrowdCall》—— 每日群体竞猜（供需失衡窗口，最高优先）
- **一句话玩法**：每天 5 道「大多数人会怎么答？」题（估算+投票两种题型），你押注群体答案的分布，次日用真实玩家数据开盘结算；你的回答同时成为明天的题目数据。
- **竞品与流量证据**：Hold The Line、Top 5 于 24 小时内先后登上 r/WebGames（品类刚起势、无领跑者=窗口期）；Google Feud 同机制运营 10 年+ 长青；NYT/LinkedIn 矩阵均无此形态。
- **改良差异点**：①「玩家即出题人」飞轮——回答池由 LLM relay 清洗聚类后自动生成次日题目，内容边际成本为零；② AI 对手人格（「你 vs 群体 vs AI」三方对比，Heatword 的 AI 点评组件直接复用）；③ 结算展示「你在人群分布中的位置」，天然分位数社交锚点（补 COMPETITOR-DEEPDIVE 第一缺口）。
- **互补性/适配度**：矩阵首个「社会认知」品类，与现有 12 款零重叠；每日制适配度满分（数据结算天然以天为单位）；零版权/资产风险；AI 差异化空间大。**冷启动是主要风险**：前 2 周答案池薄，用 LLM 合成种子分布过渡并明示「早期数据」。
- **开发量**：S+（一个 Worker + D1 聚合，无实时对战；复用 daily 壳）。

### C2《SharpEye》—— 每日找不同/隐藏物（低分高需求品类改造）
- **一句话玩法**：每天 1 张 AI 生成的精致场景图，全球同图找 8 处差异/隐藏物，用时+失误计分，emoji 网格分享；周末双图连战。
- **竞品与流量证据**：手游端 Find Hidden Objects - Spot It! 3500 万安装/月活约 200 万/月收入约 $20 万（appgoblin，2026-07）；Differences - Find & Spot It 2590 万安装。**供给端痛点**：该品类手游靠 IAP+插屏广告轰炸变现（评论区常见抱怨广告过多，Azur 同类产品因广告负担 sentiment「Mixed」，marlvel.ai 2026-04），网页端「无轰炸、免下载、每日一图」是干净的替代供给——「低分高需求」方法论的变体：**评分不低但体验税极高**。CrazyGames 新榜隐藏物类抬头（§1.1）佐证平台吃量。
- **改良差异点**：① AI 生图管线（自有资产、零版权，图像 seed 与日期绑定全球同图）；② 差异点由生成管线程序化植入（同一 prompt 两次渲染+受控编辑），人工只做质检；③ 失误惩罚做成「橘猫式」反差惊吓 15 秒短视频素材（TREND-001 钩子公式）。
- **互补性/适配度**：矩阵首个纯观察品类（EpochLens 是知识推断，不重叠）；女性/休闲向用户首次覆盖（Poki 装扮/整理类吃量人群）；每日制适配度高。**主要风险**：AI 生图的差异点质量需灰盒验证（差异太明显/太隐晦都毁体验），验收线=真人盲测 10 图 8 图「有趣且公平」。
- **开发量**：M（生成管线是主要工作量，前端本体 S）。

### C3《ReflexDaily》—— 每日反应力体检（截流老站流量）
- **一句话玩法**：每天 3 项微测试（反应/瞄准/记忆随机轮换），2 分钟出「今日脑力体检报告」，与全球当日分布对比+挑战链接单挑好友。
- **竞品与流量证据**：humanbenchmark.com 月访问 290 万、平均停留 6:33、"reaction time test" 月搜索量 9.05 万且其排名第 1（semrush，2026-06）——**单一老站垄断巨大长尾搜索、产品形态 10 年未更新（无日更/无移动优化/无社交对比）= 供需失衡**。r/WebGames 本周 TAPZO 发帖验证「挑战链接」形态有机热度。
- **改良差异点**：① 日更化+streak（老站纯工具无留存结构）；②「今日全球分布你在第 X 百分位」+ 年龄段对比（老站只有静态中位数）；③ AI 教练点评趋势（「你的反应比上周快 8ms」）。SEO 长尾（reaction time test、aim trainer、memory test…）与我方 SEO 管线匹配。
- **互补性/适配度**：矩阵首个技巧/体检品类；零版权；每日制适配中高（测试项轮换制造「今天测什么」悬念）。**风险**：搜索截流需数月 SEO 爬坡，短期靠矩阵互导；玩法本身无秘密，护城河=daily 壳+数据积累。
- **开发量**：S（纯前端计时+一个计数接口）。

**落选说明**：盲盒/开箱类（需求真实但核心是「收集资产池」，美术量 L 且无 IP 加持吸引力存疑，与 daily 短会话模型冲突）；体育窗口类（美术/玩法均非我方优势，窗口过后即死）；音乐猜歌（版权结论不变）。

## 3. 【下一步】（无异议即执行）

1. C1 直接出一页纸立项书并进入 1 周灰盒（窗口期不等待），C2 同步启动生图管线可行性 spike（3 天，产出 10 张盲测图），C3 排队。
2. 下期 TREND-REPORT-003 跟踪：GMTK Jam 溢出作品、Hold The Line/Top 5 两周后的存活与数据（验证窗口判断）、HexPile/BusyBazaar 上线后自身数据回流对照。
3. 向 qa/ux 线转发 COMPETITOR-DEEPDIVE Top10 清单中「分位数对比」组件需求——C1/C3 都依赖它，建议提级为平台组件先行开发。

## 4. 【需注意】

- **窗口时效**：C1 的判断基于 24 小时内两个同类新帖（样本小、置信度中），若 2 周后两者数据归零，说明是巧合而非趋势，届时 C2 升为首位——两条腿走路降低误判成本。
- **C2 生图质量是硬门槛**：灰盒不过线即砍，不带情绪继续投入。
- 榜单为单日快照且与上期间隔短，「位移」判断置信度低于上期；r/WebGames 信号为一手实时数据，置信度高。
- 无法律风险项；C2 需在立项书中确认生图模型的商用许可条款（compliance-counsel 例行检查）。

---

## 附录 A：本期新增数据来源

- Poki 新游榜：https://poki.com/en/new （2026-08-01 抓取；lafufu-blind-box-dress-up、make-brainrots-online 等）
- CrazyGames 新榜/热榜：https://www.crazygames.com/new 、https://www.crazygames.com/hot （2026-08-01 抓取）
- r/WebGames 实时流（Hold The Line、Top 5、TAPZO、Tenza 等）：https://reddit.com/r/WebGames （2026-08-01；聚合镜像 https://reddlx.com/sub/WebGames ）
- humanbenchmark 流量：https://www.semrush.com/website/humanbenchmark.com/overview/ （2026-06 数据）
- 隐藏物/找不同手游数据：https://appgoblin.info/apps/com.yolo.hiddenobjects ；https://www.appgoblin.info/apps/find.difference.spot.differences.hidden.puzzle.games.free ；https://marlvel.ai/intel-report/games/hidden-differences-spot-find
- Labubu/盲盒行业：http://english.news.cn/20260720/5ee4dff64d34482e85f128465f0be67e/c.html （Xinhua 2026-07-20）
- Google Feud（长青参照）：https://googlefeud.com/
- GMTK Game Jam 2026：https://itch.io/jam/gmtk-jam-2026
