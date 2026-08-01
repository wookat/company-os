# DataForge（data.zalize.com）竞品与渠道调研报告

- 调研人：market-researcher（数据资产工厂）
- 日期：2026-08-01（价格/流量等时效数据均为当日采集）
- 决策用途：判断 $99–799 一次性买断定位是否成立；确定买家出没渠道与当天可上的免费挂牌渠道
- 方法：一手证据优先——亲自访问竞品站点/定价页并截图、调用 Apify 公开 API 取实测数据；Datarade 站点有 Cloudflare 人机验证拦截浏览器访问（已截图记录），改用服务端抓取其页面原文作为一手证据

## 一、结论（前置）

1. **$99–799 一次性买断定位成立，且是市场空档（置信度：高）**。企业级卖家起步价普遍在 $1,000+/月或 $9,900+/次（Coresignal datasets 起步 $1,000、Forager.ai 一次性 $9,900、Xtract $1,169/次），大量卖家干脆"报价面议"；低端只有 Apify 按量计费（$3/千条级）和 Kaggle 免费旧数据。**$99–799 区间几乎无人占位**，介于"免费但过时"与"企业级但昂贵"之间。
2. **买家不会主动来 data.zalize.com；他们出没在 Datarade 询盘（10–15万月访问、KYC 企业买家）、Apify 搜索（单个 jobs actor 最高 12 万累计用户）、以及 Google 长尾词（"job postings dataset with salary" 类）**（置信度：高）。自建站短期内 SEO 权重为零，必须借渠道借流量。
3. **当天可上的免费挂牌渠道：Kaggle、Hugging Face、Apify Store、Gumroad（挂 $99 slice 直接收款）、Monda→Datarade（免费起步入口存在，但上架需审核+抽成30%）**（置信度：高，流程见附录 B）。

## 二、竞品逐家拆解

### 1. Coresignal（jobs 数据标杆，Datarade 编辑推荐位）
- **形态**：API + datasets 订阅。468M+ job postings、80+ 字段、6 年历史，24/7 刷新。
- **定价**（官网 pricing 页实测）：API 订阅 $49/月（2,500 credits，job posting 1 credit/条）→ $199/$499/$1,000…$5,000/月；**datasets 交付"Starting from $1,000"且要求年度合约**。
- **流量**：Datarade 品类页编辑推荐第一位；自有 SEO 内容矩阵完善。
- **口碑**：Datarade 4.8/5（12 评）；Reddit 实测用户给自助 UI 6/10——"schema 稳定是最大优点，但 raw data 需要自己清洗、AI search 半成品"（来源：prospeo.io 汇总的 Reddit 实测，置信度中）。
- **缺口**：面向工程团队卖"原料"，无 $1,000 以下的 datasets 买断档；小买家在 Starter 档单价被宰 6 倍（$0.196 vs $0.030/条）。**我们的机会：卖清洗好的成品切片（parsed salary、tech stack 已结构化），$99 起。**

### 2. Bright Data（dataset marketplace 标杆）
- **形态**：代理/爬虫基础设施 + 现成 dataset marketplace。App Store dataset 66.2M 条、3 个子集。
- **定价**（官网实测）：**Up to $0.0025/record，最低订单 $250**；Shopify 走 scraper（5K page loads/月免费档）而非现成 dataset。
- **流量**：20,000+ 客户，SEO 极强（每个数据源一个着陆页矩阵）。
- **口碑**：Trustpilot 高分，但社区普遍反映面向企业、结算复杂、对个人开发者门槛高（置信度：中）。
- **缺口**：$250 起步、按记录计费，买家要自己算量；无"固定价格拿走一个打包好的研究级数据集"的体验。**我们的机会：一口价 + datasheet + 免费样例，降低决策成本。**

### 3. Techsalerator（长尾国家页 SEO 打法）
- **形态**：174M+ job openings，按国家切片卖（为每个国家生成一个 SEO 页）。
- **定价**：全部"Pricing available upon request"，支持一次性买断 + 月/季/年订阅，24 小时内交付。
- **流量**：靠数百个 "Job Openings Data in {Country}" 程序化 SEO 页 + Datarade 挂牌。
- **口碑**：Datarade 上评价少，无公开负面（置信度：低——样本不足）。
- **缺口**：无透明定价，小买家询价即流失。**我们的机会：公开梯度定价（$99/$299/$799）直接截走怕询价的长尾买家。**

### 4. Apify Store（低端按量市场，买家实测数据）
- **形态**：scraper actor 按量/按事件计费，买家自己跑。
- **实测数据**（Apify 公开 API，2026-08-01）：
  - linkedin-jobs-scraper（curious_coder）：**121,539 累计用户**，近30天 9,706
  - indeed-scraper（misceres）：28,306 用户，$3.00/1,000 条（详情页截图）
  - indeed-jobs-scraper（valig）：21,126 用户，近30天 3,351
  - shopify-store-leads：1,087 用户；shopify-products-scraper：385 用户
  - appstore-reviews-scraper（thewolves）：1,625 用户，$0.10/1K reviews
