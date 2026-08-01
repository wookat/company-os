# 四站搜索侧需求验证报告（2026-08-01）

对象：guifan.zalize.com / tiku.zalize.com / speech.zalize.com / data.zalize.com
方法：① `site:` 查询三大引擎收录量；② IndexNow 免账号主动提交（key 文件部署到各 Worker 静态资产根目录）；③ 每站 20 个代表性关键词实测（搜索建议 autocomplete、首页竞争对手、我方排名）。
数据采集：Google/Bing/百度真实 SERP（浏览器实测+脚本抓取）；autocomplete 用各引擎官方 suggest 接口（Google suggestqueries / Bing osjson / 百度 sugrec）。

## 一、总览

| 站点 | Google 收录 | Bing 收录 | 百度收录 | IndexNow 提交 | 需求信号结论 |
|---|---|---|---|---|---|
| guifan.zalize.com（高校论文格式规范，565 页） | 0 | 0（site: 无本站结果，仅兜底无关结果） | 0（"未找到相关结果"） | 565 URL → HTTP 200 | **有真实需求**，但竞争位被高校官网/内容农场占据 |
| tiku.zalize.com（公考/教资题库，8617 页） | 0 | 0（同上） | 0 | 8617 URL → HTTP 200 | **有真实需求**，竞争极强（粉笔/中公/华图） |
| speech.zalize.com（AI 场合致辞，200 页多语言） | 0 | 0（同上） | 0 | 200 URL → HTTP 200 | **有真实且明确的商业需求**（"generator/free/ai" 修饰词齐全），竞品多但均为小站，可竞争 |
| data.zalize.com（DataForge 数据集目录，11 页） | 0 | 0（同上） | 0 | 11 URL → HTTP 202 | 需求分裂：免费向 Kaggle、商业向 Datarade/BrightData；SEO 短期信号弱 |

**关键事实：四站在三大引擎的收录均为 0。** 目前所有 SEO 页面（合计 ~9400 页）尚未产生任何搜索流量入口。这是最高优先级问题，先于内容/关键词优化。

注：
- Bing 对 `site:` 查询在无结果时会忽略操作符返回无关兜底结果并显示虚假计数（如 guifan "About 29,400 results" 但列表全是无关站点），已人工核对：实际收录 0。
- Google `site:` 四站均返回 "About 0 results"。
- 百度四站均"抱歉，未找到相关结果"（通过人机验证后人工+脚本双重确认）。

## 二、主动提交（IndexNow，免账号）

- key 文件 `3c4caa144734285f611e1f8f8c28869b.txt` 已部署到 guifan/tiku/data 三个 Worker 的静态资产根目录并上线验证可访问；speech 站此前已有 key（`26caaae7…txt`）。
- 提交结果（api.indexnow.org，Bing 共享）：
  - guifan：565 URLs → HTTP 200（首次 403 SiteVerificationNotCompleted，key 生效后重试成功）
  - tiku：8617 URLs → HTTP 200
  - speech：200 URLs → HTTP 200
  - data：11 URLs → HTTP 202（已接受）
- 代码变更（各仓库分支，已部署上线）：
  - wookat/lunwen-guifan 分支 `devin/indexnow-guifan`（基于生产分支 data-staging）
  - wookat/tiku 分支 `devin/indexnow-tiku`（基于生产分支 data-staging）
  - wookat/dataforge 分支 `devin/indexnow-data`（基于生产分支 devin/1785593661-data-landing-workers）
- 限制：百度主动提交需百度搜索资源平台账号（不提供账号，跳过）；Google 不支持 IndexNow，需 Search Console（同样需账号）。**Google 收录目前只能靠外链自然发现，这是结构性缺口。**

## 三、各站 20 词竞争实测

### 3.1 guifan.zalize.com（百度为主战场）

autocomplete 命中：百度 20/20、Bing 20/20 —— 「XX大学 毕业论文 格式」是真实高频查询模式。

