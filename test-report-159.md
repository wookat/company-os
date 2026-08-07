# QA159 测试报告 · 分析题背诵页 lg 左右分栏（build bb92105）

- 生产：https://zhenti.zalize.com/app2/#realsubj/2010 ，bundle `assets/index-DkonSgC9.js`（已确认内含 `lg:grid-cols-2 lg:gap-x-6`，即 bb92105 已部署）
- 测试账号：**qa159-1786100805@test.zalize.com，uid=276**（subj_hit 1 条〔2010-34 想到 1/4〕；无卷/attempt/错题/material）——请用户清库
- 代码依据：web/src/pages/Subj.tsx diff（bb92105）——题卡容器加 `lg:grid lg:grid-cols-2 lg:gap-x-6`；长材料（>320字）双渲染：`<details class="lg:hidden">` 折叠版 + `<p class="hidden … lg:block">` 全文版；右列设问+要点自评不变。样本：2010 年 seq34（材料 585 字 DOM 实测，>320 触发折叠逻辑）。
- 方法：登录后 CDP 双视口（1440×900 桌面 / 390×844 mobile）量测 + UI 点击 + 截图 + 简短录屏；全程 CDP 监听 console/pageerror/HTTP≥400。

## T1 1440px 桌面分栏 — PASSED

DOM 量测（seq34 题卡）：
```json
左列 {l:529,r:834,t:0,w:305}  右列 {l:858,r:1164,t:0,w:305}   → 并排（右列 left 858 ≥ 左列 right 834）
折叠 details display:none；lg:block 全文 p display:block（585 字）
「展开全部材料」可见性 = false；iw:1440 sw:1425 无溢出
```
- 材料全文左栏常驻、无折叠入口 ✓（截图可见材料首尾段完整）
- 右栏交互：点「展开参考答案要点（4 条）›」→ 4 条要点+「挖空自测」出现；点第 1 条 → ✓ 绿底自评、「想到 1/4」+ summary「上次想到 1/4」写入 ✓

| 🟢 1440px 左右分栏（材料左/设问右） | 🟢 右栏要点自评 ✓ 1/4（zoom） |
|---|---|
| ![1440 分栏](https://app.devin.ai/attachments/128255c1-d7c9-4513-8e3c-ca0d8f2eff22/ss_e2b67a8a.png) | ![要点自评](https://app.devin.ai/attachments/495e75c5-58e9-40ce-b18d-e45a6b6117c0/ss_zoom_e7f81771.png) |

要点展开全景：![1440 要点展开](https://app.devin.ai/attachments/3961a803-5b58-4197-a66e-f33daf28eb28/ss_67e50387.png)

## T2 390px 移动端同前（回归）— PASSED

DOM 量测：
```json
{"detDisplay":"block","detOpen":false,"fullPDisplay":"none","expandVisible":true,
 "stacked":true,"leftBottom":246,"rightTop":254,"iw":390,"sw":390}
```
- 单栏堆叠（设问区 top 254 在材料区 bottom 246 之下）、材料折叠态显示截断+「展开全部材料 ›」✓
- 点「展开全部材料 ›」→ 全文两段完整展示、截断摘要消失 ✓
- scrollWidth=390 无横向溢出 ✓

| 🔴 390px 折叠态（展开全部材料 ›） | 🟢 390px 点开后全文 |
|---|---|
| ![390 折叠](https://app.devin.ai/attachments/5f16bbef-8942-48d7-8122-9b2ba9341e1b/ss_c248606d.png) | ![390 展开](https://app.devin.ai/attachments/0b326728-fd27-4085-8d66-13cc4b2ad40d/ss_ddac5f98.png) |

## T3 运行时 — PASSED

console error = 0、pageerror = 0、HTTP≥400 = 0（全程零豁免）。

## 结论

三条验证线全部通过，无新 P 级问题。lg≥1024 视口材料全文左栏常驻 + 设问/要点右栏，<lg 折叠行为与单栏布局完全同前。

录屏：/home/ubuntu/screencasts/rec-634b3bd6-97dc-4c6a-9193-c1e41a59228f/rec-634b3bd6-97dc-4c6a-9193-c1e41a59228f-edited.mp4
