# 调研报告 A：小团队做游戏，选哪类平台？（4 方向对比）

- 执行角色：market-researcher（按 SOP-02）
- 决策用途：支撑「公司进入游戏行业，做哪类平台的游戏」的方向决策
- 数据采集日期：2026-07-31（时效数据均为当日检索）
- 团队画像：1-2 人 AI 独立团队 + Devin 大规模并行，Web/Cloudflare/TypeScript 栈，老板在中国大陆，预算有限

---

## 一、结论前置：推荐排序

**排序：① Web/H5 网页游戏 → ② 微信/抖音小游戏 → ③ Steam/PC → ④ iOS App Store。**

1. **首选 Web/H5（Poki/CrazyGames 分发 + 自有站点 SEO）**——置信度：高
   - 零上架门槛（无版号、无资质、无审核账号费），与现有技术栈（Cloudflare/TS）和已有 zalize-games 资产完全重合，边际成本近零；Poki 100M+ 月活、CrazyGames 等平台自带分发，能冷启动；变现是广告分成（自带流量 100%、平台流量 50%），收入天花板低但下限稳、可多款并行摊薄风险——正好匹配"开发人力近乎免费、可蜂群并行"的公司结构。
2. **次选微信/抖音小游戏（IAA 纯广告路线）**——置信度：中高
   - 2025 年国内小游戏市场 535 亿元、+34%，微信小游戏 5.7 亿 MAU，是四个方向中增速和用户规模最好的。关键：**IAA（纯广告变现、不开虚拟支付）小游戏走"备案"而非版号**，个人主体可备案（上限 5 个），门槛可行；广告分成 50%（+激励最高再 40%）。风险是备案周期 1-3 个月、内容审核不确定、个人主体限制多，建议以国内个体户/小微主体推进。
3. **Steam 观望/机会型**——置信度：高
   - 面向全球（非国区上架）无版号问题，个人可注册（$100/款）；但 2025 年 1.9-2.1 万款新游、中位数总收入仅 $249、66% 的游戏不到 $1000，纯买彩票。除非某款 Web 游戏已验证出强需求，再移植上 Steam 做增量，不作为主攻方向。
4. **不推荐 iOS App Store 作为切入点**——置信度：高
   - 中国区上架游戏必须版号+营业执照且**个人开发者不能被版号主体授权**，等于对我们关闭；只做海外区则面临买量驱动的红海：新上线独立手游只有约 1% 能月入 $10k，且 $99/年 + 审核 + 买量成本高。可作为后期成熟产品的移植目标（Small Business Program 分成 15%）。

**如无异议，将按「Web/H5 主攻 + 微信 IAA 小游戏试点」的方向提交给项目负责人立项。**

---

## 二、四方向对比矩阵（摘要）