| 关键词 | 搜索建议 | 百度首页竞争对手（Top 结果域名） | 我方排名 |
|---|---|---|---|
| 北京大学 毕业论文 格式要求 | 百度:有 / Bing:有 | lib.pku.edu.cn、multibody.pku.edu.cn、coe.pku.edu.cn | 未收录/未上榜 |
| 清华大学 硕士论文 格式 | 百度:有 / Bing:有 | 163.com、sohu.com | 未收录/未上榜 |
| 复旦大学 毕业论文 规范 | 百度:有 / Bing:有 | 163.com、sohu.com、3g.china.com | 未收录/未上榜 |
| 武汉大学 本科毕业论文 格式 | 百度:有 / Bing:有 | k.sina.com.cn、163.com、renrendoc.com | 未收录/未上榜 |
| 浙江大学 学位论文 格式 | 百度:有 / Bing:有 | soaa.zju.edu.cn、opt.zju.edu.cn、baidu.com | 未收录/未上榜 |
| 毕业论文 格式要求 | 百度:有 / Bing:有 | baidu.com、sohu.com、mbd.baidu.com | 未收录/未上榜 |
| 本科毕业论文 格式规范 | 百度:有 / Bing:有 | douyin.com、sohu.com、baidu.com、mp.weixin.qq.com | 未收录/未上榜 |
| 硕士论文 格式要求 | 百度:有 / Bing:有 | baidu.com、sohu.com | 未收录/未上榜 |
| 毕业论文 查重率 要求 | 百度:有 / Bing:有 | sohu.com、163.com、baidu.com | 未收录/未上榜 |
| 论文 参考文献 格式 国标 | 百度:有 / Bing:有 | baidu.com、163.com、m.douyin.com | 未收录/未上榜 |
| 毕业论文 字体 字号 要求 | 百度:有 / Bing:有 | douyin.com、sohu.com、zhidao.baidu.com | 未收录/未上榜 |
| 毕业论文 摘要 字数 | 百度:有 / Bing:有 | sohu.com、baidu.com、zhidao.baidu.com | 未收录/未上榜 |
| 学位论文 撰写规范 | 百度:有 / Bing:有 | baijiahao.baidu.com、yjbys.com、baidu.com、renrendoc.com | 未收录/未上榜 |
| 毕业论文 页边距 设置 | 百度:有 / Bing:有 | douyin.com、easylearn.baidu.com、gwyoo.com、baidu.com | 未收录/未上榜 |
| 毕业论文 目录 格式 | 百度:有 / Bing:有 | baidu.com、sohu.com、douyin.com | 未收录/未上榜 |
| 毕业论文 封面 格式 | 百度:有 / Bing:有 | sohu.com、163.com、douyin.com | 未收录/未上榜 |
| 开题报告 格式要求 | 百度:有 / Bing:有 | jianshu.com、douyin.com、mbd.baidu.com | 未收录/未上榜 |
| 毕业论文 致谢 格式 | 百度:有 / Bing:有 | sohu.com、news.qq.com、douyin.com、gwyoo.com | 未收录/未上榜 |
| 论文 行距 要求 | 百度:有 / Bing:有 | news.qq.com、sohu.com、lunwenchang.cn、baidu.com | 未收录/未上榜 |
| 各高校 论文格式 查询 | 百度:有 / Bing:有 | baidu.com、zhidao.baidu.com | 未收录/未上榜 |

**结论：需求信号真实且强**（每所高校的格式要求都有完整的搜索建议链）。但百度首页由 ①高校官网（.edu.cn，权威不可撼动）②新闻门户转载（sohu/163）③文档站占据。我方差异化在"全国高校汇总+结构化对比"，属长尾聚合打法，需先解决收录，再验证长尾词（"XX大学+格式+具体项"）能否进首页。风险：百度不收录则该线在国内几乎无入口。

### 3.2 tiku.zalize.com（百度为主战场）

autocomplete 命中：百度 19/20、Bing 19/20。

