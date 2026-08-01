# 第三轮真实需求调研报告（SOP-02）

日期：2026-08-01 ｜ 执行：需求调研分析师 ｜ 决策用途：四产品加码方向 + 是否立项第五产品

> 所有数字与引用均为本日（2026-08-01）实际检索/截图所得，来源与采集日期随行标注。证据截图见 `evidence/`。

## 结论前置（TL;DR）

1. **本周期不立项第五产品**。Article 50 适用日就是明天（8 月 2 日），这是四产品中唯一"政策级供需失衡窗口"，且完全属于我们——资源应集中打这个窗口，而不是分兵。
2. 四产品定位全部命中真实抱怨（订阅陷阱/二维码失效/隐私），但各有 2-3 处"差一步就能提升付费"的缺口，详见 A1。
3. **一处必须立即修复的事实性风险**：ScribeFlow 首页引用 "Notta Trustpilot 1.3★"——Notta 的 Trustpilot 评分已因刷假评被平台移除（页面显示 "Breach of guidelines / rating unavailable"，截图 `evidence/notta-trustpilot.png`，2026-08-01）。继续引用旧评分 = 我们自己变得"不诚实"。
4. 备选第五产品第一顺位：**"Honest 简历生成器"（一次性付费）**——低分高需求证据充分、与现有架构（CF Workers + Paddle + docx 导出）复用度极高，列入观察名单，R4（两周后）复评触发条件见文末。

---

## A. 现有产品需求再验证

### A1-1 HonestQR（qr.zalize.com）

**用户此刻在抱怨什么（证据）**
- Bitly 旗下 QR-Code-Generator.com（QRCG）Trustpilot **1.4★ / 9,282 条评论**（本日实测截图 `evidence/qrcg-trustpilot.png`，2026-08-01），差评主轴 = 免费生成→14 天试用到期→已印刷的码全部失效→逼订阅 $119.88/年。Consumer Rights Wiki 专门立了词条（2026-03-27，截图 `evidence/bitly-lockout-wiki.png`）。
- Reddit 汇总（Pageloot，2026-06-23）：r/smallbusiness 反复点名 QRFY、QR.io、Bitly QRCG 为"trial-trap"；用户总结的自查三问：要不要绑卡、码会不会过期、扫码会不会插广告。
- Google 自动补全（2026-08-01 实测）：`qr code generator free no expiration`、`qr code generator no sign up`、`qr code expired how to fix`、`qr code expired what to do` 均在前十。

**文案是否命中**：命中。首页 "won't hold your codes hostage / 1.4/5 rating from 9,000+ reviews" 直接对准痛点（注：首页写 9,000+，本日实际 9,282，数据仍成立）。

**最能提升付费意愿的改进（可实施）**
1. **"救活我过期的二维码" 落地页 + 工具**：针对 `qr code expired how to fix` 这条高意图搜索词，做一个引导页——粘贴原目标网址，一键生成永不过期的静态码 + 讲清为什么会失效。这是竞品受害者流量的直接承接口，转化到 $29/年动态码的天然入口。
2. **竞品点名对比页**（/vs/qr-code-generator-com、/vs/qrfy、/vs/qr-io）：Reddit 用户就是拿名字搜的（`qrcode-generator.com charged me`），页面结构=该竞品差评摘录（Trustpilot 引用）+ 我们的承诺对照表。
3. **动态码"取消也不断链"承诺前置**：Pageloot 汇总显示用户最看重"码比订阅活得久"；把"cancel and export anytime, codes keep redirecting"从小字提为购买按钮旁的主卖点。

### A1-2 ScribeFlow（scribe.zalize.com）

**用户此刻在抱怨什么（证据）**
- Otter.ai Trustpilot **3.3★ / 587 条**（本日截图 `evidence/otter-trustpilot.png`）：三大抱怨=①未经同意自动入会/给全员发转写（隐私）、②订阅自动续费/难取消/退款难、③客服失联（uk.trustpilot.com/review/otter.ai，2025-12 摘要同口径）。
- Google 自动补全（2026-08-01）：`transcribe audio to text free no sign up`、`otter ai alternatives reddit`、`otter ai cheaper alternative`。
- 竞品动向：同定位竞品 Speecho.app 支持**游客免注册试用**（"start as a guest without an account"，speecho.app，2026 实测）；我们免费 30 分钟仍要求注册。

**文案是否命中**：大方向命中（no subscription / credits never expire / 对比表），但存在事实性风险：
- ⚠️ **Notta 1.3★ 引用已失效**：Notta 的 Trustpilot 评分被平台以"违反准则（假评论）"移除（截图 `evidence/notta-trustpilot.png`，2026-08-01）。

