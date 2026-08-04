# QA 第 62 轮测试报告 — app2 三修复验收（生产 build 42b740b）

- 日期：2026-08-04 · 环境：https://zhenti.zalize.com/app2/ （meta app-build=`42b740b-202608041720` 已确认）
- 测试账号（请清库）：**qa62-1785864218@test.zalize.com**（密码 qa62pass123，邀请码 Z58）
- 造数方法：整卷模考 2026 卷，第 1 题单选答错（B）、第 17 题多选故意错选 AC，提前交卷（0/33，2 道进错题本）。未触发任何 AI 出卷/生成额度接口。
- 录屏：`/home/ubuntu/screencasts/rec-f97a5e70-632d-4d28-8b0f-6ba7c2602747/rec-f97a5e70-632d-4d28-8b0f-6ba7c2602747-edited.mp4`

## 结论概览

| 用例 | 结果 |
|---|---|
| T1 错题卡「⭐ 收藏」胶囊：收藏/取消/计数联动/收藏筛选/空态文案/刷新持久 | ✅ passed |
| T1b 与旧版 /app 收藏互通（app2 收藏 → /app ⭐收藏(1)） | ✅ passed |
| T2 周摘要口径：pill「本周作答 1 次」+ 卡「本周作答（次）」，与 /app「本周作答 1 次」一致 | ✅ passed |
| T3 邀请链接 `https://zhenti.zalize.com/app2/#reg-Z58` + 无痕打开进注册模式 + zt_invite=Z58 | ✅ passed |
| T4 390px：收藏按钮 75×32px（≥32）、scrollWidth=390 无溢出、tabBar 显示、打印按钮隐藏 | ✅ passed |
| T5 console/pageerror/HTTP≥400 | ✅ passed（唯一 console 报错为扩展拦截 Cloudflare Insights beacon 的 ERR_BLOCKED_BY_CLIENT，豁免） |

⚠️ 非阻塞观察：#wrong 一次加载时 `/api/wrongbook` 等请求挂起约 3 分钟（骨架屏久停，刷新后 ~15s 内恢复）——即 61 轮已报告的生产 API 间歇性慢响应，本轮复现一次，非本次改动引入。另注：部署前已打开的 app2 旧标签页不会自动换新 bundle（SPA 常规行为），硬刷新后生效。

## T1 错题卡收藏（1440px）

未收藏态（灰描边空心星「收藏」）→ 点击后「已收藏」实心 amber 星、⭐ 收藏（0）→（1）即时更新、toast「已收藏，可在「⭐ 收藏」筛选中查看」：

| 🔴 收藏前 | 🟢 收藏后（计数即时+1） |
|---|---|
| ![before](https://app.devin.ai/attachments/c37bb92e-4fb3-4ca8-9e3b-6354fedeb19e/ss_c6ee0426.png) | ![after](https://app.devin.ai/attachments/dd44e1af-0064-43d2-9c06-f192ff66c83c/ss_67e1cdfa.png) |

| 🟢 收藏筛选可见该题（含「收藏于 8/4」） | 🟢 取消收藏后计数回（0）+ 新空态文案 |
|---|---|
| ![fav filter](https://app.devin.ai/attachments/32235b49-5462-4961-bbbf-14379b5dbb7e/ss_9047f8a8.png) | ![empty](https://app.devin.ai/attachments/329088ff-8f44-4580-936a-a8b2dcc8d9b5/ss_719b0fe0.png) |

空态文案逐字验证：「还没有收藏题目——展开错题卡点「⭐ 收藏」即可把题目收进这里」。收藏态实心星按钮放大图 ![capsule](https://app.devin.ai/attachments/f97d89a1-25f4-4487-94e7-72285deed1c4/ss_2c0ff21e.png)（页面重开后仍为已收藏，持久化 OK）。

旧版 /app 错题本同账号显示「⭐ 收藏（1）」（app2 收藏互通）：见 T2 左图同页头部（截图 ss_4243d90b 中 /app#wrong 顶部筛选行）。

## T2 周摘要口径（同账号 1 次 attempt / 33 题）

| 🟢 旧版 /app：「本周作答 1 次 · 正确率 0%」 | 🟢 app2 #home：pill「本周作答 1 次 · 正确率 0%」+ 卡「1 本周作答（次）」 |
|---|---|
| ![old app](https://app.devin.ai/attachments/2c916507-2827-4fe8-9798-e8dfc344fac0/ss_bad17664.png) | ![app2 home](https://app.devin.ai/attachments/8837e1a9-f7bc-4f44-a484-b33ee8ff969a/ss_c0348963.png) |

若按旧口径应显示「本周做题 33 道」；实测两处均为 attempt 口径 N=1，与 /app 完全一致。旧 bundle 对照（qa61 旧标签页仍显示「本周做题 33 道」）恰好证明新旧行为差异真实存在。

旧版 /app 错题本收藏互通截图：![app wrong fav 1](https://app.devin.ai/attachments/770769b9-d5b3-4375-805e-778daa7820ea/ss_4243d90b.png)

## T3 邀请链接 #reg- 注册模式

| 🟢 #account 邀请链接为 /app2/#reg-Z58 | 🟢 无痕打开 → 默认「注册新账号」模式 |
|---|---|
| ![account invite](https://app.devin.ai/attachments/2982f25a-7492-43ea-90ab-37f123f1550a/ss_099c59ab.png) | ![incognito register](https://app.devin.ai/attachments/8228ebd8-78e1-4fc6-a66f-bcfb4b5ff8f9/ss_04a0f8cb.png) |

无痕窗口 console 验证 `zt_invite=Z58`：![zt_invite](https://app.devin.ai/attachments/04c1d661-514d-4085-9068-681b12bbcb78/ss_d9040b1b.png)

## T4 390px 回归

390px（DevTools 设备工具栏）：底部 5 格 tabBar 可见、左导航隐藏、打印按钮隐藏；展开错题卡「已收藏」按钮实测 **75×32px**（≥32px 热区达标）；`document.documentElement.scrollWidth=390` 无横向溢出。

![390px wrong](https://app.devin.ai/attachments/8cffec3f-7387-48b2-91f5-c8bd81d5b049/ss_e1911cc9.png)

## T5 监控与性能观察

- console error：仅 `net::ERR_BLOCKED_BY_CLIENT`（扩展拦截 Cloudflare Insights beacon，豁免）；pageerror：0。
- `performance.getEntriesByType('resource')` 扫描：HTTP≥400 = 0，/api 全 200。
- ⚠️ 慢响应复现一次：#wrong 在 390px 首次进入时骨架屏停留约 3 分钟（/api/wrongbook 等请求挂起，久于 61 轮的 76–90s），F5 后新加载 ~15s 恢复。截图：![skeleton](https://app.devin.ai/attachments/d50a0234-004d-49d3-98d1-c4c1afaa0ba9/ss_58fb0d72.png)

## 清库

- 测试邮箱：**qa62-1785864218@test.zalize.com**（含 1 次 2026 attempt、2 条错题、1 条 favorites）。
