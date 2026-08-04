# QA 第 60 轮回归测试报告 — https://zhenti.zalize.com

- 生产 build：`74e139f-202608041514`（meta app-build 实测确认）
- 测试账号（请清库）：**qa60-1785856834@test.zalize.com**
- 测试方式：全新自注册账号在生产环境端到端 UI 测试；为验证「上周对比」用 Cloudflare D1 HTTP API 回填/互换了该测试账号 attempts 的 created_at（仅测试账号数据，随清库一并删除）
- 录屏：`/home/ubuntu/screencasts/rec-bb6a2179-0d28-4b75-a09b-d432ba802/rec-bb6a2179-0d28-4b75-a09b-d432ba304802-edited.mp4`

## 结论
本轮全部计划用例执行完毕，**全部通过**，无阻塞问题。一个口径提示见「备注」。

## 1. 工作台周摘要（build 760a394）— 全部通过

| 用例 | 结果 |
|---|---|
| 新号无作答：不显示「本周作答」行、console 无报错 | ✅ `weekLine:false`，console 空 |
| 1 次作答（1/32）后：显示「本周作答 1 次 · 正确率 3%」，无上周对比 | ✅ 数字与作答记录一致 |
| D1 回填上周 1 次 3%：显示「比上周高 2%（上周 1 次 3%）」绿色 | ✅ |
| 互换周次（上周 1 次 5%、本周 3%）：显示「比上周低 2%（上周 1 次 5%）」玫红 | ✅ |
| 三次作答后聚合：本周 3 次 · 3%（2/72 四舍五入）与近 7 天卡「刷题 72 道 3%」一致 | ✅ |
| 390px：卡片内换行、`scrollWidth=390` 无水平溢出 | ✅ |

| 🟢 1 次作答无对比 | 🟢 绿色「高 2%」 |
|---|---|
| ![week-no-compare](https://app.devin.ai/attachments/8386bab0-8197-4d1a-a843-1cce05040268/ss_zoom_92391124.png) | ![week-green](https://app.devin.ai/attachments/cd2ce15b-4d7d-4fd7-88da-7ff54f9d4c44/ss_zoom_ca8e98cd.png) |

| 🟢 玫红「低 2%」 | 🟢 390px 无溢出 |
|---|---|
| ![week-rose](https://app.devin.ai/attachments/f425387b-d981-42f0-9b9e-ca6d273a2ca3/ss_zoom_ea850234.png) | ![390px](https://app.devin.ai/attachments/dc17b23a-081f-421c-a14d-690f161cb9fe/ss_4dd9bacf.png) |

## 2. 打印背诵按钮热区（build 9ea132f/74e139f）— 全部通过
- #realsubj/2019 「🖨 打印背诵版」getBoundingClientRect().height = **36px** ✅
- #realsubj/2026 同按钮 = **36px** ✅；错题本「🖨 打印错题」= **38px**，口径一致 ✅
- 390px：两处打印按钮均 `display:none` 隐藏 ✅
- 打印内容不变：2019 打印预览含 5 题设问+参考要点，页面 UI 全隐 ✅

| 🟢 2019 打印背诵版预览 | 🟢 错题本打印（题干/选项/答案BD·你当时选C/考点/解析） |
|---|---|
| ![subj-print](https://app.devin.ai/attachments/2cd7a5a6-9eab-47a3-8c34-d2566e48be6b/ss_ffc14254.png) | ![wrong-print](https://app.devin.ai/attachments/246f1bf7-de7b-4d55-b863-ae360b5920a1/ss_a7faece7.png) |

## 3. /api/real/years、/api/real/kps KV 缓存（build 74e139f）— 全部通过
- 年份列表 **17 年（2010–2026）**，2026 = **33 题** ✅
- 考点筛选 5 科目共 **108 考点**（16+17+10+34+31，console 汇总验证）✅，点「抗日战争」正常组 10 题特训卷 ✅
- 做卷入口正常；最近成绩不受缓存影响（2024 卡显示 1/32、mine 数据实时）✅
- 连续刷新 3+ 次：数据一致、无 5xx、console 全零 ✅

| 🟢 17 年份列表（2026=33题，2024 有成绩 1/32） | 🟢 108 考点 |
|---|---|
| ![years](https://app.devin.ai/attachments/0250fe3a-f405-44f7-a17d-946c3c4ea0fd/ss_e4036790.png) | ![kps](https://app.devin.ai/attachments/b14d6a8b-a635-44f6-8350-0cef8750d312/ss_a9b85e4b.png) |

## 4. 常规回归 — 全部通过
- 骨架屏：3 卡片轮廓、无重复「加载中…」文字，8s 慢网提示行出现 ✅
- 错题本打印：见上图，题干/选项/答案/当时所选/考点/解析齐全 ✅
- 公开页 /zhenti/2024：自测模式（隐藏答案）+「🖨 打印 / 存 PDF」出 13 页白卷（题干+选项、无答案、UI 全隐）✅
- sitemap.xml URL 数 = **782** ✅
- 全程 console error / pageerror / HTTP≥400 = **0**（唯一 404 为我误访问不存在的 /real/2024 路径，正确路径为 /zhenti/2024，非产品问题）✅

| 🟢 骨架屏+慢网提示 | 🟢 公开页白卷打印（13 页） |
|---|---|
| ![skeleton](https://app.devin.ai/attachments/556a1326-1fd3-4bc0-8615-2da4721e4c45/ss_c8bdf2f9.png) | ![public-print](https://app.devin.ai/attachments/5c9e3542-8317-466e-8363-5182c2943cb1/ss_37b99bde.png) |

## 备注
- 周摘要在 390px 下会在卡片内**换行为两行**（无溢出、无截断）。若期望「单行不折行」需另行收紧样式，当前实现按「不溢出」口径判定通过。
- 周摘要以「作答次数」为 N（一次交卷 = 1 次），正确率为 Σscore/Σtotal，未作答题计入分母 —— 与成绩页口径一致。
