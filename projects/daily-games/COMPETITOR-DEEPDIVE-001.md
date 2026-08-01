# COMPETITOR-DEEPDIVE-001：每日游戏标杆实玩拆解 × 我方 8 款对照

- 日期：2026-08-01 ｜ 分析师：竞品拆解分析师（Devin）｜ 遵循 SOP-02 / SOP-04
- 实玩范围：标杆 6 款（Wordle、Connections、LinkedIn Queens、Tango、TimeGuessr、Contexto）+ 我方全部 8 款（daily.zalize.com #31, Aug 1）。Infinite Craft 被 Cloudflare 人机验证拦截未能实玩（见「局限」）。

## 一、结论（先说答案）

1. **老板说「没创意」只对了一半。** 8 款里 Interrogate（AI 审讯）、WordBridge（隐藏桥主题）、DropStack（同种子公平 suika）、InfiniteAlchemy 的 First Discovery 都有真差异化；GridSpark/Numlock/EpochLens/BorderRush 则是「诚实的 clone」（FAQ 自称 Queens/TimeGuessr alternative）。**真正的差距不在玩法创意，而在「结算之后的 15 秒」：** 标杆把爽感做在成绩对比、社交证明、次日钩子上，我们的结算模板只有本机统计 + 倒计时。
2. **最大单点缺口 = 社会锚点。** 我方 8 款中只有 InfiniteAlchemy（#29 of 30 today）和 DropStack（#2 of 6 today）有任何全球对比，其余 6 款的成绩（6 秒解出 Numlock、0 失误 WordBridge）无法回答玩家最想问的「我算好吗？」——这正是 Wordle Bot、LinkedIn 好友头像、TimeGuessr leaderboard、Contexto 分布条的共同职能。且 n=6 的真实数据暴露了冷启动问题：对比功能要配合「分位数而非绝对名次」的呈现。
3. **失败情绪设计我们已有全站最佳实践但没有复制。** Interrogate 败局的「法庭陈词 + 真实时间线 + 你本可抓到的 3 处矛盾」复盘是 8 款中唯一超过标杆水准的失败体验，应模板化推广。
4. Top 10 清单见第四节，前 3 项（分位数对比、结算导流卡、streak 日历+提醒）均为「一次开发、8 款复用」的平台级组件，杠杆最高。

## 二、标杆拆解矩阵（全部实玩，2026-08-01）

| 维度 | Wordle (6/6 通关) | Connections (Perfect) | Queens (3:11) / Tango (4:46) | TimeGuessr (36,340/50k) | Contexto (14 猜中) |
|---|---|---|---|---|---|
| 30 秒上手 | 一句话+Play；弹窗 3 例图解 | 「Create four groups of four!」一句话，无弹窗 | 一句话+可选交互教程（Show me 代演示）+「唯一解无需猜」信心承诺 | 零教程，自解释 UI（照片+滑条+地图） | 输入框+4 句规则，明说「AI 按语义排序」 |
| 一次好决策的爽感 | 信息押注+键盘全局着色外化约束 | 整组飞出+类别名揭示（类别名本身是彩蛋/双关） | 纯演绎确定性；X 标记=思考外化；难度标签(HARD)制造谈资 | 双重推理（年代线索+地理线索）；reveal 画出「你的猜测→真实」虚线 | 距离数字+冷热渐变条，思维路径实时可视化 |
| 失败/成功情绪 | 全绿稀有徽章弹窗→「注册才能保存」 | 「One away!」懊恼设计；Perfect 紫星 | 金皇冠+彩带+「You're crushing it!」+大字成绩 | 无 fail state，判词描述性不羞辱 | 输不存在（无限猜+可放弃）；分布条复盘 |
| 分享卡 | emoji 矩阵，无剧透有悬念(X/6) | 彩色方块暴露解题顺序不剧透词 | Copy score+好友头像「谁玩过」 | Detailed/Emoji 双格式；站内好友 challenge | 期号+次数+🟩🟨🟥 分布 |
| 次日钩子 | streak、Bot 复盘、提醒邮件、archive(付费) | streak+Bot 难度对比+每日 hints 文章 | 一周日历「You're heating up!」+push 提醒开关 | 倒计时最大字+leaderboard+无限模式承接 | 免费 archive 日历一键补玩+Unlimited |
| 变现 | NYT 订阅（锁 archive/Crossplay，摆在胜利弹窗） | 同左 | 无直接变现，为平台拉 DAU | 广告+双端 App+UGC 出题 | 广告+姊妹游戏矩阵导流 |