| 关键词 | 搜索建议 | 百度首页竞争对手（Top 结果域名） | 我方排名 |
|---|---|---|---|
| 行测 数量关系 练习题 | 百度:有 / Bing:有 | k.sina.com.cn、sohu.com、jianshu.com、163.com | 未收录/未上榜 |
| 行测 资料分析 题库 | 百度:无 / Bing:有 | 163.com、baidu.com | 未收录/未上榜 |
| 行测 判断推理 练习 | 百度:有 / Bing:有 | 163.com、sohu.com、k.sina.com.cn、baijiahao.baidu.com | 未收录/未上榜 |
| 行测 言语理解 题库 | 百度:有 / Bing:有 | sohu.com、douyin.com、mp.weixin.qq.com | 未收录/未上榜 |
| 常识判断 题库 | 百度:有 / Bing:有 | baidu.com | 未收录/未上榜 |
| 公务员 行测 免费题库 | 百度:有 / Bing:有 | baidu.com | 未收录/未上榜 |
| 教师资格证 综合素质 真题 | 百度:有 / Bing:有 | douyin.com、baidu.com、163.com | 未收录/未上榜 |
| 教师资格证 教育知识与能力 题库 | 百度:有 / Bing:有 | renrendoc.com、baidu.com、ntce.neea.edu.cn | 未收录/未上榜 |
| 小学教资 教育教学知识 真题 | 百度:有 / Bing:有 | baidu.com、douyin.com | 未收录/未上榜 |
| 幼儿教资 保教知识 题库 | 百度:有 / Bing:有 | douyin.com、sohu.com、baidu.com | 未收录/未上榜 |
| 教资 每日一练 | 百度:有 / Bing:无 | sohu.com、k.sina.com.cn | 未收录/未上榜 |
| 教师资格证 模拟题 免费 | 百度:有 / Bing:有 | aistudy.baidu.com、baidu.com、jiaoshi.koolearn.com | 未收录/未上榜 |
| 事业单位 公基 题库 | 百度:有 / Bing:有 | sohu.com、douyin.com、baidu.com | 未收录/未上榜 |
| 公共基础知识 练习题 | 百度:有 / Bing:有 | baidu.com | 未收录/未上榜 |
| 事业编 题库 免费 | 百度:有 / Bing:有 | douyin.com、baidu.com、ddooo.com | 未收录/未上榜 |
| 公务员 每日一练 | 百度:有 / Bing:有 | jianshu.com、sohu.com、m.ah.huatu.com | 未收录/未上榜 |
| 行测 刷题 网站 | 百度:有 / Bing:有 | douyin.com、163.com、bilibili.com、wantiku.com | 未收录/未上榜 |
| 教资 刷题 网站 | 百度:有 / Bing:有 | douyin.com、ntce.neea.edu.cn、zhidao.baidu.com、mp.weixin.qq.com | 未收录/未上榜 |
| 公考 题库 在线 | 百度:有 / Bing:有 | baidu.com、tiku.offcn.com、tool.gwy.com、wantiku.com | 未收录/未上榜 |
| 免费 刷题 网站 公务员 | 百度:有 / Bing:有 | m.sohu.com、sohu.com、163.com、baidu.com | 未收录/未上榜 |

**结论：需求真实且巨大，但竞争是四站中最强的**：粉笔、中公（offcn）、华图等头部机构垄断所有核心词，且用户习惯 App 刷题。我方 8617 页已具规模，机会在超长尾（具体知识点+题型）与"免费无登录网页刷题"差异化。需求信号：有；正面竞争可行性：低；长尾可行性：待收录后验证。

### 3.3 speech.zalize.com（Google 为主战场）

autocomplete 命中：Google 20/20、Bing 17/20。"best man speech generator **free**/**ai**" 等修饰词出现在建议中，商业意图明确。