- **口碑**：用户量即口碑；jobs 类需求远大于 shopify/app 类（用户量差 20–100 倍）。
- **缺口**：买家拿到的是原始抓取结果，无清洗、无历史、无 salary 解析。**我们的机会：在 Apify 上架"数据集交付型 actor"（跑一次输出我们的成品切片），借它 12 万+的 jobs 买家流量。**

### 5. Kaggle（免费替代品，覆盖度实测）
- 搜 "job postings" 得 331 个数据集（截图）。头部：LinkedIn Job Postings 2023-2024（124k 条，70,446 下载）、Real/Fake Job Posting（55,283 下载）。
- **覆盖度结论**：量大但**普遍 1–2 年以上未更新、无 salary 解析、无持续刷新**；每周更新的仅个别（Jobstreet 马来西亚等）。Shopify 产品目录 + 价格历史类几乎空白；App review sentiment 类只有零散一次性快照。
- **含义**：免费替代品挡不住"要新鲜数据 + 要持续更新"的买家；同时 Kaggle 是我们免费获客的最大鱼塘（下载者即潜在付费升级用户）。

### 6. Store Leads（Shopify 数据标杆）
- **定价**（官网截图）：Premium $75/月（仅 UI）→ Pro $250/月（含导出/API）→ Elite $450 → Enterprise $950/月。自称"业内最低价"。
- **形态**：订阅制全库访问 + Chrome 插件 + CRM 集成，主打 sales prospecting。
- **缺口**：按月订阅、面向销售线索场景；**没有"$199 拿走 50 万条产品+价格历史时间序列"的研究/训练用产品**。价格历史时间序列正是我们的稀缺资产。

### 7. 42matters / AppFigures（App 数据标杆）
- **42matters**：已被 Similarweb 收购，pricing 页只剩 "Contact Us"（截图）——透明定价消失，file dumps（20M+ apps）全部转销售询价。
- **AppFigures**（官网截图）：$9.99/mo（Connect）→ $44.99 → $149.99 → $299.99 → $1,399.99/mo（Amplify，含 Market Intelligence）。数据导出/竞品级 App intelligence 集中在 $299+ 档。
- **缺口**：42matters 收购后小客户无处可去；AppFigures 卖的是分析工具订阅而非可带走的数据文件。**我们的机会：$149 买断"23k apps + review sentiment"切片，正好接住被 $2,000/月级平台劝退的买家。**

## 三、对比总表

| 竞品 | 形态 | 入门价 | 目标客户 | 流量来源 | 口碑要点 | 对我们的空档 |
|---|---|---|---|---|---|---|
| Coresignal | API+datasets 订阅 | API $49/月；datasets $1,000 起+年约 | 工程/投资团队 | Datarade 推荐位+SEO | 4.8/5；raw 需清洗 | 无 <$1,000 买断档 |
| Bright Data | dataset marketplace | $0.0025/条，min $250 | 企业 | 20k 客户+SEO 矩阵 | 企业级门槛高 | 无一口价成品包 |
| Techsalerator | 国家切片 datasets | 全部询价 | 中型企业 | 程序化 SEO+Datarade | 评价少 | 无透明定价 |
| Apify actors | 按量 scraper | ~$3/千条 | 开发者/增长团队 | Store 搜索（jobs 类 12 万用户） | 用户量大 | 原始数据无清洗/历史 |
| Kaggle | 免费数据集 | $0 | 学生/研究者 | 平台内搜索 | 下载量大但过时 | 无更新/无 salary 解析 |
| Store Leads | 订阅全库 | $75–950/月 | 销售团队 | SEO+插件 | "业内最低价" | 无研究用买断切片 |
| AppFigures | 分析工具订阅 | $9.99–1,399/月 | App 开发者 | ASO 内容+榜单 | 工具好评 | 数据不可带走 |
| 42matters | file dumps | 询价（被收购） | 广告/企业 | Similarweb 导流 | — | 小客户被抛弃 |
| **DataForge（我们）** | **一口价买断切片** | **$99–799** | **开发者/AI 团队/研究者** | 待建 | 待建 | — |

## 四、3 条可执行打法建议（如无异议将按此执行）