跨标杆共性（我们全部缺失或极弱）：**① 成绩的社会化锚点；② 结算页=矩阵导流枢纽（LinkedIn 8 款共用同一结算组件）；③ 人格化署名/编辑存在感（Edited by Tracy Bennett / By Wyna Liu）；④ 失败也可分享。**

## 三、我方 8 款实玩对照（#31, Aug 1）

| 游戏 | 实玩结果 | 最接近的标杆 | 已做对 | 最痛的缺口 |
|---|---|---|---|---|
| WordBridge | 0 失误+bridge 一次猜中 | Connections | 隐藏桥揭示是真差异化，出题水准高 | 无徽章/稀有成就；无全球对比 |
| Numlock | 7×7 解出（脚本辅助 6 秒） | 无直接原型 | 唯一解承诺✓；target 变蓝即时反馈 | 难度节奏（周一 5×5→周末 7×7）埋在 FAQ，页面无难度标签；计时无分布对比 |
| InfiniteAlchemy | Bee 21 步，#29/30；3 个 First Discovery🏅 | Infinite Craft+Contexto | 全站唯一全球排名；AI 俏皮点评；First Discovery 可署名 | 无效合成也计步且无提示；无最短路参照；无语义冷热提示（AI 明明能算） |
| GridSpark | 9×9 7 秒 ⚡（脚本辅助） | Queens | ⚡ 速度锚点；冲突变红；色盲模式 | 无逐格 hint；FAQ 自认 unofficial Queens 坐实 clone 观感 |
| BorderRush | Nigeria→Pakistan 7/7 全绿 | Travle | 唯一有 hint 经济（2 次/日）；官方最短路对照且宽容判定 | 地图小不可缩放；无击败 X% |
| DropStack | 50 drops 226pts，#2 of 6 | 每日化 suika | 真排行榜+昵称；结算内 cross-promo | n=6 暴露冷启动；SEO 承诺 percentile 实际是绝对名次（文案与实现不一致） |
| Interrogate | 7/10 问指认错，输 | 无原型（最原创） | 败局复盘全站最佳（时间线+3 处矛盾） | 只能点预设问题；🟦/⬜ 语义不直观；败者次日钩子弱（上期 429 本次未复现） |
| EpochLens | 34,205/50,000 | TimeGuessr | 彩蛋会引用你的猜测个性化点评；credits 齐全 | **地图 300px 不可缩放无搜索→位置分变成手抖惩罚（公平性问题）**（上期「guess 被吞」本次未复现） |

门户层：Today 0/8 进度条是好底子，但无「Perfect Day」奖励呈现、无全局 streak、无每日难度标签。广告位存在但未填充（变现未启动）。

## 四、我们缺的前 10 个设计细节（按 影响力/实现成本 排序）

> 成本估算基于纯前端+现有后端计数接口的工作量；S≤1 天，M≈2-4 天，L≥1 周。

