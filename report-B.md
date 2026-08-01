# 调研报告 B：游戏赚钱的渠道与打法（变现模式 × 发行渠道 × 从 0 到第一笔收入路径）

- 调研人：market-researcher（子会话）
- 日期：2026-07-31（文中所有时效数据均为此日采集）
- 决策用途：支撑「公司以 Web 技术栈 + 近乎免费的并行开发人力做游戏赚钱」的渠道与变现选型
- 方法：按 SOP-02，官方文档/一手数据优先，关键数字尽量双源交叉，结论标注置信度（高/中/低）与事实/推断

## 一、结论前置（建议）

1. **首选打法：Web 游戏平台（Poki/CrazyGames）+ 广告分成**。零发行成本、平台自带流量（Poki 月活 1 亿）、纯 Web 技术栈完全对口、可大规模并行试错——与本公司能力模型匹配度最高。建议立即启动「每 2-4 周一款小游戏、批量提交」的流水线。（置信度：高）
2. **次选：微信小游戏 IAA（激励视频广告）**。老板在国内、主体资质可办；平台 2026 年激励政策对 IAA 极其慷慨（买量新增用户 1-30 天广告流水 40% 返还、单日 200 万内广告收入开发者拿 70%），且休闲品类与 Web 技术栈（微信小游戏本质是 JS/Canvas）兼容。但需国内软著+版号合规成本（IAA 无内购可规避版号，见附录 A3）。（置信度：中高）
3. **Steam 买断制作为第三条线、但不作为首收入来源**：2024 年 Steam 全年约 1.8 万款新游中，能赚超过 $500 的只有约 36%，独立游戏收入中位数仅 $1.6 万且头部 10% 拿走 85% 收入；需要 5-7k 愿望单才能进「热门即将推出」获得平台流量，冷启动周期 6-12 个月。适合在前两条线跑出被验证好玩的玩法后，再移植加料上 Steam。（置信度：高）
4. **不建议现在做**：买断制手游、订阅制游戏、重度 IAP 游戏（需长线运营与买量资金盘）、iOS 付费下载（获客贵、审核慢，另一位调研员的平台报告应有详述）。（置信度：中）
5. **共性规律（来自 2024-2026 复盘样本）**：小团队成败的第一变量不是开发质量而是**品类选择与可发现性**；「3 个月内可完成 + 已验证品类微创新 + 上线后按数据迭代」是幸存者共同路径；「闷头做 1 年以上 + 上线才做营销」是失败者共同路径。（置信度：高）

## 二、变现模式对比（问题 1）

| 模式 | 关键数据（采集 2026-07） | 适合类型/量级 | 对本公司 |
|---|---|---|---|
| 广告-激励视频 | 移动端美国 eCPM 约 $16-20（Android $16.49 / iOS $19.63），Tier-1 区间 $10-50；Web/H5 端网络均值约 $3.6-7（Tier-1）[A1][A2] | 休闲/超休闲/roguelite，需高日活；opt-in 完成率 95%+，留存友好 | ★★★ 首选，配合 Poki/微信自带流量 |
| 广告-插屏 | 美国约 $14（移动），2025Q4 iOS 插屏 eCPM 普跌 14-35%[A1][A2] | 关卡制休闲游戏过场 | ★★ 辅助格式 |
| 广告-Banner | $0.5-1.5，持续走弱[A1] | 仅作补充 | ★ |
| IAP 内购 | 商店抽成 15%（Apple SBP / Google 首 $1M）[A6]；微信安卓单日 200 万内开发者 60%+ 激励[A3] | 有长线留存的中重度游戏；需运营与数值团队 | ★★ 中期（混合变现里做轻 IAP：去广告/皮肤） |
| 买断制 | Steam 抽 30%；2024 独游收入中位数 $16k，F2P 中位数 $26k；愿望单→首周销量中位转化 0.2x[A4][A5] | 有明确 hook 的精品单机，8k+ 愿望单起步 | ★★ 第三条线 |
| 订阅 | 商店订阅抽成 15%（Google 全员/Apple 次年起）[A6] | 工具化游戏服务（如棋类训练），纯游戏极难 | ★ 暂不做 |
| 混合变现（广告+轻IAP） | 行业主流：2026 年 Sensor Tower 报告显示头部手游普遍广告+IAP 双轨[A2] | 休闲游戏标配：激励视频为主 + 去广告买断 $2.99 | ★★★ 目标形态 |

