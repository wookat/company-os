# Daily Games 国际化：目标市场与语言优先级报告

> 角色：market-researcher ｜ 依据 SOP-02 ｜ 数据采集日期：2026-08-01
> 决策用途：直接指导 daily.zalize.com（免费+广告变现的英文每日网页游戏矩阵）国际化的工程排期——先做哪些语言、每种语言做到什么深度、日切策略怎么定。

## 结论（前置）

**语言优先级排序（如无异议将按此执行）：**

| Tier | 语言 | 建议本地化深度 | 理由（一句话） |
|---|---|---|---|
| Tier 0（已覆盖） | 英语（US/UK/CA/AU） | 持续深耕 SEO | eCPM 最高（US 展示 RPM $12–40），Wordle 类原生市场 |
| **Tier 1** | 德语（DE/AT/CH） | UI + SEO 落地页 + 词库 | 西欧最高 eCPM（RPM $8–22、Q2'25 激励视频 eCPM 增速全球第一），每日词游戏已验证（6mal5），但每日谜题矩阵类竞品本地化空白大 |
| **Tier 1** | 葡语（巴西） | UI + SEO 落地页 + 词库 | Termo 峰值 50 万+ 日活证明品类接受度极高；Poki 流量第 3（~10%）；eCPM 低但量大、分享文化强 |
| **Tier 1** | 西语（ES + 拉美） | UI + SEO 落地页 + 词库 | 覆盖 5 亿+ 人口、单词库服务约 20 国；"Wordle (ES)" 生态成熟（媒体每日发攻略），竞品多为单游戏站、无矩阵 |
| **Tier 2** | 法语（FR/CA/BE） | UI + SEO 落地页（词库视 Tier 1 效果） | Sutom 30 万日活验证品类，但法国市场本地竞品密度已高（Sutom/Cémantix/LeMot） |
| **Tier 2** | 日语 | 仅 UI + SEO（词类游戏暂不做词库） | eCPM 高（前 10），但假名词库工程成本高、每日谜题文化偏 app（脑トレ）而非 web |
| **Tier 3** | 韩语、印尼语、印地语 | 仅 UI（机器翻译+人工校对） | 韩：市场小+竞品（꼬들）已占位；印尼/印地：量大但 RPM $0.5–3.5，仅值得低成本 UI 覆盖 |
| **暂缓** | 简中 | 不做 | 广告生态（AdSense 不可用）、合规（ICP/版号）与访问性问题，ROI 为负 |

**核心判断：** 广告变现产品的国际化优先级 ≈ eCPM × 流量潜力 × 品类已验证度 − 竞品密度。德/葡(BR)/西 三语同时满足"高分值、竞品是单游戏站而非矩阵站"→ 首批做；我们真正的差异化是**把「每日谜题矩阵 + streak + 分享」整站体验本地化**，而非再造一个单一 Wordle 克隆。

**工程排期建议（可直接排）：**
1. **Sprint A（语言无关基建）**：i18n 框架（UI 字符串抽取）、`hreflang`/子路径路由（`/de/`、`/pt/`、`/es/`）、Intl 数字/日期格式化、分享文案模板多语化。所有游戏受益。
2. **Sprint B（Tier 1 UI+SEO）**：德/葡/西 三语 UI 文案 + 每游戏 SEO 落地页（How-to-play 长文案本地化，参照现有英文页结构）。
3. **Sprint C（词库本地化）**：WordBridge/Chainle 的 de/pt/es 词库（详见 §3 拆解）；语言无关游戏（Numlock/GridSpark/DropStack/EpochLens）零词库成本即可全球化，优先放进 Tier 1 落地页主推。
4. **Sprint D（Tier 2 扩展）**：法语复用 Sprint B 流水线；日语仅 UI。

---

## 1. 四维评估

### 1.1 网页游戏用户规模（各语言市场）

代理指标：Poki / CrazyGames 的国别流量分布（两大 web 游戏门户，月访问 1–2 亿级）。