| 维度 | Steam/PC | Web/H5 | 微信/抖音小游戏 | iOS App Store |
|---|---|---|---|---|
| 市场规模(2025) | Steam 全年收入约 $16-17.7B，独立游戏占约 25%（$4.4B） | 浏览器游戏全球约 $7.8-8.4B，年增 3-6%；Poki 100M MAU | 国内小游戏 535 亿元，+34.4%；微信 5.71 亿 MAU、抖音 1.71 亿 MAU | 全球手游最大盘子；但个体可及份额极小 |
| 中位数收入 | **$249/款（毛，终身）**；66% <$1000 | 无公开中位数；社区口径多为 $几十-几百/月/款（未验证） | 无公开中位数；头部效应强，"十万级月流水成中坚" | 有收入的游戏类 App 中位数 $1,714/月，但 83% 的 App 无任何收入信号 |
| 上架门槛 | Steam Direct $100/款（可回收），个人可注册；全球区无版号要求 | **无任何门槛**；Poki/CrazyGames 提交审核按质量筛选 | IAA 走备案（个人可，限 5 个）；开虚拟支付=需版号→实际需企业主体 | $99/年；中国区游戏必须版号+营业执照，个人不可被授权 |
| 开发成本/周期 | 最重：1 款可玩性达标的 PC 游戏通常 6-24 个月 | 最轻：单款 1-6 周（我司已有管线） | 轻-中：1-3 月；另加备案 1-3 月等待 | 中-重：开发+审核+ASO+买量 |
| 分成 | Valve 抽 30%（$10M 内） | Poki：自带流量 100%/平台流量 50%；CrazyGames 类似按流量+广告表现 | 广告：普通小游戏 50%；2026 起 IAA 激励最高加 40%（新用户前 30 天） | 苹果 30%，Small Business Program（年 <$100 万）15% |
| 冷启动/发现 | 差：日均 52+ 款新游，近半数 <10 评论 | 好：平台编辑推荐+算法分发；自有站可 SEO | 好：抖音"内容种草-即点即玩"闭环、微信社交裂变；但买量竞争激烈 | 差：榜单/搜索被大厂和买量盘踞，自然量 200-500 安装/日封顶 |
| 对大陆开发者限制 | 全球区发行无限制（需税务信息）；仅"蒸汽平台(Steam 中国)"需版号 | 无（面向海外，注意 GDPR/COPPA） | 备案实名+内容审核；个人主体功能受限；虚拟支付需版号 | 中国区=版号墙；海外区需外币收款、DUNS（公司账号） |

---

## 三、分方向要点（证据见附录链接）

### 1. Steam/PC
- 2025 年新上架 19,606-21,273 款（SteamDB/IndieLaunchLab 口径差异），中位数总收入 $249（Gamalytic 数据，两来源交叉验证），47.5% 卖不到 100 份。【高置信】
- 门槛低（$100/款、个人可、无版号——只要不上"蒸汽平台"国区），但发现机制近乎纯口碑/愿望单驱动，冷启动极难；适合"已有验证玩法"的二次分发而非首发。【高置信】
- itch.io 零门槛、分成自定义，但流量极小，只适合测试玩法。【高置信】

### 2. Web/H5
- 全球浏览器/HTML5 游戏盘子约 $8B、稳增（多家研究机构口径 $5.25B-$8.4B 不一，取区间）。【中置信】
- Poki：100M+ MAU，独家协议下自带流量分成 100%、平台流量 50%；CrazyGames 按流量+广告表现月结。均免费提交、编辑制筛选，质量达标即可上，无资质要求。【高置信，官方文档】
- 自有站点（zalize.com 模式）+AdSense/AdinPlay 广告可保底，SEO 冷启动我司已有成功经验。收入分布长尾，单款天花板低，靠"多款×长线"取胜——与蜂群并行开发高度匹配。【推断，中置信】

### 3. 微信/抖音小游戏
- 市场：2025 年国内小程序游戏实际销售收入 535.35 亿元、同比 +34.4%（艾瑞）；微信小游戏 MAU 5.71 亿、抖音 1.71 亿（QuestMobile 2025-08）。【高置信】
- **无版号可行路径（关键）**：纯 IAA（广告变现、"当前及未来均不需要开通虚拟支付"）小游戏走「小游戏备案（省宣审批）+ 小程序 ICP 备案」，不需要版号；个人主体可备案（上限 5 个）。名称含英文/涉品牌需提供软著或授权材料。开通虚拟支付（IAP）则必须版号，且版号实务上个人无法申请（需企业+出版社渠道，周期 12-18 个月）。【高置信，微信官方文档】
- 变现：普通小游戏广告分成 50%；2026-02 起 IAA 激励政策：买量注册用户前 30 天广告流水额外激励 40%（或 90 天 35%）。【高置信，官方】
- 风险：备案周期 1-3 个月且驳回常见；个人主体命名/类目限制多；平台头部效应增强（爆款集中）。建议注册国内个体户/小微企业主体以降低限制。【中置信】