小团队真实收益锚点（事实）：Poki 官方称部分开发者仅广告年入 $100 万、土耳其 2 人团队 Emolingo 靠 8 款 H5 游戏（每款开发约 3 个月，日均 80 万次游玩）养活 5 人全职团队[A7]；Steam 端 solo 开发者《Only Way is Down》首作 10 个月净入 $4.1 万（1.78 万愿望单开局）[B2]，《Gods vs Horrors》1.5 年做出售 $2.5 万+、不及机会成本[B1]。

## 三、发行/流量渠道拆解（问题 2）

**1) Web 游戏平台（Poki / CrazyGames / Coolmath 等）**——提交流程：注册开发者后台→接 SDK→Basic Launch 小流量测试（CrazyGames 为 2 周有限流量、无变现）→数据达标进 Full Launch 全球发布并开启广告分成[A8]。分成：均为「按游戏产生的广告收益分成」模式，具体比例不公开、按月结算；CrazyGames 提供「2 个月独占换 +50% 分成」选项[A9]。Poki 月活 1 亿、600+ 开发者伙伴[A7]。核心指标是会话时长（Poki 称成功游戏 11-20 分钟/次）。**零成本、平台分发、纯 Web——最匹配。**

**2) 微信小游戏**——2026 年 IAA 激励：买量（腾讯广告+外部应用）带来的注册用户，开发者可选「1-30 天广告流水 40%」或「1-90 天 35%」激励；现金分成为单日广告收入 200 万内 70%[A3]。IAP 激励：首发新游「首 1000 万流水不分成」（40% 激励金）[A3b]。创意小游戏认证：玩法/美术/剧情/音乐高创新可申请，获创意标识+分成加成+抄袭保护[A3c]。买量生态成熟（2026 年前 5 月大盘消耗同比 +26%、注册成本 -12%[A10]），但 IAA 买量本质是「eCPM×LTV > CPA」的套利，起步应先做自然量+激励政策，不碰付费买量。门槛：需国内主体、软著；纯 IAA 无内购可不办版号（行业通行做法，政策有收紧风险，标注：未验证充分）。

**3) Steam**——机制：约 5-7k 愿望单进「热门即将推出」栏（Zukowski，GDC2026）[A11]；愿望单→首周销量中位转化 0.2x[A5]；Next Fest 每游戏只能参加一次，demo 是核心获客物料，近期数据显示「节前两周动量」比存量愿望单更影响爆发[A12]。$100/款上架费，抽成 30%。

**4) App Store / Google Play**——小额开发者实际抽成 15%（Apple 小企业计划/Google 首 $1M）[A6]。ASO+编辑推荐是仅有的免费流量，但 2024+ 自然量极少，休闲游戏没有买量预算基本无法冷启动（推断，置信度中高）。优先级低。

**5) itch.io**——0-100% 自定义分成（默认 10%）；绝大多数游戏终身收入 <$100，适合当免费测试场与 jam 社区，不适合当收入渠道[A13]。

**6) 内容引流（TikTok/YouTube/小红书）与社区（Reddit/Discord）**——《Only Way is Down》实测：Reddit > TikTok > YouTube 引流效果，Reddit 广告 CPW（单愿望单成本）$2.95 偏贵，自然帖效果远好于投放[B2]。可复用打法：短视频拍「游戏最抓眼球的 5 秒」；Reddit 在 r/WebGames、r/incremental_games 等品类版发可玩链接（Web 游戏点开即玩，转化链路最短——这是 Web 平台的独有优势）。

## 四、三条从 0 到第一笔收入的路径（问题 3）

**路径 1（主推）：Poki/CrazyGames × 休闲 H5 × 广告分成**
- 打法：并行开发 3-5 款已验证品类的微创新休闲游戏（io 类、obby、合成、放置），每款 2-4 周；接 CrazyGames SDK 走 Basic→Full Launch，同时投 Poki；用平台数据（会话时长/留存）筛出最好的一款持续加内容。
- 获客：平台自带分发为主，Reddit 品类版 + 短视频为辅。
- 时间线：第 1 款提交后 4-8 周内可产生首笔广告分成。
- 预期收入：单款首年 $500-$5,000（大多数）；跑出爆款（千万次游玩级）$5 万-$100 万/年[A7][B3]。
- 依据：Emolingo 案例（3 个月/款、2 人起步）与本公司「并行产出+Web 栈」几乎同构；边际成本近零，用数量换命中率。