| 关键词 | 搜索建议 | Google首页竞争对手（Top 结果域名） | 我方排名 |
|---|---|---|---|
| best man speech generator | Google:有 / Bing:有 | bestmanspeechai.com、easy-peasy.ai、celebrateally.com、aiweddingtoast.com | 未收录/未上榜 |
| wedding toast generator | Google:有 / Bing:有 | aiweddingtoast.com、celebrateally.com、toastwiz.com、toastpal.com | 未收录/未上榜 |
| maid of honor speech generator | Google:有 / Bing:有 | easy-peasy.ai、celebrateally.com、aiweddingtoast.com、dessy.com | 未收录/未上榜 |
| eulogy writer ai | Google:有 / Bing:有 | eulogyexpert.com、originality.ai、trustworthy.com、funeralbasics.org | 未收录/未上榜 |
| retirement speech generator | Google:有 / Bing:无 | speechgenerator.co、celebrateally.com、vidday.com、vondy.com | 未收录/未上榜 |
| graduation speech generator | Google:有 / Bing:有 | celebrateally.com、capitalizemytitle.com、momentwords.com、morphic.com | 未收录/未上榜 |
| birthday speech generator | Google:有 / Bing:无 | speechgenerator.co、partygeniusai.com、greatspeechwriting.co.uk、elevenlabs.io | 未收录/未上榜 |
| ai speech writer | Google:有 / Bing:有 | easy-peasy.ai、perfectassistant.ai、word.studio、typli.ai | 未收录/未上榜 |
| best man speech examples | Google:有 / Bing:有 | reddit.com、thebestmanspeech.com、bradmontgomery.com、youtube.com | 未收录/未上榜 |
| wedding speech for sister | Google:有 / Bing:有 | theknot.com、reddit.com、lovelylettersbyamanda.com、youtube.com | 未收录/未上榜 |
| father of the bride speech | Google:有 / Bing:有 | theknot.com、weddingspeechbuilder.com、youtube.com、hitched.co.uk | 未收录/未上榜 |
| how to write a eulogy | Google:有 / Bing:有 | rememberingalife.com、jameshcole.com、aldenharrington.com、reddit.com | 未收录/未上榜 |
| discurso boda padrino | Google:有 / Bing:无 | translate.google.com、speechmate.com、elcomercio.pe、reddit.com | 未收录/未上榜 |
| discurso de boda ejemplos | Google:有 / Bing:有 | bodas.com.mx、bodacivil.org、celinni.com、planning.wedding | 未收录/未上榜 |
| generador de discursos | Google:有 / Bing:有 | jotform.com、easy-peasy.ai、wrizzle.ai、iweaver.ai | 未收录/未上榜 |
| discours mariage témoin | Google:有 / Bing:有 | mariages.net、bridebook.com、flexilivre.com、celinni.com | 未收录/未上榜 |
| Hochzeitsrede Trauzeuge | Google:有 / Bing:有 | kartenmacherei.de、weddyplace.com、youtube.com、weddingstyle.de | 未收录/未上榜 |
| discurso de formatura | Google:有 / Bing:有 | educamaisbrasil.com.br、pensador.com、ifmg.edu.br、medicina.ufba.br | 未收录/未上榜 |
| 結婚式 スピーチ 例文 | Google:有 / Bing:有 | zexy.net、niwaka.com、anniversaire.co.jp、detail.chiebukuro.yahoo.co.jp | 未收录/未上榜 |
| wedding speech ai free | Google:有 / Bing:有 | aiweddingtoast.com、easy-peasy.ai、replaymyday.com、verble.app | 未收录/未上榜 |

**结论：四站中信号最好的一条线。** 需求真实（婚礼/悼词/退休等场景词全部有建议链），首页对手多为小型独立站（easy-peasy.ai、aiweddingtoast.com、celebrateally.com、bestmanspeechai.com）而非巨头，Reddit 高频出现说明用户在主动找工具与模板。我方多语言（es/pt/de/fr/ja/zh）矩阵是差异化（西语 discurso boda padrino 等词竞争明显更弱）。当务之急仍是 Google 收录（目前 0）。

### 3.4 data.zalize.com（Google 为主战场）

autocomplete 命中：Google 12/20、Bing 20/20（Google 命中率四站最低）。