- **Poki**（~2.0 亿月访问，Similarweb/Hypestat 口径）：US 13.8–17.0%、印度 8.9–10.7%、巴西 ~10%、土耳其 5.3–6.3%、波兰/越南次之。来源：[Semrush poki.com](https://www.semrush.com/website/poki.com/overview/)、[Hypestat](https://hypestat.com/info/poki.com)
- **CrazyGames**（~1 亿月访问）：US 16–19%、印度 8–10%、土耳其 ~5.5%、澳大利亚 3.9–5.9%、德国 4.5–5.6%、巴西 3.3–3.8%。来源：[Semrush crazygames.com](https://www.semrush.com/website/crazygames.com/overview/)、[TechList](https://techlist.ai/crazygames.com)
- 宏观：全球玩家 36 亿（2025，[Newzoo GGMR 2025](https://newzoo.com/resources/trend-reports/newzoo-global-games-market-report-2025)）；US+中国占消费额 50%，但 web 免费游戏的"流量池"分布远比消费额分散（上面门户数据即证）。

**推断（置信度：高）**：英语圈之外，web 游戏流量池最大的可本地化语言市场依次是：印地/印尼等新兴市场（量大价低）、葡语巴西、德语、西语、土耳其语。德国在 CrazyGames 上排进前 5，且是桌面端占比高的市场——每日谜题（上班摸鱼场景）契合。

### 1.2 展示 / 激励广告 eCPM

- AdSense 展示 RPM 分层（2026 基准，[Adstimate](https://adstimate.com/blog/adsense-rpm-by-country.html)）：US/CA $12–40 > UK/AU $10–30 > 西欧（德法等）$8–22 > 印度/菲律宾/巴基斯坦 $0.5–3.5。
- 国别 eCPM 排名（2025，[FactInBD 汇总](https://in.factinbd.com/2025/10/24/top-countries-with-highest-google-adsense-cpc-and-ecpm-in-2025/)，口径偏乐观、取相对序）：US > CA > UK > AU > DE > SG > 北欧 > NZ > JP。日本进前 10；韩国未进前 10。
- 激励视频：US 游戏受众 eCPM ~$15–30（[AppLixir/AdMob 汇总](https://www.applixir.com/blog/comparing-major-ad-networks-for-rewarded-video-ads/)）；2025 Q2 德国激励视频 eCPM 环比 +42.7%（iOS），为五大样本国最强，印度普跌（[Bidlogic Q1–Q2 2025](https://bidlogic.io/2025/07/25/ecpm-growth-in-mobile-apps-q1-q2-2025-analysis-and-insights/)）。
- 巴西/拉美/东南亚属 Tier 2–3：eCPM 约为 US 的 1/5 – 1/15（多来源一致方向；具体倍数**未验证**）。

**事实（置信度：高）**：单位流量广告价值 英语圈 ≥ 德 > 法/日 > 西班牙 > 拉美/巴西 >> 印尼/印地。巴西/西语拉美靠"量 × 品类热情"补价差。

### 1.3 每日谜题品类接受度（Wordle 各语言变体的验证数据）

| 语言 | 变体 | 验证数据 | 来源 |
|---|---|---|---|
| 葡(BR) | Termo (term.ooo) | 上线 1 个月 50 万+ 日活，峰值 60 万+/日（85% 巴西人） | [Wikipedia](https://pt.wikipedia.org/wiki/Term.ooo)、[O Globo 2022-03](https://oglobo.globo.com/cultura/termo-wordle-brasileiro-conquista-publico-gera-ate-ameacas-de-morte-em-dias-de-palavras-dificeis-25419531) |
| 法 | Sutom | ~30 万日活；衍生 Cémantix/Motchus 等生态 | [Connexion France 2022-06](https://www.connexionfrance.com/magazine/thousands-play-wordle-like-word-game-inspired-by-old-french-tv-show/116441) |
| 西 | Wordle (ES)「La Palabra del Día」 | 至今每日更新至 1600+ 期；AS/Vandal 等主流媒体每日发提示文章（媒体愿为其产内容=流量证明） | [Meristation 2026-06](https://as.com/meristation/betech/wordle-en-espanol-y-tildes-para-el-reto-de-hoy-2-de-junio-pistas-y-solucion-f202606-n/) |
| 德 | 6mal5 / wordle.at 等 | 自称"最受欢迎的德语单词游戏"，2022 至今持续运营 | [6mal5.com](https://www.6mal5.com/) |
| 日 | Kotobade Asobou / Kotonoha Tango | 存在且被 Japan Times 报道，但规模明显小于欧语变体 | [Japan Times 2022-02](https://www.japantimes.co.jp/life/2022/02/02/language/wordle-easy-try-japanese/) |
| 韩 | 꼬들 (kordle.kr) / wordle.global/ko | 存在、竞品已占位；无大流量报道 | [wordle.global/ko](https://wordle.global/ko) |

**事实（置信度：高）**：每日谜题"同一题全球共解 + emoji 分享 + streak"模式在 葡(BR)、法、西、德 已被大规模验证；日/韩存在但量级弱一档。

### 1.4 竞品本地化空白

- Poki/CrazyGames 做的是**门户级多语言**（站点 UI 多语），但其内容以嵌入第三方 HTML5 游戏为主，**"每日谜题矩阵"（NYT Games / LinkedIn Games 模式）在非英语市场没有强势对标**——NYT Games、LinkedIn Games 均只有英文。
- 非英语市场的每日谜题竞品几乎都是**单游戏站**（Termo、Sutom、6mal5、La Palabra del Día），无矩阵、无统一 streak/账户/分享体系 → 这是 Daily Games 的差异化切口。
- 法语市场例外：单游戏竞品密度已高（Sutom+Cémantix+LeMot+Motchus 分食），故降为 Tier 2。
- 简中：主流广告网络不可用 + ICP/版号合规成本，Wordle 类中文变体（如汉兜）流量也证明品类可行，但变现路径断裂 → 暂缓。

## 2. 语言优先级排序（综合打分）

打分 1–5（规模=门户流量代理；eCPM=展示+激励综合；接受度=§1.3；空白=竞品越少分越高）：

| 语言 | 规模 | eCPM | 品类接受度 | 本地化空白 | 加权结论 |
|---|---|---|---|---|---|
| 德 | 3 | 5 | 4 | 4 | **Tier 1** |
| 葡(BR) | 4 | 2 | 5 | 4 | **Tier 1** |
| 西(ES+LatAm) | 4 | 3 | 4 | 4 | **Tier 1** |
| 法 | 3 | 4 | 5 | 2 | Tier 2 |
| 日 | 3 | 4 | 2 | 4 | Tier 2（仅 UI） |
| 韩 | 2 | 3 | 2 | 2 | Tier 3 |
| 印尼/印地 | 5 | 1 | 2（未验证） | 5 | Tier 3（仅 UI，低成本试水） |
| 简中 | — | 1 | 4 | 3 | 暂缓 |

## 3. Tier 1 各语言的本地化深度建议（按游戏拆解）

按语言相关性把现有 12 款游戏分三档：

**A. 语言无关（零词库成本，直接全球化）—— 首发主推**
- **Numlock、GridSpark、DropStack**：纯数字/逻辑/物理，仅需 UI 文案 + How-to-play 翻译。
- **EpochLens**：图片猜年份，仅 UI + 事件说明文案翻译（说明文案量小）。

**B. 半语言相关（数据翻译，非词库重建）**
- **BorderRush、Timeline**：国名/历史事件名做 i18n 映射即可（CLDR 有现成国名翻译表）；输入匹配需支持本地语言国名+别名。
- **InfiniteAlchemy**：元素名由 LLM 生成 → 在 prompt 层加目标语言即可，成本低；注意跨语言"同一元素"的规范化（建议内部 canonical 英文 ID + 展示层翻译）。

**C. 强语言相关（需本地词库/内容重建，Tier 1 才做）**
- **WordBridge**（16 词分 4 组）：需要母语级词库与"组间桥接主题"，直译不可用。建议 LLM 生成 + 母语审校流水线，de/pt/es 各先备 90 天题量。
- **Chainle**（词梯）：需本地五字词库；可复用开源词表（Termo 作者整理过 1.8 万葡语五字词的方法论；德语注意变音字母 ä→ae 惯例，参照 6mal5/deutschwordle 的处理）。
- **Interrogate / Daily AI Detective**（LLM 对话）：LLM 天然多语，成本在 prompt 与案情文本本地化 + 各语言输出质量 QA；建议 Tier 1 后半程做。

**深度矩阵（Tier 1 三语）：** UI 文案 ✅ 全部游戏；SEO 落地页 ✅ 全部游戏（每游戏每语言一页，含本地化 How-to-play，复用现有英文页 SEO 结构）；游戏内容词库 ✅ 仅 C 档（WordBridge/Chainle 优先，Detective/Interrogate 次之）。

## 4. 时区 / 日切（UTC）影响与建议

现状：全球统一题目。若日切固定 UTC 00:00，各市场体验：

| 市场 | UTC 00:00 对应本地时间 | 体验 |
|---|---|---|
| 美西/美东 | 前一天 16:00–20:00 | 傍晚换题，"今天的题"跨自然日，轻度困惑（NYT Wordle 用本地午夜，用户已习惯本地日切） |
| 欧洲（德/法/西） | 01:00–02:00 | 接近本地午夜，体验好 |
| 巴西 | 21:00 | 晚间换题，尚可（Termo 玩家习惯午夜刷题+早晨通勤玩） |
| 日/韩 | 09:00 | **差**：早晨通勤高峰期换题，streak 易断（前晚玩的算"昨天"） |
| 印尼/印地 | 05:30–07:00 | 早晨换题，一般 |

**建议（如无异议将按此执行）：**
1. **保留全球统一题目 + 统一 UTC 日切**（同题全球共解是分享传播的核心，且防跨时区剧透；Termo/Wordle Global 均为全球同题）。不做每时区独立日切——会造成剧透与排行榜不公。
2. **工程侧缓解**：倒计时组件显示"距下一题 xx:xx"（已有则保留）＋ streak 判定给 **±数小时宽限**（按"两次完成间隔 <48h"计连击而非按日历日），解决日/韩早晨换题断签痛点。
3. 若日语市场后续做大，再评估"亚太镜像日切"（同题、亚太延后 8h 解锁）——**不可逆性低，先不做**。
4. 每日推送/邮件类唤回（若做）按用户本地时区发送，与日切解耦。

## 5. 风险与遗留

- 门户流量分布是"web 游戏大盘"的代理指标，不等于"每日谜题"品类分布（后者更偏欧美白领）；已用 Wordle 变体数据交叉校正。
- eCPM 数据源为行业汇总（Adstimate/FactInBD/Bidlogic），非我站实测；上线 Tier 1 后应以 AdSense 实际 RPM 复核并回填本报告（标注：时效敏感，采集于 2026-08）。
- Wordle 变体日活数据多为 2022 年高峰期报道，当前留存规模**未验证**，但品类接受度结论不受影响（媒体至今每日发攻略可佐证西语；6mal5 持续运营佐证德语）。
