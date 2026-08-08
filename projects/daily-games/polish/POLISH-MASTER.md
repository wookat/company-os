# 首批重点 10 款深度策划总案（POLISH-MASTER）

- 日期：2026-08-08 ｜ 作者：product-manager/游戏策划 ｜ 遵循 SOP-01/SOP-04
- 输入：polish-selection-report.md（选品）、matrix-score-report.md（100 款评分）
- 首批 10 款：crowns、craft、detective、wordfive、blockfall、merge2048、tubesort、sudodaily、heatword（吸收 nearby）、bubblepar
- 硬约束（全案不变）：**0 运行时 LLM**（AI 款内容一律离线预生成打包）、**日期种子全球同题**、**单局 2-5 分钟**、移动端 390px 优先。

## 一、翻修总策略

1. **两类差距，两种打法**：
   - 数据/品类头部款（crowns、detective、craft、heatword）：核心循环已成立，差距在「结算后 15 秒」（社会锚点/演出/次日钩子）——补钩子不动规则。
   - 流量品类但灰盒观感款（merge2048、blockfall、tubesort、sudodaily、wordfive、bubblepar）：玩法是成熟品类标准件，差距在 juice（动效/音效/仪式感）与头部级手感——像素级对标头部补齐。
2. **平台级组件优先于单款特效**（评分报告系统性结论：69 款工厂壳 C 维度全体 2.5）。以下 6 件一次开发、10 款首发挂载、其余 90 款渐进接入：
   - **SHELL-1 音效包**：命中/错误/完局三件套 + 音高递升 combo（参考 sharpeye 实现），Web Audio 合成音无素材版权。
   - **SHELL-2 微动效库**：按压回弹、正确弹跳、错误抖动、数字滚动、分数飘字（CSS/WAAPI，<5KB）。
   - **SHELL-3 结算演出模板**：成绩数字滚动 → 徽章判定 → emoji 分享卡 → 明日倒计时 → 「再玩一款」推荐卡（Wordle 三件套 + 矩阵导流）。
   - **SHELL-4 分享卡引擎**：emoji 网格（文本复制）+ Canvas 图片卡（1200×630，含站名/期号/无剧透成绩）双格式。
   - **SHELL-5 streak/统计页**：连胜火焰、打卡日历（补签券）、成绩分布直方图、里程碑（7/30/100 天）演出；localStorage + 现有匿名同步码。
   - **SHELL-6 难度日历**：星期分档统一约定——周一最易→周六最难、周日「变体日」（每款定义自己的变体），难度标签外显在标题与分享卡。**变体日两条全站铁律**：① streak 保护——变体日完成任意一局即续签、失败不断 streak，变体胜利另发专属徽章激励（周日是休闲高峰+最弱玩家在场，断签会精准惩罚最忠诚回访人群）；② 难度帽——变体日目标难度 ≤ 该款周三档（周日卖点是「新鲜感」不是「最难」），各分案已按此标定。
3. **进阶模式统一命名**：每款标配「Daily（默认）/ Hard（同种子高约束）/ Endless（无尽种子赛，`seed=date+run#`）」三档，入口在结算页（完赛才解锁当日 Hard——次日钩子 + 会话延长）。**Endless 边界约定**：Endless 为完赛后的可选加餐模式，不计入完赛/streak/分享卡默认文案，也不受 2-5 分钟验收约束（该约束只对 Daily/Hard 生效）。
4. **内部重复清理**：nearby 玩法并入 heatword（地理词表作为 heatword 周日变体日「Geo Day」），nearby 域名 301 到 heatword；tangodaily/duet 留 duet（本批不做）。

## 二、10 款分案索引与优先级

| 开工序 | 分案 | 一句话翻修主轴 | 预估 |
|---|---|---|---|
| 1 | [POLISH-crowns.md](./POLISH-crowns.md) | 唯一增长款：对齐 LinkedIn Queens 像素级 + 把 archive 回访产品化 | M |
| 2 | [POLISH-craft.md](./POLISH-craft.md) | 完成率 2.1% 急救：热身目标保底闭环 + 冷热方向反馈 | M |
| 3 | [POLISH-merge2048.md](./POLISH-merge2048.md) | 打磨空间 5/5：色阶+合并弹跳+连击，脱胎换骨成本最低 | S |
| 4 | [POLISH-blockfall.md](./POLISH-blockfall.md) | Block Blast juice 全套 + 击败 N% 成绩单 | M |
| 5 | [POLISH-wordfive.md](./POLISH-wordfive.md) | Wordle 三件套补全，做成门户每日入口款 | S |
| 6 | [POLISH-detective.md](./POLISH-detective.md) | 结案演出+证据链核对，推向招牌位 | M |
| 7 | [POLISH-sudodaily.md](./POLISH-sudodaily.md) | NYT 级反馈（行列波纹/完局演出）+ 同题三档挖空 | M |
| 8 | [POLISH-tubesort.md](./POLISH-tubesort.md) | 倒水流体动画（品类命根）+ 步数 par 闭环 | M |
| 9 | [POLISH-heatword.md](./POLISH-heatword.md) | 吸收 nearby：Geo Day 变体 + 复盘页 | S |
| 10 | [POLISH-bubblepar.md](./POLISH-bubblepar.md) | 瞄准线+爆裂+掉落连锁，卖相翻修 | M |

排序依据：数据 ROI（crowns/craft 有真实流量）→ 打磨空间/成本比（merge2048 S 级即巨变）→ 品类门面（wordfive/detective）→ 其余。SHELL-1~6 与 #1-3 并行开发，#4 起全部基于 SHELL 组件。

## 三、验收与度量

- 每款翻修后用同一 analytics 脚本对比前后 14 天 Complete/Start、Share/Complete、次日回访（qa 流量继续 blob8 隔离，推广前清当日污染统计）。
- 单款验收线：Complete/Start 提升 ≥50%（craft 目标 2.1%→10%+）；分享卡双格式可用；390px 无横向滚动；Lighthouse perf ≥90；Daily/Hard 单局仍在 2-5 分钟（Endless 不受此约束）。
- 翻修完成即申请门户「今日精选 3 款」大卡轮换位 + SEO 落地页（wordfive/sudodaily 品类词优先）。

## 四、需注意

- detective/craft/heatword 的「AI 感」全部用**离线预生成内容包**实现（构建时生成 N 天题库/文案池随包发布），运行时 0 LLM 调用，符合硬约束。
- 低用户量期所有对比锚点用「今日第 N 个解出 / 中位数」而非百分位（GAMEPLAY-V2 教训）。
- 音效默认开但首次交互后才初始化 AudioContext（自动播放策略），设置里可关。
