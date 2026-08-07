# QA159 · 分析题背诵页 lg 左右分栏（build bb92105，bundle index-DkonSgC9.js 已确认含 `lg:grid-cols-2 lg:gap-x-6`）

代码依据：web/src/pages/Subj.tsx diff（bb92105）L208-320：题卡内容器 `div.min-w-0.flex-1` 增加 `lg:grid lg:grid-cols-2 lg:gap-x-6`；长材料（stem>320字）渲染两份——`<details class="lg:hidden">`（折叠，仅 <lg）+ `<p class="hidden … lg:block">`（全文，仅 ≥lg）；右列 div 含设问+要点自评（挖空自测等不变）。lg=1024px。

账号：qa159-1786100805@test.zalize.com（uid=276，已注册）。样本：#realsubj/2010 seq34 材料 684 字（>320 触发折叠逻辑）；2010 年 35/36 题 <320 字作对照。

## T1 1440px 桌面分栏（#realsubj/2010）
- 断言 A：seq34 题卡中材料 `<p>`（lg:block）与右列设问并排——CDP 量测：左列材料 p 与右列首个设问元素的 getBoundingClientRect 满足右列 left ≥ 左列 right（同一水平带），且 details 元素 display:none。
- 断言 B：材料全文直接可见（截图含材料中后段文字），页面无「展开全部材料 ›」可见文本。
- 断言 C：右栏交互正常：点「展开参考答案要点」→ 要点列表出现；点一条要点 → ✓ 自评点亮、「想到 n/t」计数变化（UI 点击，录屏）。
- 溢出：innerWidth=1440、scrollWidth≤1440。
- 失败判据：材料仍折叠 / 单栏堆叠（右列 top 在材料下方且 left 相同）/ details 可见 / 自评点击无响应。

## T2 390px 移动端同前（回归）
- 断言 A：seq34 材料折叠态——可见「…」截断 + 「展开全部材料 ›」入口；lg:block 的全文 p display:none。
- 断言 B：点「展开全部材料 ›」→ 全文出现、截断摘要消失。
- 断言 C：单栏（设问区 top 在材料下方）。
- 溢出：innerWidth=390、scrollWidth≤390。

## T3 运行时
- 全程 CDP 监听 console error / pageerror / HTTP≥400 = 0。

产出：test-report-159.md、双视口截图、简短录屏、uid=276。