1. **"免费样例挂满渠道，全部回链主站"（本周可做）**：把三个数据集各切 1–5% 样例，当天上架 Kaggle + Hugging Face（免费、无实名门槛、当天可见），描述区放 datasheet 与 $99 完整版链接；同时在 Gumroad 挂 $99/$199 slice 直接收款（10%+$0.50 抽成，作为 Paddle 之外的即时结账通道）。Kaggle "job postings" 类头部数据集 7 万下载证明需求池够大。
2. **借 Apify 的 jobs 买家流量**：把 Job Postings 数据集包装成 "dataset actor"（运行即输出最新月度切片，PPE 定价），蹭 linkedin-jobs-scraper 12 万用户同类搜索词；actor 描述导流到主站买全量+历史。jobs 品类用户量是 shopify/app 类的 20–100 倍，优先做 jobs。
3. **申请 Monda 免费起步→上架 Datarade，同时打透明定价差异化**：Datarade 月访问 10–15 万、买家过 KYC，是唯一的 B2B 询盘渠道；上架三个 listing，定价字段直接写 "$99–799 one-off"（品类内 80% 卖家写"询价"，透明一口价即差异点）。注意 30% marketplace 抽成与审核合规材料（web data 采集说明、PII 处理声明——我们官网已有 data-removal/legal 页可直接引用）。

## 五、需注意

- Datarade/Monda 上架需提交数据合规文档（Web Data 采集方式、PII 处理），资料不全会被下架；抽成 30%，报价时需把毛利算进去。
- Gumroad 收款需绑定收款账户（PayPal/银行），属于"提现时才需要"的材料，挂牌本身免费；Discover 渠道成交抽 30%。
- 本报告未注册任何付费/实名服务；Datarade 浏览器访问被 Cloudflare 人机验证拦截（多次尝试未过，截图存档），页面内容改由服务端抓取获得，价格数字均可在附录链接复核。

## 附录 A：来源与置信度

| 数据点 | 来源 | 采集日 | 置信度 |
|---|---|---|---|
| Coresignal 定价梯度（$49–5,000/月；datasets $1,000 起） | https://coresignal.com/pricing/ | 08-01 | 高（官网原文） |
| Bright Data App Store dataset $0.0025/条、min $250 | https://brightdata.com/products/datasets/app-store | 08-01 | 高 |
| Datarade jobs 品类卖家与报价（Forager $9,900 一次性等） | https://datarade.ai/data-categories/job-postings-data | 08-01 | 高 |
| Techsalerator 询价制+24h 交付 | https://www.techsalerator.com/data-catalog/job-openings-data | 08-01 | 高 |
| Apify actor 用户数/定价 | https://api.apify.com/v2/store （公开 API 实测）+ https://apify.com/misceres/indeed-scraper 截图 | 08-01 | 高 |
| Kaggle "job postings" 331 结果、头部 7 万下载 | https://www.kaggle.com/search?q=job+postings+in%3Adatasets 截图 | 08-01 | 高 |
| Store Leads $75/$250/$450/$950 | https://storeleads.app/#pricing 截图 | 08-01 | 高 |
| AppFigures $9.99–1,399.99/月 | https://appfigures.com/pricing 截图 | 08-01 | 高 |
| 42matters 被 Similarweb 收购、定价转询价 | https://42matters.com/pricing 截图 | 08-01 | 高 |
| Datarade 月访问 ~154,657（SimilarWeb 转引） | 公开 SimilarWeb 摘要（第三方转载） | 08-01 | 中（未验证原始面板） |
| Datarade/Monda 30% 抽成、订阅制 | pipeline.zoominfo.com/sales/datarade-pricing（第三方） | 08-01 | 中（两个独立第三方交叉，未见官方数字） |
| Coresignal Reddit 口碑 6/10 | prospeo.io 汇总转引 | 08-01 | 中 |

## 附录 B：免费挂牌渠道流程（当天可上，不付费不实名）

| 渠道 | 流程 | 所需材料 | 时效 |
|---|---|---|---|
| Kaggle | 注册（邮箱）→ New Dataset → 上传 CSV/Parquet → 填标题/license/描述 → Publish | 邮箱账号、数据文件、描述文案 | 当天，即时可见 |
| Hugging Face | 注册 → New Dataset repo（public）→ 拖拽上传 → 填 Dataset Card（license/来源/用途） | 邮箱账号、README（Dataset Card） | 当天，即时可见 |
| Gumroad | 注册 → 新建 digital product → 上传/外链交付 → 定价 $99 → 发布 | 邮箱账号；提现时才需收款账户 | 当天可售，10%+$0.50/单 |
| Apify Store | 注册 → 发布 actor（代码+README+PPE 定价）→ 平台审核 | 开发者账号、actor 代码 | 1–3 天（含审核） |
| Monda→Datarade | monda.ai/contact/start 申请免费起步 → 建 listing（含定价/ToU/合规说明）→ 同步 Datarade | 公司信息、合规文档、产品 listing 文案 | 数天（需审核），30% 抽成 |
