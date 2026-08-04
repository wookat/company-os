# 2026 考研政治真题（2025-12-20 开考）来源与置信度报告

## 结论

- **客观题 33 题（单选 1–16 + 多选 17–33）：完整可得，已双来源交叉验证**，其中 2 题（第 3、22 题）存在来源间答案分歧，已标 `answer_disputed=1` 并记录 `answer_candidates`。
- **分析题 34–38 共 5 题：题面（材料+设问）完整可得，已双来源逐题比对一致**；`answer_points` 与 `analysis` 全部为原创撰写，未复制任何机构参考答案/解析。
- 交付文件：`2026_objective.json`（33 题）、`2026_subjective.json`（5 题）。字段对齐现有 `data/realexam` / `data/realexam_subjective` schema（year/seq/qtype/stem/opt_a-d/answer/subject/kp_name/kp_confidence/answer_disputed/third_party_material/analysis；分析题含 questions/answer_points），并额外附 `sources[]` 与 `confidence` 字段供审核。
- 未写库、未改代码、未提交仓库，供人工审核后入库。

## 来源清单

| 编号 | 来源 | 内容 | 说明 |
|---|---|---|---|
| S1 | N诺考研 https://noobdream.com/Practice/exam_solution/44251/ | 1–38 全部题干/选项/答案、分析题材料与设问 | 完整文字版，公开可访问 |
| S2 | 中国考研网估分试卷（图片版，38题含答案） https://m.chinakaoyan.com/info/article/id/642197.shtml | 1–38 全部题干/选项/答案 | 12 张图片已逐张核读 |
| S3 | 新东方在线完整答案 https://kaoyan.koolearn.com/20251220/1915030.html | 1–24 答案（附选项文字） | 仅答案列表，25 题以后未公开文字版 |
| S4 | 优路教育回忆版 https://www.youlu.com/kaoyan/article/CA20251220010000000012 | 1–24 答案 | 与 S3 一致 |
| S5 | 中国考研网单选文字版 https://www.chinakaoyan.com/info/article/id/642269.shtml | 1–16 题干/选项/答案 | 佐证单选，第 3 题答案 C |

注：S1 与 S2 为两个完整独立发布渠道，题面文字逐题一致；S3/S4/S5 为答案侧的额外佐证。人人文库“中公版回忆版”等聚合文档与上述版本题面明显不一致（如分析题主题为数字经济/共同富裕/五四运动/道德法律/全球治理的另一套），判定为不可靠拼接内容，未采用。

## 答案交叉验证结果

- 单选 1–16：S1=S2=S5 完全一致（1A 2D 3C 4B 5D 6C 7B 8C 9B 10B 11D 12A 13C 14B 15A 16A）。
  - **第 3 题分歧**：S1/S2/S5 均为 **C**，S3/S4 为 D。恩格斯"意志自由只是借助于对事物的认识来做出决定"为教材原文观点，C 更可信；已按 C 收录，`answer_disputed=1`，`confidence=medium`。
- 多选 17–33：S1=S2 完全一致（17BD 18AD 19ACD 20BD 21BC 22ABCD 23ACD 24ABCD 25ABD 26ABC 27BC 28ABC 29ACD 30ABD 31CD 32BCD 33BCD）；其中 17–24 另有 S3/S4 佐证。
  - **第 22 题分歧**：S1/S2 为 **ABCD**，S3/S4 为 ACD（不含 B"要有自己的文化自信"）。已按 ABCD 收录，`answer_disputed=1`，`confidence=medium`，建议人工复核。
- 其余 31 题：所有可用来源答案一致，`confidence=high`。

## 置信度说明

- `confidence=high`（31 题 + 分析题 5 题题面）：≥2 个独立来源题面与答案一致。
- `confidence=medium`（第 3、22 题）：题面双来源一致，答案存在机构间分歧，已记录候选答案及各自来源。
- 25–33 多选与 34–38 分析题的答案/题面仅有 S1、S2 两个完整来源（新东方等未公开该区间文字版），已满足"双来源一致"标准，但来源均为回忆版性质，建议上架前抽查复核。

## 考点映射

- `kp_name` 全部映射到现行 114 考点（library.js 109 + 线上新增 5 个），校验通过。
- `kp_confidence=0.5`（拿不准）共 13 题：客观题 2、4、7、15、16、20、21、22、25、26（10 题）及分析题 36、37、38（3 题）。

## 合规

- 题干/选项为考试真题本身，保留来源标注。
- 客观题 `analysis`、分析题 `answer_points` 与 `analysis` 均为原创撰写，未复制任何机构解析文本。
- 分析题材料原文（引自《资本论》《毛泽东选集》《邓小平文选》、二十大报告及新闻报道等）已改写为原创概述，设问保留原文；引用第三方长材料的 34、36、37 题标 `third_party_material=1`。

## 自查结果

- 客观题：33 题（单选 16 + 多选 17），题干/四选项/答案/解析无空字段，单选 1 字母、多选 2–4 字母按字母序，kp_name 均在 114 考点库内。
- 分析题：5 题（seq 34–38），每题 2 问，answer_points 每题 6 条要点式原创表述。
- 校验脚本输出：`singles 16 multis 17 disputed 2 errors []`。