### 4. iOS App Store（含 Google Play 对比）
- 中国区：游戏必须在 App Store Connect 上传版号批复+营业执照，主体需匹配，**个人开发者不能被版号公司授权**→个人/无版号在中国区上架游戏不可行。【高置信】
- 海外区：无版号问题，但发现性差、买量驱动。761,898 款 iOS App 中仅 5.5% 有收入信号；新上线独立手游约 1% 达到 $10k/月、1/300 达到 $30k/月。个人账号 $99/年 可行（外币收款需处理）。【高置信】
- Google Play：$25 一次性；Play 商店在中国大陆不可用（只能做海外）；2023 年起新个人账号需 20 人封测 14 天才能上正式版，门槛反而高于 iOS。【中高置信】

---

## 四、附录：来源链接

**Steam/PC**
- Gamalytic 口径 2025 中位数 $249、66%<$1000、19,000+ 款：https://game-developers.org/steam-paradox-2025-revenue-volume
- 独立游戏 $4.4B/25% 份额、收入分布：https://ziva.sh/blogs/indie-game-revenue
- 2025 releases 21,273 款月度统计：https://indielaunchlab.com/analytics/steam-reports/2025
- 近半数 <10 评论（SteamDB）：https://www.indie-games.eu/over-19000-games-launched-in-2025-on-steam-but-few-find-an-audience/
- 蒸汽平台（Steam 中国）需版号（Valve 官方）：https://partner.steamgames.com/doc/store/china?l=schinese

**Web/H5**
- Poki 官方分成（100%/50%）与独家条款：https://sdk.poki.com/deals 、https://sdk.poki.com/
- CrazyGames 开发者条款（按流量+广告表现计酬）：https://files.crazygames.com/documents/developer_terms_20250818.pdf
- 浏览器游戏市场 $7.81B(2025)：https://www.researchandmarkets.com/reports/5939597/browser-games-market-report
- HTML5 游戏市场 $5.25-8.4B 口径：https://www.wiseguyreports.com/reports/html5-game-market 、https://www.globalmarketstatistics.com/market-reports/html5-games-market-12195

**微信/抖音小游戏**
- 小游戏备案（IAA 前置审批，无版号路径）官方指引：https://developers.weixin.qq.com/minigame/introduction/guide/nrjs.html
- IAA 资质审核（软著触发条件）：https://developers.weixin.qq.com/minigame/introduction/guide/zzsh-iaa.html
- 个人主体可备案、上限 5 个：https://developers.weixin.qq.com/minigame/product/record/record_faq.html
- 广告分成 50% / 创意游戏 70%：https://fuwu.weixin.qq.com/community/minigame/doc/00088c1ef7c21079135f6e8a159408
- 2026 IAA 激励政策（40%/35%）：https://developers.weixin.qq.com/minigame/introduction/commercialization/guide/ad-monetization.html
- 市场 535.35 亿元(2025)（艾瑞）：https://news.iresearch.cn/content/202607/560265.shtml
- 微信 5.71 亿/抖音 1.71 亿 MAU（QuestMobile）：https://www.questmobile.com.cn/research/report/1980474117065904130/

**iOS/Google Play**
- App 审核指南（游戏监管）：https://developer.apple.com/cn/app-store/review/guidelines/
- 中国区版号+营业执照、个人不可被授权（实战手册）：https://news.qq.com/rain/a/20250821A09EEU00
- 版号申请资质与周期：https://dev.liqucn.com/article/10014
- iOS App 收入分布（76 万款）：https://getappniche.com/answers/how-much-does-an-app-make
- 独立手游 1% 达 $10k/月：https://asotxt.com/news/9858
- Apple Small Business Program 15%：https://www.apple.com/newsroom/2023/05/small-developers-on-the-app-store-grew-revenue-by-71-percent-from-2020-2022/

**方法说明**：关键数字（Steam 中位数、发行量、小游戏市场规模、分成比例）均有 ≥2 个独立来源或官方一手来源交叉验证；市场规模研究机构口径差异较大处已标注区间；"未验证/推断"处已在正文标明。
