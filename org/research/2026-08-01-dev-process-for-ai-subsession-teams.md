# 成熟团队开发组织与流程调研 → AI 子会话团队落地架构方案

- 日期：2026-08-01
- 调研员：company-researcher（子会话）
- 委托方：RankedByAI 项目负责人（父会话）
- 背景问题：当前迭代粒度过细（一轮一个小 PR，如 R138/R139/R140 各一个 PR），负责人审计带宽被大量小 PR 消耗，效率低。
- 关键约束：**子会话免费且可大规模并行；负责人（父会话）审计带宽是唯一稀缺资源。**

---

## 一、六种模式的核心机制、适用规模与优缺点

### 1. Linear Method（Linear）

来源：https://linear.app/method/introduction 、https://linear.app/method/scope-projects 、https://linear.app/docs/use-cycles

核心机制：
- **n 周 cycle（常用 2 周）**：固定节奏自动滚动，未完成项自动顺延，不为排期做"日历俄罗斯方块"。
- **Project 为交付单位、Issue 为工作单位**：Project 设计为 1–3 人 1–3 周可完成；每个 Project 必须有**单一负责人**写 project brief 并对交付负责。
- **写 brief 而非 user story**：直接说要做什么，消灭歧义；"unshipped code is debt"，靠缩小 scope 保持持续出货。
- **momentum > 冲刺**：马拉松式的稳定节奏，不追求爆发。

适用规模：5–50 人产品团队；对小团队尤其友好。

### 2. Shape Up（Basecamp）

来源：https://basecamp.com/shapeup（全书）、https://basecamp.com/shapeup/2.2-chapter-08（Betting Table）

核心机制：
- **Appetite（胃口）反转估算**：不问"这要做多久"，而问"这件事值得花多少时间"（big batch 6 周 / small batch 1–2 周），然后把方案裁剪进这个时间盒。
- **Shaping**：下注前由资深人员把问题收敛成"有边界、无兔子洞"的 pitch（问题 + appetite + 方案轮廓 + no-gos）。
- **Betting Table**：cool-down 期间高层一小时会议，只看几个成型 pitch 下注，**没有 backlog、不做 grooming**——重要的想法自己会回来。
- **6 周 cycle + 2 周 cool-down**；cycle 内不打扰团队、不开日会。
- **Circuit breaker（熔断器）**：6 周做不完默认不延期、直接砍掉，防止僵尸项目。
- 明确指出**2 周 sprint 的规划开销不划算**："two weeks is too short to get anything meaningful done… extremely costly due to the planning overhead"。

适用规模：小而精的团队（Basecamp 长期 <60 人），每个项目 1 设计师 + 1–2 程序员。

### 3. Stripe / Amazon：写作文化 + 单线程负责人（STL）

来源：
- Amazon《Working Backwards》要点：https://www.sachinrekhi.com/p/colin-bryar-working-backwards
- Amazon 6-pager / 机制：https://www.factoftheday1.com/p/november-30-4-mechanisms-at-amazon 、https://www.businessinsider.com/amazon-engineer-6-page-memos-reading-culture-jeff-bezos-2025-7
- Single-threaded owner：https://www.currentwisdom.com/writing/2018/09/10/ownership-is-about-trust
- Stripe 写作文化：https://slab.com/blog/stripe-writing-culture/ 、https://kenneth.io/post/writing-cultures-will-win-the-ai-era

核心机制：
- **叙事文档代替口头/幻灯**：6-pager / PR-FAQ 强迫写作者把思考做完整，评审者以读代听——信息密度高、可异步、可留档。Stripe 的"memos before meetings、决策日志、书面周报（15-5）"同理：**写作即基础设施**。
- **Single-threaded owner**：每个重要事项有且只有一个全职负责人，"badly run projects have a part-time owner"；两披萨团队保证 owner 可独立行动。
- **Working backwards**：从新闻稿/用户结果倒推开发。

适用规模：从 10 人到 10 万人都成立——写作文化是少数能随规模线性扩展的协作机制。

### 4. Spotify Squad/Tribe 模型（及失败教训）

来源：https://www.jeremiahlee.com/posts/failed-squad-goals/ 、https://businessofsoftware.org/2020/06/lessons-critique-spotifys-failed-squad-model/ 、https://thinkinglabs.io/notes/2021/12/29/lascot-you-can-do-better-than-the-spotify-model-joakim-sunden.html