**改进**
1. **（P0，本周）替换 Notta 引用**：改为更狠且真实的表述——"Notta 的 Trustpilot 评分因刷假评被平台移除（Breach of guidelines）"，附链接；顺带自查页面上 Otter 引用（Otter Trustpilot 现为 3.3★，Google Play 引用需复核当日数值）。
2. **免注册游客试听 5-10 分钟**：竞品已做，且 `free no sign up` 是高频补全词；RevenueCat 2026 报告显示 55% 试用取消发生在第 0 天——用户要"即时证明价值"，注册墙是最大摩擦（revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026，2026-03-19）。
3. **反 Otter 隐私角度的获客页**："我们永远不会自动加入你的会议"——Otter 最新差评主轴不是价格而是隐私越界，做 /vs/otter 页承接 `otter ai alternatives reddit` 流量。

### A1-3 HonestPDF（pdf.zalize.com）

**用户此刻在抱怨什么（证据）**
- Reddit r/software "Anyone found a PDF editor that's actually worth paying for?"（2026-05 快照）：需求清单=改文字、合并、**签名**、批注、导出不跑版；回帖高频推荐自托管/本地方案（BentoPDF、Stirling PDF、PDF24）——本地处理已成为品类信任货币。
- Smallpdf Trustpilot 总分 4.7（本日截图 `evidence/smallpdf-trustpilot.png`）但订阅相关差评刺眼："Scam subscription model. Charged for 6 months without a single email reminder"、"cancelled within 7 days, no refund"（trustpilot.com/review/smallpdf.com，2026-03/2025-04 评论）。iLovePDF 差评集中在"保存卡死丢工作成果"（trustpilot.com/review/ilovepdf.com，2026-03）。
- Google 自动补全（2026-08-01）：`pdf editor no sign up`、`pdf editor no subscription`、`pdf editor no account`、`pdf editor not adobe` 占满前十——搜索语言与我们域名定位完全一致。
- MakeUseOf（2026-07-23）：自托管替代 Acrobat 成媒体叙事热点。

**文案是否命中**：命中（local/no subscription/DevTools 可验证），但**工具覆盖有缺口**。

**改进**
1. **补齐"签名 + 批注"本地工具**：Reddit 需求清单前五里我们缺这两个（签名尤其是把用户从 Smallpdf 拉过来的最后一根稻草，它是 Smallpdf 付费主场景）。纯前端可实现（pdf-lib 画布签名/注释层），符合"file never uploaded"架构。
2. **"编辑文字"至少给出诚实替代路径**：做不到完整 reflow 编辑就明说，并提供"页面级替换/白底覆盖"轻编辑——避免用户来了发现"编辑"缺席直接流失。
3. **承接 `pdf editor not adobe` / Acrobat 退订潮流量**：一页 "Leaving Adobe Acrobat?" 迁移指南（Acrobat 常用 10 操作 → 我们对应工具映射），引用 HardForum/Reddit 的 Adobe 许可证怨言。

### A1-4 AI Act Kit（aiact.zalize.com）——见 A2 合并分析

---

## A2. Article 50 适用日（8 月 2 日）讨论热度与角度

**真实热度（不编数字，只列可核查事实）**
- 欧盟委员会官方（digital-strategy.ec.europa.eu，"Commission starts enforcing AI Act rules… on 2 August"）：8 月 2 日起 AI Office+成员国当局开始执法；同日公布**180+ 家签署《AI 生成内容透明度实践准则（Code of Practice）》的机构名单**。
- 律所/行业媒体密集发文：ReedSmith（07-31）、TechTarget（07-30）、eutoday（08-01）、Notebookcheck 面向消费者的解读（07-26，"你其实几乎看不到可见标签，存量系统宽限到 12 月"）。
- HN 三条相关帖（截图 `evidence/hn-ai-radar.png`）：Ask HN "How are you handling EU AI Act compliance"（47169864）、Show HN "EU AI Radar 60-second self-check"（47244821）、Show HN "开源 AI Act 合规层"（47141347）——开发者侧的真实痛点是**分不清哪条 deadline 归自己**，且已有人在做免费 checker 抢同一入口。

**讨论角度 vs 我们的内容**
| 热点角度 | 我们是否踩中 |
|---|---|
| "Article 50 没被 Omnibus 推迟" | ✅ 首页主标题即此 |
| 执法正式开始（enforcement begins） | ✅ 已覆盖 |
| **Code of Practice 180+ 签署名单** | ❌ 缺——这是官方给出的"合规证明的实用路径"，也是采购方会拿来问供应商的清单 |
| **50(2) 机读标识存量系统宽限至 2026-12-02** | ⚠️ 弱——只在长文提及；这是未来 4 个月最大的续命内容点 |
| 各国投诉去哪（如德国 Bundesnetzagentur） | ❌ 缺——"被投诉了怎么办/怎么投诉竞品"是新流量词 |
| 义务归属：我的还是供应商的（Flint Brief 角度） | ⚠️ checker 内含，未做成独立内容 |