| 关键词 | 搜索建议 | Google首页竞争对手（Top 结果域名） | 我方排名 |
|---|---|---|---|
| job postings dataset | Google:有 / Bing:有 | kaggle.com、reddit.com、aws.amazon.com、marketplace.databricks.com | 未收录/未上榜 |
| job postings dataset with salary | Google:无 / Bing:有 | kaggle.com、marketplace.databricks.com、aws.amazon.com | 未收录/未上榜 |
| app store reviews dataset | Google:有 / Bing:有 | kaggle.com、data.mendeley.com、marketplace.databricks.com | 未收录/未上榜 |
| google play reviews dataset | Google:有 / Bing:有 | kaggle.com、datacamp.com、sourestdeeds.github.io、github.com | 未收录/未上榜 |
| shopify products dataset | Google:有 / Bing:有 | huggingface.co、apps.shopify.com、datarade.ai、kaggle.com | 未收录/未上榜 |
| ecommerce product dataset download | Google:无 / Bing:有 | kaggle.com、github.com、datacamp.com | 未收录/未上榜 |
| buy web scraped data | Google:无 / Bing:有 | datarade.ai、reddit.com、oxylabs.io、scraperapi.com | 未收录/未上榜 |
| datasets for ai training | Google:有 / Bing:有 | kaggle.com、humansintheloop.org、huggingface.co、blog.depositphotos.com | 未收录/未上榜 |
| llm training data marketplace | Google:无 / Bing:有 | opendatabay.com、flitto.com、iproyal.com、github.com | 未收录/未上榜 |
| app store data api | Google:有 / Bing:有 | developer.apple.com、stackoverflow.com | 未收录/未上榜 |
| job market data api | Google:有 / Bing:有 | jobdataapi.com、coresignal.com、jobdatafeeds.com、bls.gov | 未收录/未上榜 |
| salary data by job title dataset | Google:无 / Bing:有 | kaggle.com、bls.gov、payscale.com | 未收录/未上榜 |
| product price history dataset | Google:有 / Bing:有 | kaggle.com、axesso.de、datarade.ai、camelcamelcamel.com | 未收录/未上榜 |
| web datasets for machine learning | Google:有 / Bing:有 | archive.ics.uci.edu、kaggle.com、openml.org、en.wikipedia.org | 未收录/未上榜 |
| affordable datasets for startups | Google:无 / Bing:有 | explodingtopics.com、greyb.com、reddit.com、datarade.ai | 未收录/未上榜 |
| review sentiment dataset | Google:有 / Bing:有 | kaggle.com、ai.stanford.edu、github.com、analyticsvidhya.com | 未收录/未上榜 |
| job postings data provider | Google:有 / Bing:有 | linkup.com、lightcast.io、hiringlab.org、peopledatalabs.com | 未收录/未上榜 |
| alternative data marketplace | Google:有 / Bing:有 | exabel.com、brightdata.com、neudata.co、passby.com | 未收录/未上榜 |
| clean datasets for developers | Google:无 / Bing:有 | linkedin.com、medium.com、dataquest.io、reddit.com | 未收录/未上榜 |
| public web data licensing | Google:无 / Bing:有 | resources.data.gov、opendatacommons.org、yougov.com、ospo.cc.gatech.edu | 未收录/未上榜 |

**结论：搜索侧需求信号偏弱且分裂。** "xx dataset" 类词由 Kaggle/GitHub（免费心智）垄断，商业采购词由 Datarade、BrightData、Databricks Marketplace 占据；11 页体量也不足以做 SEO。该线获客更适合 marketplace 挂牌（Datarade 可免费列出）与开发者社区路线，SEO 只作长尾补充（如 "job postings dataset with salary" 这类 Google 无建议但 Bing 有建议的缝隙词）。

## 四、结论与下一步（如无异议将按此执行）

1. **收录是四站共同的 0→1 瓶颈**：IndexNow 已提交（Bing 侧）；Google 侧无账号只能靠外链——建议 zalize.com 各兄弟站互链，并在允许自荐的社区（Reddit 相关 sub 工具帖、HN Show HN）发布对社区真实有用的内容带回链。百度侧无账号无法主动提交，依赖自然抓取（周期长），guifan/tiku 两条中文线受此制约最大。
2. **优先级排序（需求信号×竞争可行性）**：speech > guifan > tiku > data。
3. 一周后复查三引擎收录量与 IndexNow 生效情况，产出对比数据。
4. data 线建议转向 marketplace/社区获客验证，不再单押 SEO。

## 附：证据清单

- IndexNow key 上线验证（可直接访问核查）：
  - https://guifan.zalize.com/3c4caa144734285f611e1f8f8c28869b.txt
  - https://tiku.zalize.com/3c4caa144734285f611e1f8f8c28869b.txt
  - https://data.zalize.com/3c4caa144734285f611e1f8f8c28869b.txt
  - https://speech.zalize.com/26caaae7cbc07476ceb9d0b58ed0c13f.txt
- site: 查询可自行复查：`site:guifan.zalize.com` 等（三引擎，截至 2026-08-01 均为 0）
- SERP/建议原始数据：Playwright 实测 + 各引擎官方 suggest 接口，本报告表格由原始 JSON 生成