机制：squad（自治小队，mini-startup）→ tribe（部落）→ chapter/guild（横向职能线）。矩阵式管理，追求团队自治。

失败教训（连模型合著者都劝人别抄）：
- **自治过度 + 缺乏对齐**：squad 各自为战，跨 squad 协作没有机制保障，"a collection of cross-functional teams with too much autonomy and a poor management structure"。
- **矩阵管理引入的问题多于解决的**：工程经理不懂团队业务、无法裁决优先级冲突。
- 模型本身"从未被完全实现过"，是理想化宣传物。

对我们的警示：**并行 ≠ 自治**。子会话并行度可以很高，但对齐与裁决必须集中在负责人一处，不能让每条线自定优先级。

### 5. YC 早期公司的每周迭代与增长节奏

来源：https://www.ycombinator.com/blog/ycs-essential-startup-advice 、https://www.ycombinator.com/blog/tips-ship-early-and-often

核心机制：
- **每周一个可度量目标**（周增长率是唯一北极星），launch early、ship early and often；v0 思维——最小可用先上线，市场反馈代替内部争论。
- **Do things that don't scale**：增长期靠人肉手段先拿第一批用户，别提前建"规模化流程"。
- **90/10 solution**：永远先找 10% 工作量拿到 90% 效果的方案。

适用规模：<10 人、PMF 前后的公司——正是我们所处阶段。

### 6. AI 时代的 agent 团队实践

来源：
- Claude Code Agent Teams（官方）：https://code.claude.com/docs/en/agent-teams.md
- 多 agent 编排模式综述：https://amux.io/guides/ai-agent-orchestration-2026/
- Agentic engineering 实操指南：https://amux.io/guides/agentic-engineering/

已收敛的共识：
- **五要素**：编排 = 并行 + 隔离（每 agent 独立分支/worktree）+ 通信 + 协调 + 可观测；缺一个就只是"一起跑"而非"编排"。
- **任务分解是第一技能**：派单前必须把工作切成**互不重叠的文件集**，否则合并冲突吃掉全部并行收益。
- **主流模式**：a) 并行独立任务（fan-out）；b) 流水线 plan → implement → test → review → merge；c) lead 会话协调 + teammates 独立上下文。
- **协调开销真实存在**：官方文档明确"agent teams add coordination overhead"，串行依赖强的工作单会话反而更快——并行只该用在真正独立的任务上。
- **异步评审是人类瓶颈**：实践者的通用结论是人类时间应全部花在 review 输出而非 babysit 过程。

### 对照表

| 模式 | 核心机制 | 节奏 | 适用规模 | 优点 | 缺点/风险 | 对我们的可移植性 |
|---|---|---|---|---|---|---|
| Linear Method | 2 周 cycle、project+owner、brief 写作、小 scope | 2 周 | 5–50 人 | 节奏稳、单位清晰（project=交付单位） | 对"审计带宽稀缺"没有专门设计 | ★★★★（project-as-unit、单一 owner） |
| Shape Up | appetite、shaping、betting table、熔断器 | 6 周 + 2 周冷却 | <60 人 | 规划开销极低、防僵尸项目、批量下注 | 6 周对 AI 速度太长 | ★★★★★（机制全适用，周期需压缩） |
| Amazon/Stripe | 6-pager/PR-FAQ、STL、working backwards | 持续 | 任意 | 异步高密度沟通=天然适配 agent；owner 唯一 | 写作本身有成本 | ★★★★★（文档就是子会话的天然接口） |
| Spotify | squad/tribe 自治矩阵 | 持续 | >100 人 | 并行度高 | 自治过度、对齐失败、矩阵混乱 | ★（只取教训：并行≠自治） |
| YC 节奏 | 周增长目标、v0、90/10、不规模化 | 1 周 | <10 人 | 与增长期完全对口 | 只讲节奏不讲组织 | ★★★★（作为节奏层叠加） |
| AI agent 团队 | fan-out+流水线、文件集隔离、异步 review | 小时–天 | n/a | 与子会话机制同构 | 协调开销、合并冲突 | ★★★★★（直接采用） |

---

## 二、落地方案：RankedByAI 的 AI 子会话团队架构