**加码动作（本周）**：① 发布 "Code of Practice：签还是不签？180+ 名单意味着什么" 指南+把 CoP 对照做进 checker；② "12 月 2 日机读标识倒计时" 内容 + 邮件提醒订阅（天然线索收集）；③ 国别执法机构/投诉渠道速查表（DE/FR/ES/IT/PL/NL 正好复用六语言）。

---

## B. 下一个机会扫描（三捷径）

### B1 低分高需求 Top5（证据截图在 `evidence/`）

| # | 品类 | 证据（评分/规模，采集 2026-08-01） | 判断 |
|---|---|---|---|
| 1 | 试用陷阱型二维码生成器 | QRCG by Bitly Trustpilot 1.4★/9,282 条（`qrcg-trustpilot.png`）；Consumer Rights Wiki 词条（`bitly-lockout-wiki.png`） | ✅ 已是我们的 HonestQR，按 A1-1 加码 |
| 2 | 简历生成器（$1.95 试用→$24.95/月） | LiveCareer Trustpilot 差评"2€ 一次性变 23€/月"（2026-01-25）；PixelResume 拆解 "Zety charged me" 是品类最高频投诉搜索（2026-06-03）；Zety 4.3★ 但带 "Paid Trustpilot subscription" 标（`zety-trustpilot.png`） | ⭐ 第五产品第一候选（见结论） |
| 3 | PDF 扫描 App（CamScanner 类） | CamScanner Google Play 500M+ 下载（`camscanner-play.png`）；JustUseApp 大量"取消了试用仍被扣 $60"投诉（`camscanner-reviews.png`） | HonestPDF 可吃部分场景（手机网页扫描→本地 PDF），不值得单独立项 |
| 4 | 手机清理/加速类 | Unstar《Worst-Rated Apps 2026》（2026-07-17，`unstar-worst-rated.png`）：恐吓式弹窗+为系统自带功能收订阅 | 红海+靠投放驱动，不符合我们打法 |
| 5 | 奖励/赚钱类 App | 同上 Unstar 榜；TechCrunch：Freecash 靠骗量登顶后被两大商店下架（2026-04-14） | 合规风险高，不碰 |

（背景数据：USENIX DARKFLEECE 研究——抽检 Google Play 589 个订阅 App，75.21% 存在 fleeceware 暗模式，累计 50 亿下载——"Honest" 定位的市场空间是结构性的。）

### B2 高付费率小众品类 Top3（来源均为 2026 年行业报告）

| # | 品类 | 证据 |
|---|---|---|
| 1 | Health & Fitness | 品类试用→付费转化率全店最高 **35%**，且年付占收入 60.6%（Adapty State of In-App Subscriptions 2026，2026-03-12） |
| 2 | Utilities 工具类 | Apple Ads install-to-paid 5.36%（美区 Top10 品类，Adapty 2026-06-29）；试用用户 LTV 溢价 **+85.1%** 为全品类第一（Adapty 2026-03） |
| 3 | Graphics & Design / Photo & Video | install-to-paid 5.46%/5.38%（同上）；非游戏 App 整体 30 天安装→首购 9.84%（AppsFlyer App Monetization 2026，2026-06-25） |

启示（对现有产品）：ScribeFlow/HonestPDF 同属 Utilities 心智——试用体验（而非折扣）是付费杠杆，进一步支持"免注册即试"的改造；硬付费墙转化 5 倍于 freemium（RevenueCat 2026），我们的 AI 功能可更大胆地"先见效果、当场收费"。

### B3 近 30 天供需失衡窗口 Top3

| # | 事件（日期） | 窗口 | 我们能否吃到 |
|---|---|---|---|
| 1 | **EU AI Act Article 50 生效 + 执法启动（2026-08-02）**；Omnibus 条例 2026-07-27 生效造成"多时钟混乱" | "am I affected / article 50 checklist / code of practice" 搜索潮 | ✅ 完全是 aiact 的主场，按 A2 三个动作打 |
| 2 | **MagicBrief 关停（2026-07-31，被 Canva 吸收）**，$249/月广告创意研究工具用户被迫迁移（myeaglecountry 2026-07-23） | "magicbrief alternative" | ❌ 与我们技术栈/领域不匹配，放弃 |
| 3 | **GitHub Copilot 用量计费风暴（2026-07，官方社区帖 1,270 踩 / 610 评论，Codexical 2026-07-20）** + Relay.app 关停（免费 8-15 / 付费 9-14 截止，rills.ai 2026-07-16） | 开发者对"订阅变用量"的账单焦虑 | ⚠️ 不做产品，但可写内容蹭"honest pricing"叙事给全家桶导流 |