**路径 2：微信小游戏 × IAA 休闲/放置 × 激励视频**
- 打法：把路径 1 中数据最好的玩法本地化移植成微信小游戏（同为 JS，复用度高）；主体资质与软著并行办理（资源缺口按 CHARTER 提前向老板申报：国内公司主体、软著申请）；先吃自然量+首发激励，验证 LTV 后再小额买量。
- 时间线：资质 4-8 周 + 移植 2 周；上线后 1-2 个月首笔广告分成。
- 预期收入：无买量情况下单款 ¥1k-3 万/月（长尾常态）；买量 ROI 跑正后可放大至 ¥10 万+/月（需资金与投放能力，标注推断，置信度中）。
- 依据：2026 平台激励（70% 分成+40% 买量返还）是全渠道对小团队最慷慨的现金政策[A3]；老板在国内，合规与收款可行。

**路径 3：Steam × 有 hook 的精品小品 × 买断 $5-10**
- 打法：从路径 1/2 中选被数据验证「有人反复玩」的玩法，加深做 3-5 小时内容的 Steam 版；上线 Steam 页后 6 个月攒愿望单（短视频+Reddit+Demo），在最后一次 Next Fest 前两周集中造动量[A12]，目标 7k+ 愿望单再发售。
- 时间线：9-12 个月到首笔收入（最慢）。
- 预期收入：达到 7k 愿望单约首周 1,400 销量 ≈ $7-10k 毛收入（0.2x 中位转化）[A5]；失败模式是 <1k 愿望单发售，收入 <$500（36% 概率不足 $500[A4]）。
- 依据：Steam 单价与长尾最高，但可发现性成本也最高，故必须用前两条线「先验证再投入」，而非直接赌。

**总排序依据**：三条路径按「与现有能力匹配度 × 到首笔收入时间 × 失败成本」排序；路径 1 三项全优，且其产出物是路径 2/3 的输入（玩法验证），形成漏斗而非三线并赌。

## 五、2024-2026 复盘的共性规律（问题 4）

成功样本：Balatro（solo，2024 年 $2,800 万+）[A4]、《Only Way is Down》（solo 首作 $4.1 万净入：上线前 12 个月持续发短视频/Reddit，1.78 万愿望单开局）[B2]、Emolingo（H5，2 人→5 人全职，每款 3 个月）[A7]、A Difficult Game About Climbing（蹭已验证品类「受苦攀爬」，$130 万）[B4]。
失败样本：Void Climber（团队首作，Next Fest demo 中位游玩仅 12 分钟即预示失败，最终售 46 份；教训「数据早就说了不行但没止损」）[B4]、Comet Rogue（solo 二作，比一作做得更好却只售 62 份：无launch折扣、只参加一次festival、忽视营销）[B5]、Gods vs Horrors（1.5 年 $2.5 万，「品类晚了 6 年」+中文本地化差导致 70% 差评率）[B1]。

**提炼的五条规律**（均为多案例归纳，置信度高）：
1. **品类即命运**：进入「已验证需求但供给未饱和」的品类（受苦游戏、放置、模拟器）远胜原创玩法赌博；品类过气 6 年再进场必败[B1][B4]。
2. **早期数据是最便宜的止损器**：demo 中位游玩时长、Basic Launch 留存等指标在投入大成本前就能预判成败——小成本快速测试、不行就砍，是小团队相对大厂唯一的结构性优势[B4][A8]。
3. **营销从写第一行代码那天开始**：成功者上线前 6-12 个月持续发内容攒愿望单/粉丝；失败者「先做完再宣传」[B2][B5]。
4. **收入服从幂律，用作品数量对冲**：Steam 头部 10% 拿走 85% 收入[A4]，itch 多数游戏 <$100[A13]——多款小成本作品的期望收益与方差都优于一款大作，这正是本公司并行人力的用武之地。
5. **平台分发型渠道（Poki/微信）对无粉丝新团队的期望收益 > 自获客型渠道（Steam/App Store）**：前者上线即有流量按质量分配，后者流量需自带[A7][A3] vs [A4][A5]。

（正文完，约 2,950 字）

---

## 附录：来源清单（全部于 2026-07-31 验证可打开）

