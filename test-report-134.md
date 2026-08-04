# QA 第 134 轮回归报告 — favicon 301 / admin searches 并行提速 / app2 新版本刷新胶囊（生产 build c8d8cbd）

- 时间：2026-08-04（UTC）
- 环境：生产 https://zhenti.zalize.com （app2 硬刷新后实际加载 `assets/index-BpX319Qd.js`，与 curl 一致）
- 测试账号（请清库）：**qa134-1785877264@test.zalize.com**
- 录屏：`/home/ubuntu/screencasts/rec-b67f24e6-fc78-4790-9291-5f370d38be88/rec-b67f24e6-fc78-4790-9291-5f370d38be88-edited.mp4`

## 结果总览

| # | 用例 | 结果 |
|---|------|------|
| 1 | /favicon.ico 301→/icon-192.png、跟随后 200 image/png、tab 图标可见、favicon 404 消失 | ✅ |
| 2 | /api/admin/searches 并行提速（热调用 <2s）+ 字段/看板正常 | ✅（冷调用 2.56s 略超 2s，热 0.73s） |
| 3 | app2 新版本胶囊：负例不出现 / 伪 bundle 出现 / 1440+390 完整 / 点击刷新后消失 | ✅（390 胶囊换行两行轻压问候语，P4 备注） |
| 4 | 回归：打卡/streak、console/pageerror/HTTP≥400 清零、390 无溢出 | ✅ |

## 详情与证据

### 1. favicon — 通过
```
curl -sI /favicon.ico  → HTTP/2 301, location: https://zhenti.zalize.com/icon-192.png
curl -sIL              → 最终 HTTP/2 200, content-type: image/png
```
浏览器 tab 显示蓝色「真」图标；本轮 app2/admin 全程 performance 无任何 favicon 404（QA133 曾有）。

![tab favicon](https://app.devin.ai/attachments/f84a8edc-c0a1-4022-a6f7-d5621d44ebaf/ss_zoom_a386304a.png)

### 2. admin searches 提速 — 通过
X-Admin-Key curl 计时两次：`run1 2.560s / run2 0.733s`（QA133 实测 8.7–9.7s，提速 >10 倍；冷调用略超 2s 预期，热调用远低于 2s）。返回 JSON 含 searches(30)/pub_searches(18)/zhenti_pv(7，今日 a2=23、a1=2)/daily_reveal(7)/seo_intents_7d/slow_api(3) 且数值与看板一致。/admin UI 登录后各区块渲染正常（下图）。slow_api 中 3 条 8.7–9.7s 旧记录为 QA133 期间产生（14 天 TTL 内正常残留），本轮两次调用均未再入账新慢记录。

![admin dashboard](https://app.devin.ai/attachments/ef7edf7d-526e-4577-917f-6e92f78c22cd/ss_d4460e79.png)

### 3. app2 新版本刷新胶囊 — 通过（核心用例）
方法：console 覆写 `window.fetch` 仅对 `/app2/index.html` 返回伪 HTML（bundle 名 `assets/index-FAKE0000.js`），再派发 `visibilitychange`；负例先行不做拦截。

- 负例：不拦截时派发 visibilitychange，2s 后胶囊数=0（线上 bundle 与已加载一致，不误报）；
- 正例：拦截后 2s 内顶部居中出现蓝色胶囊「新版本已发布 · 点此刷新 ↻」；
- 390px：胶囊完整在视口内（rect x 97.5–292.5），scrollWidth=390 无溢出；文案换行为两行、轻微覆盖 hero 问候语（见备注）；
- 点击：原生鼠标点击胶囊 → `performance navigation type=reload` 整页刷新，覆写失效、胶囊消失、fetch 恢复 native。

| 🔴 负例：无拦截切回无胶囊 | 🟢 正例：伪 bundle 后胶囊出现（1440） |
|---|---|
| ![neg](https://app.devin.ai/attachments/908dc53d-882e-445a-845f-f88e1f74c237/ss_2f23cae8.png) | ![pos](https://app.devin.ai/attachments/2ac51ee5-c253-4551-8541-e35f4adefe10/ss_78783c98.png) |

| 🟢 胶囊特写 | 🟢 390px 胶囊完整（换行两行） |
|---|---|
| ![pill zoom](https://app.devin.ai/attachments/bf7a7101-3e1e-4c14-b052-407c55042e73/ss_zoom_44cb1989.png) | ![390](https://app.devin.ai/attachments/f5942ec7-1565-436d-a3df-012477f5bc86/ss_3c182827.png) |

点击刷新后（胶囊消失、页面重载）：

![after reload](https://app.devin.ai/attachments/a30e665b-8acb-4e02-83ff-5dc1a2bab1c7/ss_fbb6b196.png)

### 4. 回归 + 监控 — 通过
- 每日一题卡可展开（2013#18，揭晓前无答案泄漏）；点「今日打卡」→ 头部即时「已打卡 ✓」+「连续学习 1 天 分享 ›」；
- console/pageerror：除本人 fetch 覆写自证日志与既知豁免噪音外无错误；HTTP≥400 = []（favicon 404 已消失）；
- 390 scrollWidth=390，1440 三栏正常。

![checkin](https://app.devin.ai/attachments/30a417cd-1dd9-4170-8b0a-e9e708d53792/ss_f039d099.png)

## 备注（非阻塞）
- **P4**：390px 下胶囊文案换行为两行（height 60px），轻微压住 hero「你好，qa…」问候行；建议 `text-xs whitespace-nowrap` 或缩短文案保持单行。
- 冷调用 2.56s 略超「<2s」验收口径（热 0.73s 达标）；KV 并行后剩余耗时或为 D1 查询，供参考。
- 30 分钟 interval 分支未实测（等待不现实），已由 visibilitychange 同一 check 函数覆盖。
