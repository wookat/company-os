# 项目线：克隆改良（clone & improve）

- 立项日期：2026-08-01 ｜ 负责人：product-manager
- 输入材料：TREND-REPORT-001（PR #15）、COMPETITOR-DEEPDIVE-001（PR #21）
- 红线：只合法反推玩法机制（规则/数值/关卡/钩子），不爬取/复用任何代码与美术音频资产；从零重写 + 自有美术命名 + 差异化改良；免费 + 广告变现。

## 本期选定 4 个目标（按建议开工顺序）

| # | 拆解书 | 目标游戏 | 品类 | 赚钱证据要点 | 工程量 |
|---|---|---|---|---|---|
| 1 | [CLONE-BRIEF-SliceMaster.md](./CLONE-BRIEF-SliceMaster.md) | Slice Master | 物理解压/一键 | Poki 59.6 万投票长青位 | S |
| 2 | [CLONE-BRIEF-Contexto.md](./CLONE-BRIEF-Contexto.md) | Contexto | 每日竞猜/语义 | 运营 3 年+、纯广告跑通、与我方 AI 栈最匹配 | S+ |
| 3 | [CLONE-BRIEF-HexaSort.md](./CLONE-BRIEF-HexaSort.md) | Hexa Sort | merge/排序消除 | 63M+ 下载、$50M+ 收入、广告:IAP≈70:30 | M |
| 4 | [CLONE-BRIEF-MonkeyMart.md](./CLONE-BRIEF-MonkeyMart.md) | Monkey Mart | 经营/idle | Poki 378.8 万投票 4.6 分首页长青 | M |

## 落选说明

- **T1 音乐猜歌（TrackGuess）——本期不选，合规结论已出**：核查 Apple iTunes Search API 官方条款，30 秒预览「only to promote store content and **not for entertainment purposes**，且须紧邻 store badge」（developer.apple.com iTunes Search API Overview）——Heardle 式用官方预览做游戏**不合规**。合规替代路径只剩：①正式曲库授权（成本与周期不匹配）；②原创/翻弹 riff（辨识度大减，需求证据不成立）；③公版/CC 音乐（品类吸引力存疑）。除非老板批准授权预算，本期不启动。
- **brainrot/Obby 蹭梗、.io 实时多人**：沿用 TREND-REPORT-001 结论不做（IP 风险/生命周期/运维成本）。

## 通用工程约定

- 栈：Svelte + Canvas（+Matter.js 物理）+ Cloudflare Pages/Workers/D1/KV + 现有 LLM relay；竖屏移动优先、包体轻量（Poki 2026 技术风向）。
- 每款均先过 1 周灰盒原型验证（各拆解书 §3 的量化验收线），不好玩即砍，不带美术进灰盒。
- 每款默认带 daily 壳（全球同题/竞分/emoji 分享卡），复用 daily.zalize.com 成熟组件。