**A. 数据与官方来源**
- [A1] Applixir《Web Rewarded Video 2026 中期报告》（US 激励视频 eCPM $16-20，Web 端 $3.6-7）：https://www.applixir.com/blog/web-rewarded-video-ad-performance-in-2026-the-mid-year-verdict/ ；交叉源 Playio（Android $16.49 / iOS $19.63，Tier-1 $10-50）：https://blog.playio.co/rewarded-ad-benchmarks-2026
- [A2] Bidlogic 2025Q4 移动 eCPM 季度分析（激励视频稳、iOS 插屏跌 14-35%）：https://bidlogic.io/2026/01/30/what-happened-to-mobile-app-ecpms-in-q4-2025/ ；Sensor Tower 2026 广告变现报告（摘要）：https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization
- [A3] 微信官方《2026 年小游戏广告变现激励政策》（买量注册用户 1-30 天广告流水 40% 激励；单日 200 万内 70% 现金分成）：https://developers.weixin.qq.com/minigame/introduction/commercialization/guide/ad-monetization.html
- [A3b] 微信官方《2026 年虚拟支付激励政策》（首发新游首 1000 万流水不分成）：https://developers.weixin.qq.com/minigame/introduction/commercialization/guide/virtual-payment.html
- [A3c] 微信创意小游戏申请指引：https://game.weixin.qq.com/cgi-bin/h5/static/minigame/creative/guidelines.html
- [A4] 《2024 Indie & AA Games Market》（5,773 款数据：中位收入、top10% 占 85%）：https://opgamemarketing.substack.com/p/the-2024-indie-and-aa-game-market
- [A5] GameDiscoverCo 2024 愿望单转化调查（中位 0.2x）：https://newsletter.gamediscover.co/p/revealed-the-state-of-steam-wishlist
- [A6] Apple 小企业计划（15%）：https://developer.apple.com/app-store/small-business-program/ ；Google Play 服务费（首 $1M 15%）：https://support.google.com/googleplay/android-developer/answer/112622?hl=en
- [A7] Poki 官方案例 Emolingo（2 人团队、每款 3 个月、日均 80 万次游玩）：https://poki.com/blog/how-emolingo-games-built-business-html5-web-games-poki ；PocketGamer 采访（1 亿月活、部分开发者广告年入 $100 万）：https://www.pocketgamer.biz/inside-pokis-vision-for-the-future-of-browser-gaming/
- [A8] CrazyGames 提交流程（Basic/Full Launch）：https://docs.crazygames.com/
- [A9] CrazyGames 开发者条款 2025-08（月度广告分成 + 2 个月独占 +50%）：https://files.crazygames.com/documents/developer_terms_20250818.pdf
- [A10] GameLook：腾讯 2026 小游戏开发者大会 IAA 买量洞察（大盘消耗 +26%、注册成本 -12%）：http://www.gamelook.com.cn/2026/06/594583/
- [A11] Chris Zukowski GDC2026 访谈（5-7k 愿望单进 Popular Upcoming）：https://www.youtube.com/watch?v=M3uQrwcJaMQ
- [A12] How To Market A Game：Next Fest 动量研究（2026-07）：https://howtomarketagame.com/2026/07/14/games-that-used-momentum-for-steam-next-fest-success/
- [A13] itch.io 收入分布指南（多数 <$100）：https://generalistprogrammer.com/tutorials/how-to-make-money-on-itchio-indie-game-guide ；itch 官方博客：https://itch.io/blog/739313/how-many-games-would-i-need-to-sell-to-do-it-for-a-living

**B. 复盘案例（2024-2026）**
- [B1] Gods vs Horrors 复盘（1.5 年、$25k、品类过气教训）：https://oriolcosp.com/gods-vs-horrors-post-mortem/
- [B2] Only Way is Down 复盘（solo 首作净入 $41k、Reddit>TikTok>YouTube）：https://onlywayisdown.com/post-mortem/
- [B3] itch 收入分层表（$0-50/月占 ~80%）：同 [A13]
- [B4] Void Climber《Why Our Game Flopped》（售 46 份；含 2024 攀爬品类对比数据）：https://9000.to/p/why-our-game-flopped-part-1
- [B5] Comet Rogue 复盘（售 62 份、无折扣/营销教训）：https://antiquegeargames.com/2025/04/15/comet-rogue-postmortem-a-successful-failure/

**风险与未验证项**
- 微信「纯 IAA 免版号」为行业通行做法而非成文豁免，政策收紧风险存在（未验证，需 compliance-counsel 复核）。
- Poki/CrazyGames 具体分成比例不公开，按月由平台按流量/广告表现计算（事实，但数值不可事前锁定）。
- eCPM 数据随季节波动 ±20-30%（Q4 高、Q1 低），预测收入时应取保守值。
