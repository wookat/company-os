# UX/美工第 137 轮走查报告（生产 build f4df45a，非功能 QA）

- 站点：https://zhenti.zalize.com/app2/ （build f4df45a，QA134-136 功能已回归）
- 测试账号（请清库）：**ux137-1785879614@test.zalize.com**
- 录屏：/home/ubuntu/screencasts/rec-e08a5e5c-ed7d-4f96-86fc-ecf7d35ef4b7/rec-e08a5e5c-ed7d-4f96-86fc-ecf7d35ef4b7-edited.mp4
- 计划：/home/ubuntu/zhentigongfang/test-plan-137.md

## P0-P3 分级问题清单

### P2（新发现，功能/体验混合）：慢 API 下「提前交卷」服务端已入库但 UI 无反馈，重试报 409 也无提示
实测：2026 卷答 2 题点「提前交卷 → 确定交卷」，恰逢生产慢 API，首次 POST `/papers/322/submit` 客户端未收到响应，页面停留在答题页且无任何 toast/loading 提示；但服务端已入库（/api/history 出现 attempt id=188，1/33）。用户再次点「确定交卷」→ 409（Console 可见 `api/papers/322/submit 409`），UI 仍停在答题页、无任何用户可见提示，用户会反复点交卷且以为没交成功——实际成绩已生成。建议：交卷按钮 pending 态 + 409 时视为"已交卷"直接跳 `#result/:pid`。