1. **全站结算「击败 X% 玩家」分位数条**（影响：极高/成本：S-M）。后端已能算 #29/30，改为按当日全体成绩输出分位数；n<30 时显示「全球第 N 个解出 🌍」而非名次，规避冷启动尴尬。挂进现有 Brilliant! 模板，8 款一次生效。分享卡同步加一行 `· Top 12%`。
2. **结算页跨游戏导流卡**（极高/S）。把「Portal ▸」文字链升级为 LinkedIn 式迷你预览卡：下一款未玩游戏的名称+一句话玩法+「2 分钟」时长标注+Today 3/8 进度。DropStack 已有雏形，抽成组件全站复用。目标：把单游戏 DAU 变成矩阵 DAU。
3. **streak 日历 + 次日提醒**（高/M）。结算 modal 加一周日历点亮 UI（Queens 的「You're heating up!」）+ 浏览器 push/邮件提醒开关 +「明日难度预告」。现在 streak 只是一个数字，损失厌恶没有被可视化。
4. **Interrogate 式失败复盘推广到全站**（高/M）。失败/低分时给「你本可以…」：WordBridge 显示差一步的分组、Numlock/GridSpark 显示卡住点的下一步逻辑推理、EpochLens 显示每张的最优线索。失败也生成分享卡（标杆全部支持败局分享，我们失败=体验戛然而止）。
5. **EpochLens 地图可缩放+城市搜索**（高/M）。这是公平性 bug 级缺口：pin 精度被 UI 限制。用可缩放矢量地图（现有 SVG 换 leaflet 级别即可），location 分才有意义。BorderRush 地图同步受益。
6. **InfiniteAlchemy 冷热提示 + 最短路参照**（高/M）。每次合成返回与目标的语义距离渐变条（Contexto 机制，embedding 现成）；结算显示「你 21 步 · 今日最佳 6 步 · 理论最短 4 步」。当前「21 步好不好」无从知晓，核心爽感落空；无效合成（Mud+Water=Mud）不计步或给提示。
7. **每日难度标签外显**（中/S）。Numlock/GridSpark 已有周内难度节奏但埋在 FAQ；把「今日：HARD 7×7」放到标题旁和分享卡里。难度标签=谈资=传播素材（LinkedIn 用 HARD 制造「你今天几分钟」话题）。
8. **稀有成就徽章体系**（中/M）。全绿/0 失误/⚡速解/7 日全勤「Perfect Day」即时颁发弹窗+进分享卡。NYT 用「注册才能保存徽章」做注册钩子，我们可用「输入昵称保存」轻量替代，顺带解决排行榜昵称问题。
9. **人格化出题署名 + 每日一句编辑注**（中/S）。「Edited by …」+ 谜题彩蛋注释（EpochLens 🥚 已证明我们能写）。AI 生成内容更需要人格化包装对冲「机器味」；也是社区/SEO 内容管线的起点（NYT 每日配 hints 文章）。
10. **DropStack 文案与实现对齐 + 回放分享**（中/M）。要么实装 percentile（做完第 1 项自然解决），要么改 SEO 文案；加「最佳连锁时刻」GIF/回放卡，物理游戏的传播素材天然比 emoji 矩阵强。

不建议本期做：账号体系（成本 L，先用本地+昵称过渡）、付费墙（DAU 不足）、自由文本审讯（LLM 成本与内容风险，先做「已问问题跨嫌疑人对照板」这个 S 级改进）。

## 五、风险与局限（SOP-02 事实/推断分离）

- **实玩证据**：以上所有标杆与我方观察均为 2026-08-01 单日单次实玩（n=1），Numlock/GridSpark 用脚本求解故计时不代表真人体验；「One away!」「答错指南针」等失败路径因通关未触发，未验证。
- **未能实玩**：Infinite Craft 被 Cloudflare 拦截，其机制描述来自公开资料+我方 InfiniteAlchemy 的同类实现（推断非实测）。GeoGuessr 以 TimeGuessr 实玩代表该品类。
- **推断**：「社会锚点是最大缺口」基于标杆共性归纳，未经我方 A/B 验证；DropStack n=6 为单日样本，不能外推整体 DAU。
- **风险**：①分位数功能在低 DAU 期可能暴露玩家稀少（已用第 1 项的降级方案规避）；②上期报告的 Interrogate 429、EpochLens 吞 guess 两个 bug 本次未复现，但需监控——结算链路 bug 会直接杀死 streak 钩子；③GridSpark/EpochLens 的「alternative」SEO 定位有商标/观感风险，建议法务过一眼措辞。

## 六、下一步

1. 本周：落地第 1、2、7 项（S 级，全站模板改动）。
2. 下周：第 3、5、6 项（M 级），与 PR #13 的 v2 玩法升级并行不冲突——本清单全部是「玩法外围」改造，不动核心规则。
3. 数据回收：上线分位数后回收 7 日分享率/次日留存，验证「社会锚点」假设，再决定是否投入徽章体系（第 8 项）。

## 附：证据索引

- 实玩记录（含分享卡原文、求解过程、逐游戏截图清单）：会话工作笔记 2026-08-01。
- 我方分享卡实测样例：`WordBridge #31 ⭐⭐⭐⭐+🔗 🔥1`、`Numlock #31 7×7 ✅ 0:06 🔥1`（均含 URL ✓）。
- 相关文档：[PR #13 v2 玩法方案](https://github.com/wookat/company-os/pull/13)、[daily.zalize.com](https://daily.zalize.com/)。