设计原则（由约束推导）：
1. 子会话免费 → **并行度不设上限，但每个并行单元必须是"互不重叠文件集 + 独立验收标准"**（AI agent 实践共识）。
2. 负责人审计带宽稀缺 → **审计单位从"PR"升级为"打包交付物"**（Shape Up 的 bet / Linear 的 project），一次审计覆盖 5–10 个改进；负责人只读**书面交付包**（Amazon/Stripe 写作文化），不逐 commit 看代码。
3. 增长获客期 → 节奏层用 YC 的**周目标制**，每 cycle 绑定一个可度量指标。
4. Spotify 教训 → 各线**不自定优先级**，裁决权 100% 集中在负责人的 betting 环节。

### 2.1 迭代单位改革（解决"粒度过细"的直接答案）

把现在的 R-编号"一个改进 = 一个 PR = 一次审计"改为三层结构：

- **Bet（下注单位）** = 一条主题线一个 cycle 的全部工作，如"SEO 技术包"。每个 Bet 有 appetite（小注=1 天等效 / 大注=3 天等效）、书面 pitch（问题/方案轮廓/no-gos/验收标准，模板化半页即可）。
- **PR（合并单位）** = 一个 Bet 产出 **1–2 个打包 PR**（同一文件集内的 5–10 个相关改进打包），而非 10 个碎 PR。
- **验收单位** = Bet 级交付包（见 2.4），负责人按 Bet 验收，不按 PR。

熔断器：任一 Bet 在 cycle 结束时未完成，默认砍掉不顺延（重要的会在下次 betting 自己回来），防止子会话僵尸线。

### 2.2 子会话角色编制（建议 5 条线 + 弹性蜂群）

| 线 | 角色（company-os/roles/） | 职责 | 并行度 |
|---|---|---|---|
| A 产品工程线 | fullstack-engineer ×2–3 | 每人认领 1 个 Bet 的功能开发（文件集互斥：如一人前端页面、一人 Worker API、一人 SEO 构建脚本） | 2–3 个 Bet 并行 |
| B 质量线 | qa-engineer + user-experience-officer | 对已部署 Bet 在 rank.zalize.com 真实环境做回归 + 六语言走查，产出缺陷清单（P0/P1/P2） | 每 cycle 1–2 实例，Bet 完成后启动 |
| C 增长内容线 | content-marketer / seo-specialist | 博客、对比页、六语言本地化内容、外链与收录 | 蜂群模式，可 5–20 实例批量产出 |
| D 增长工程线 | growth-engineer | 埋点、GSC/IndexNow、转化漏斗、waitlist | 1 实例 |
| E 调研/设计线 | company-researcher / ui-designer | 下一 cycle 的 shaping 素材：竞品、用户反馈、设计稿 | 按需 0–2 实例 |

要点：
- **每个 Bet 有且只有一个 owner 子会话**（Amazon STL / Linear owner）——一个 Bet 绝不拆给两个会话共管。
- 蜂群（C 线）产物是内容不是代码，冲突面小，是"免费并行"红利最大的地方，并行度尽管拉高。
- B 线与 A 线流水线衔接（plan → implement → test → review），而非同时开工。

### 2.3 迭代节奏

- **Cycle 长度：3 个自然日**（AI 等效产能 ≈ 人类团队 2 周 sprint；比 1 天长足以做成"有意义的事"，比 1 周短保持 YC 式反馈频率）。
- **每 cycle 打包量：2–3 个 Bet**（= 负责人一次审计 2–3 个交付包，约 4–6 个 PR），另加 C 线的内容批产出（清单式验收）。
- **Cool-down：半天**——负责人做 betting（读 pitch、下注下一 cycle）+ 部署合并 + 向老板发 SOP-04 汇报。
- 每 cycle 绑定一个**增长指标目标**（如"收录页数 +N""注册 +M"），YC 周目标制的压缩版。

### 2.4 负责人最小职责清单（每 cycle 一轮，其余时间不介入）

1. **Betting（≤1 小时）**：读 E 线/上轮遗留的 pitch，选 2–3 个 Bet，写半页 kick-off（目标/appetite/文件集边界/验收标准）派单。
2. **派单**：按 adapters/devin.md 模板注入 CHARTER + 角色文件 + pitch，分支命名约定（每 Bet 一分支）。
3. **中途零打扰**：cycle 内不巡视、不追问（Shape Up "leave the team alone"）；只处理子会话主动上报的阻塞。
4. **审计与合并（每 Bet ≤30 分钟）**：只读交付包——① 验收标准逐条对照表 ② 测试/录屏证据 ③ 部署预览；抽查而非通读 diff。通过则合并部署，不过打回一次，二次不过启动熔断。
5. **验收与汇报**：线上验证 + SOP-04 格式向老板汇报（结论/证据/下一步/需注意）。