![409 与停留答题页](https://app.devin.ai/attachments/5aa935a2-9540-437d-8370-5dba07f0ab53/ss_3618a503.png)

### P3-1（验收第 1 项核心意见）：低分场景仍显示「击败了 34% 的研友」，口径尴尬
正确率仅 3%（1/33）时，成绩页与分享卡均显示「击败了 34% 的研友」。代码口径是 `beat_pct >= 20` 就显示击败比例（Result.tsx L55/L138），而 beat_pct 按"全站作答正确率"算——大量提前交卷的低分卷把基数拉低，3% 也能"击败 34%"。对分享场景，这句在社交语境下既不可信又显尴尬（收到的研友会想"3% 还击败 34%？"），反而削弱产品可信度。建议：低分（如 pct<40）时无条件用 grade 评语（「打基础期…」），把击败比例阈值改为同时满足 `beat_pct>=20 && pct>=40`。

| 1440px 分享卡（3% + 击败34%） | 390px 弹层（不裁切） |
|---|---|
| ![share card 1440](https://app.devin.ai/attachments/dd59f044-c5c7-4b17-b30b-0599a6c1ca26/ss_zoom_0f67cd91.png) | ![share modal 390](https://app.devin.ai/attachments/3fd48780-0034-4107-a8e6-2b85f31c531f/ss_47a5f647.png) |

### P3-2：成绩页「击败了 34% 的研友（按全站作答正确率）」蓝色文字视觉权重高于 grade 评语
低分成绩页上击败比例是蓝色高亮行、紧贴大分数，grade 评语是普通黑字，视觉层级把"最可能引起质疑的那句"放得最显眼。建议低分时交换两者层级。

![成绩页 390px 全貌](https://app.devin.ai/attachments/4c03eda4-59d3-47c0-bde0-24e0a9c23ed6/ss_0bec079d.png)

### 无 P0 / P1
新版本胶囊在答题中的"丢答案"风险实测不存在（见下）。

## 走查结论（按验收项）

### 1. 成绩分享图
- 入口「📷 生成成绩分享图 ›」位于击败比例/正确率行正下方、与「本卷薄弱考点真题再练」并列，浅色 outline 胶囊 vs 玫红实心主 CTA，层级得当、不喧宾夺主 — passed
- 分享卡蓝紫渐变 + 白色分数环 + 大分数构图与打卡分享图同款语言，品牌一致；3% 时分数环仅顶部一小段弧，比例诚实 — passed
- 弹层节奏：点击即生成（canvas 同步、无等待），✕/遮罩/ESC/关闭按钮全可用，「手机可长按图片保存」引导文案贴心 — passed
- 低分文案口径 — **failed（P3-1/P3-2，见上）**

### 2. 我的页每日学习提醒卡
- 位置：兑换码（会员）与修改密码之间。信息架构上"学习服务"夹在"付费"与"安全"之间略突兀，但页面卡片数少、扫读无障碍，可接受，不单列问题 — passed
- 文案「每天 8:00 发邮件提醒：到期错题数 + 每日一题；当天已打卡则不打扰」讲清了频率、内容、豁免三要素，优秀 — passed
- switch：off 灰 / on brand 蓝、白色圆滑块，与站内 brand-500 一致；开/关 toast 即时且逐字正确（「已开启，每天 8:00 邮件提醒（已打卡当天不发）」/「已关闭每日提醒邮件」）— passed（测试后已留 off，KV 无残留）

| 提醒卡（off，1440px 特写） | 开启态 + toast |
|---|---|
| ![reminder card](https://app.devin.ai/attachments/beb1b262-00d2-4c48-8113-97896ca04dfb/ss_zoom_791f8bb4.png) | ![toggle on toast](https://app.devin.ai/attachments/927aba3d-eef7-4663-b1a3-00b8a6743d93/ss_b19872d8.png) |

### 3. 新版本胶囊 · 答题中丢状态实测（核心）
- **关键发现：#exam 答题页根本不会出现胶囊**——App.tsx L59-61 把 exam 路由标记 fullscreen，L95-102 不包 Layout，而胶囊渲染在 Layout（L84-91）。设计上天然避免了"答题中被打断"，好设计 — passed
- 兜底验证：答 2 题后 F5 强制刷新（等价于胶囊的 location.reload()），已答 2/33、Q1=A、Q2=B 选中态与计时全部恢复（localStorage `zt_exam_322` 自动保存/恢复，Exam.tsx L51-58/L86-99）。即使用户在其他页点胶囊后回到答题页，进度也不丢 — passed

![刷新后 Q1=A 恢复、已答 2/33](https://app.devin.ai/attachments/2888edf6-cb03-4d92-97a2-b2c8369443e1/ss_f75de154.png)

- 心流评估：胶囊只在工作台等 Layout 页出现，顶部居中 32px 单行、不遮挡任何控件，打断度低 — passed

### 4. 390px / 1440px 视觉横向复验
- 390px：分享弹层完整不被 tabBar 遮挡、提醒卡 switch 不变形、胶囊单行（rect h=32、top=8、x 106–284 视口内）、scrollWidth=390 无溢出 — passed
- 1440px：成绩页三栏、账号页卡片、胶囊均正常；三处新 UI 均沿用白卡 rounded-2xl + 品牌蓝 + 玫红点缀语言，一致 — passed

![390px 胶囊单行不压问候](https://app.devin.ai/attachments/1745a016-3bf0-47a1-86c2-0914e7edd69e/ss_zoom_ca9217fa.png)
![1440px 成绩页整体](https://app.devin.ai/attachments/0dd28b0c-6612-4376-ae05-43db4ee07a49/ss_0a96394b.png)

## 监控
- Console 错误仅：本人重试交卷的 409（即 P2 证据）、canvas data:URL 的 ERR_INVALID_URL（既知 sourcemap 探测噪音）。其余 console/pageerror/HTTP≥400 清零。

## untested
- 分享图「保存图片」下载本轮未重复执行（QA135 已验证同管线 640×800 PNG）。
- 胶囊 30 分钟轮询分支（照例以 visibilitychange 触发同一函数）。

## 仍需用户
- 清库邮箱：ux137-1785879614@test.zalize.com
- P2（交卷慢 API 无反馈 + 409 无提示）与 P3-1（低分击败文案口径）的修复决策。