---

## 结论：是否立项第五个产品

**建议：本周期（未来 2 周）不立项，全力加码现有四产品。**

理由：
1. **窗口时效**：B3-1（Article 50）是唯一今天就在发生、且我们已有完整产品承接的窗口；分兵做新品 = 放弃已付出 3 波内容建设的收获期。
2. **现有产品缺口都是"一步之遥"**：Notta 引用修复（半天）、免注册试用（2-3 天）、PDF 签名/批注（3-5 天）、QR 救活页（1-2 天）——同样的工程资源投新品只够搭骨架。
3. 新品类候选中唯一达标的是"Honest 简历生成器"，但简历品类付费旺季在秋招/年初，8 月立项并非最佳时点。

**资源分配建议（未来两周）**：AI Act Kit 50%（A2 三个内容动作+CoP 进 checker）；ScribeFlow 20%（P0 引用修复+游客模式）；HonestPDF 20%（签名/批注上线+Adobe 迁移页）；HonestQR 10%（救活页+2 个 vs 页）。

**观察名单：HonestCV（一次性付费简历生成器）**——R4 复评，满足任一即启动立项：① 秋招前 4 周（9 月初）；② "zety charged me / resume builder one time payment" 相关搜索出现新的媒体级曝光事件；③ 现四产品当周合计工程投入 < 60%（有富余产能）。
立项时直接复用：CF Workers + Paddle 一次性支付（ScribeFlow 同款）、docx 导出（thesis-copilot/occasion-speech 已有）、"Honest" 品牌叙事与 vs-竞品页方法论（本报告 B1-2 证据即冷启动素材）。

---

## 附录：证据索引

| 文件 | 内容 | 采集日 |
|---|---|---|
| evidence/qrcg-trustpilot.png | QRCG by Bitly Trustpilot 1.4★/9,282 | 2026-08-01 |
| evidence/bitly-lockout-wiki.png | Consumer Rights Wiki：Bitly QR 锁码词条 | 2026-08-01 |
| evidence/otter-trustpilot.png | Otter.ai Trustpilot 3.3★/587 | 2026-08-01 |
| evidence/notta-trustpilot.png | Notta 评分因假评被移除（Breach of guidelines） | 2026-08-01 |
| evidence/smallpdf-trustpilot.png | Smallpdf Trustpilot 4.7★（订阅差评并存） | 2026-08-01 |
| evidence/zety-trustpilot.png | Zety 4.3★ + Paid Trustpilot subscription 标 | 2026-08-01 |
| evidence/camscanner-play.png | CamScanner Google Play 4.6★/500M+ 下载 | 2026-08-01 |
| evidence/camscanner-reviews.png | CamScanner 扣费投诉（JustUseApp） | 2026-08-01 |
| evidence/unstar-worst-rated.png | Unstar 2026 最差评分 App 品类表 | 2026-08-01 |
| evidence/hn-ai-radar.png | Show HN：EU AI Radar 自查工具 | 2026-08-01 |

主要链接：EC FAQ（digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act）· EC 执法公告（…/news/commission-starts-enforcing-ai-act-rules-and-new-transparency-requirements-2-august）· ReedSmith 07-31 · TechTarget 07-30 · eutoday 08-01 · Notebookcheck 07-26 · HN 47169864 / 47244821 / 47141347 · consumerrights.wiki Bitly 词条 · pageloot.com/compare/best-qr-code-generator-reddit（06-23）· trustpilot.com/review/{qr-code-generator.com, otter.ai, notta.ai, smallpdf.com, ilovepdf.com, zety.com} · pixelresume.com/blog/resume-builder-subscription-traps（06-03）· usenix.org DARKFLEECE (Sec'24) · techcrunch.com Freecash（04-14）· adapty.io State of In-App Subscriptions 2026（03-12）与 Apple Ads benchmarks（06-29）· revenuecat.com 2026 benchmarks（03-19）· appsflyer App Monetization 2026（06-25）· getappniche.com State of iOS App Niches 2026（07-09）· myeaglecountry MagicBrief（07-23）· rills.ai Relay.app（07-16）· codexical.com Copilot 定价（07-20）· Google 自动补全为 2026-08-01 suggestqueries API 实测。
