# QA 第 138 轮 — UX137 修复复验报告（生产 build fd5ad30）

- 站点：https://zhenti.zalize.com/app2/ （硬刷新后实际加载 `assets/index-CclDVKxp.js`，与 curl 到的 fd5ad30 产物一致）
- 测试账号（请清库）：**qa138-1785880583@test.zalize.com**
- 录屏：`/home/ubuntu/screencasts/rec-1f485063-f001-46d5-89e7-7f4cae0f0dee/rec-1f485063-f001-46d5-89e7-7f4cae0f0dee-edited.mp4`
- 结论：**本轮所有执行的验收项全部通过（无新 P0–P3 问题）**，且原计划允许标 untested 的「≥40% 正例」也实测通过。

## T1 P2 交卷 pending 态 + 正常动线（passed）

2026 卷（paper 323）答 2 题（Q1=A、Q2=B）提前交卷。

- 点「确定交卷」后按钮即刻变 **「交卷中…」且 disabled**。用 MutationObserver 抓到 2 条 `{text:"交卷中…", disabled:true}` 记录，屏幕可见（下图右下角灰色「交卷中…」）；`if(!qs||submitting) return` 防重复生效。
- 交卷后正常落 `#result/323`：1/33、正确率 3%，`zt_exam_323` 已清（console 读 null）。

| 🟢 pending 态「交卷中…」+disabled | 🟢 低分成绩页（无击败行） |
|---|---|
| ![pending](https://app.devin.ai/attachments/4cfb928e-988e-4f43-989e-f161a818082e/ss_dd629ecc.png) | ![low-score result](https://app.devin.ai/attachments/2fcb48ee-23f3-47f0-99bd-e2e7f7b151da/ss_b3e45041.png) |

## T1 P3 低分口径（passed）

正确率 3% 的成绩页：

- **无**蓝色「击败了 X% 的研友」行（UX137 同分数曾显示「击败了 34%」，回归对照成立）；grade 评语「打基础期，锁定 28 个薄弱考点逐个拿下」在位。
- 分享图 canvas 528px 行同样用 grade 评语「打基础期，锁定 28 个薄弱考点逐个拿下」，**不含「击败了」**；DOM 全文检索「击败」为 false。

| 🟢 低分分享图（grade 评语，无击败） | 🟢 ≥40% 正例分享图（击败了 82%） |
|---|---|
| ![low share](https://app.devin.ai/attachments/88f699a6-8f0b-42db-8547-fc7e43a62d8e/ss_7fa57b74.png) | ![high share](https://app.devin.ai/attachments/04d6bf32-aefc-4a4e-8497-5604ea51bd32/ss_53dcc7fa.png) |

## T2 P2 409 分支（passed，对抗测试）

真题快刷 20 题（paper 324）：答 1 题后，先在 console 带 token `fetch POST /api/papers/324/submit`（返回 **200**，服务端已入库），再在 UI 点「提前交卷 → 确定交卷」：

- UI 提交实际收到 **409**（performance 记录 `409 /api/papers/324/submit`），但 **直接落到 `#result/324` 成绩页**，无错误 toast、无停留答题页（UX137 旧行为：无任何反馈）。
- `localStorage.getItem('zt_exam_324') === null`（已清）；page errors = []。

| 🟢 409 后直接落成绩页 #result/324 |
|---|
| ![409 result](https://app.devin.ai/attachments/af4e3c15-1f6e-43d4-93b9-b853b5928f5a/ss_64db194e.png) |

## T3 ≥40% 正例（passed，原计划允许 untested，本轮实测覆盖）

造数方法：先用 2020 卷「背题模式」读取 Q1–Q14 正确答案（真题免费不限量），再开 2020 整卷模考（paper 325）用键盘快捷键按正确答案作答 14 题提前交卷 → **14/33、正确率 42%**：

- 成绩页显示蓝色「**击败了 82% 的研友（按全站作答正确率）**」行 —— `pct>=40 && beat>=20` 分支仍正常显示。
- 分享图 528px 行同样为「击败了 82% 的研友」。

| 🟢 42% 成绩页显示击败行 |
|---|
| ![42% result](https://app.devin.ai/attachments/5afeebe2-382f-40dd-a0a1-1ca254bd19f5/ss_486b1585.png) |

## T4 回归与监控（passed）

- 正常做题→交卷→成绩页动线（T1/T3 两次全流程）正常。
- console/pageerror 清零；HTTP≥400 仅 1 条：`409 /api/papers/324/submit`——为 T2 计划内自证提交，属预期。既知豁免噪音（扩展 beacon、canvas data:URL sourcemap 探测）之外无任何新增。
- bundle 全程为 `index-CclDVKxp.js`（fd5ad30），无中途换版。

## 断言汇总

| 断言 | 结果 |
|---|---|
| A 交卷按钮 pending「交卷中…」+ disabled、防重复 | passed |
| B 3% 成绩页无「击败」行、grade 评语在位 | passed |
| C 低分分享图用 grade 评语、无「击败了」 | passed |
| D 409 → 直接落 #result/:pid、无错误提示 | passed |
| E `zt_exam_324` 已清除 | passed |
| F ≥40%（42%）正例击败行仍显示（页面+分享图） | passed |
| G console/pageerror/HTTP≥400 清零（计划内 409 除外） | passed |

## P0–P3 问题清单

无新发现。UX137 的 P2（交卷无反馈/409 无提示）与 P3×2（低分击败行/分享图口径）复验均已修复。

小备注（P4 级观察，非缺陷）：末题「交卷」大按钮的「交卷中，请稍候…」文案本轮未逐字目击（两次交卷均走「提前交卷」路径，pending 文案为「交卷中…」）；代码 L392-393 与提前交卷共用同一 submitting state，机制一致。