负责人**不做**：写代码、逐 PR 代码评审、管理子会话过程、维护 backlog（没有 backlog，只有每轮的候选 pitch）。

### 2.5 书面化接口（Stripe/Amazon 移植）

- 派单 = **pitch 文档**（半页：问题/appetite/方案轮廓/no-gos/验收标准）——这就是子会话的 6-pager。
- 交付 = **交付包文档**（templates/acceptance-package.md）：验收对照表 + 证据 + 风险声明。
- 所有决策留档在 org/PROJECTS.md 的 cycle 日志里，形成可复盘的决策日志。

---

## 三、下一 cycle 示例计划（RankedByAI，3 天 cycle）

现状：六语言 AI 可见度 SaaS，增长获客期；Paddle（支付）与 GSC（站长验证）为外部等待项——按 CHARTER"资源缺口不阻塞"，支付线用沙箱先行，GSC 相关用 IndexNow/站内可控手段替代推进。

**Cycle 目标（增长指标）**：自然搜索可索引页面数 +50%，工具页 → 报告页转化路径无 P0 缺陷。

| Bet | Owner | Appetite | 内容（打包 5–10 个改进） | 验收标准 |
|---|---|---|---|---|
| Bet-1 SEO 技术包 | fullstack-engineer A | 大注（3 天等效） | 六语言 hreflang 全量核对、sitemap 分块、剩余页面 JSON-LD（延续 R138）、内链模块、Core Web Vitals 修复 | Rich Results 测试通过；sitemap 全部提交；Lighthouse SEO ≥ 95（六语言抽 3 语言） |
| Bet-2 转化与留存包 | fullstack-engineer B | 大注 | 报告页分享卡片（OG 图生成）、邮件捕获（Paddle 未通前的 waitlist 降级方案）、报告历史/对比视图、空状态与 onboarding 打磨 | 录屏演示完整漏斗；waitlist 写入 D1 可查；六语言文案齐全 |
| Bet-3 内容蜂群 | content-marketer ×8（蜂群） | 小注 | 8 篇对比/长尾文章 × 六语言本地化 + 博客索引（延续 R139 卡片栅格） | 48 个页面上线且进 sitemap；抽查 6 篇质量达标 |
| 流水线尾部：QA 回归 | qa-engineer + UX officer | 小注 | Bet-1/2 部署后线上回归 + 六语言走查 | 缺陷清单，P0/P1 修复后复验通过 |

产出：约 4–5 个打包 PR + 1 份内容清单；负责人审计点 3 个（每 Bet 一个交付包）+ 1 次 betting + 1 次 SOP-04 汇报。对比现状（同等工作量 ≈ 15+ 个碎 PR、15+ 次审计），审计带宽消耗下降约 70%。

Cool-down（第 4 天上午）：合并部署 → 收集 QA/UX 反馈生成下轮 pitch 候选（如：Paddle 到位后的付费墙 Bet、GSC 验证后的搜索表现分析 Bet）→ betting 下一轮。

---

## 四、核心结论（TL;DR）

1. **换审计单位，不是换并行度**：粒度过细的病根在"PR = 审计单位"。采用 Shape Up 的 Bet + Linear 的 project-as-unit，把 5–10 个改进打包成一个 Bet、1–2 个 PR、一个交付包，审计带宽消耗降 ~70%。
2. **appetite 反转派单**："这条线值得花多少"而非"做完要多久"，配熔断器防僵尸子会话。
3. **书面接口是 AI 团队的天然形态**：pitch 派单、交付包验收、决策留档——Amazon/Stripe 写作文化几乎零成本移植到子会话。
4. **并行 ≠ 自治**（Spotify 教训）：并行度尽管拉高（尤其内容蜂群），但优先级裁决 100% 集中在负责人的 betting 环节，没有 backlog。
5. **节奏建议**：3 天 cycle + 半天 cool-down，每 cycle 2–3 个 Bet + 内容蜂群，绑定一个增长指标（YC 周目标制压缩版）。
