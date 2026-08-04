# QA 第 130 轮测试报告 — app2 每日一题卡 + 打卡分享图（生产 build 5bbff22）

- 环境：生产 https://zhenti.zalize.com/app2/ ，硬刷新后实际加载 `assets/index-p2y-djN7.js`（与 curl 产物一致，符合用户指定 bundle）
- 测试账号（请清库）：**qa130-1785872496@test.zalize.com**（密码 qa130pass）
- 录屏：rec-f727bfbc-27ee-44b5-a291-db70761e65c0-edited.mp4

## 结论总览

| 用例 | 结果 |
|---|---|
| T1 每日一题折叠/展开、揭晓前不泄漏答案 | ✅ passed |
| T2 揭晓后答案/解析/打卡联动（API 慢时首次尝试） | ❌ **failed（P1，见下）** |
| T2' 揭晓后答案/解析/打卡联动（API 正常时重试） | ✅ passed |
| T2 考点直练跳转 realsearch | ✅ passed |
| T2 分享给研友复制+toast | ✅ passed |
| T3 与旧版 /app 同题 | ✅ passed |
| T4 streak=0 无分享入口/无弹层 | ✅ passed |
| T4 streak=1 分享图弹层（canvas/保存/关闭/遮罩） | ✅ passed |
| T5 390px / 桌面双视口 | ✅ passed |
| T6 console/pageerror/HTTP≥400 | ✅ passed（既知扩展 beacon 噪音豁免） |

## P1 发现：API 超时导致「揭晓即打卡」静默丢失

首次点击「先想好答案，再点我揭晓 ›」时恰逢生产 API 慢响应（61/62/128 轮均报过），`POST /api/daily-reveal?src=app` 与 `POST /api/checkin` 均在 **20s 客户端超时被中止（responseStatus=0, duration=20000ms）**。UI 因乐观更新显示「已打卡 ✓」「连续学习 1 天 分享 ›」，但**刷新后打卡丢失**，头部回到「今日打卡」/streak=0——用户会以为打了卡实际没打上，连续打卡断签风险。代码中 `api('/checkin',{method:'POST'}).catch(()=>undefined)` 静默吞掉失败，无重试、无失败提示。建议：POST 失败时 toast 提示并回滚乐观状态，或对打卡类 POST 增加重试。

约 2 分钟后 API 恢复正常，重新揭晓两 POST 均 200，刷新后打卡持久（「已打卡 ✓」streak=1、近四周打卡当日格点亮），后续验证在此状态下进行。

## 证据截图

**T4 前置：streak=0 时 pill 无「分享 ›」、点击无弹层**
![streak0](https://app.devin.ai/attachments/f4efc359-7727-4176-a0ea-62d787a1b41d/ss_a15cf988.png)

**T1 展开态（揭晓前）：徽章「2013 年第 18 题 · 多选」+题干+ABCD，无 ✓ 无答案无解析，仅玫红胶囊**
![before-reveal](https://app.devin.ai/attachments/e556ac5f-42ff-4bf2-8d4f-7b42e738b800/ss_64643077.png)

**T2 揭晓后：A/B/D 绿色 ✓、「答案 ABD」+解析、考点直练+分享给研友；头部即时「已打卡 ✓」「连续学习 1 天 分享 ›」**
![revealed](https://app.devin.ai/attachments/e7791ba7-2bda-4b82-969d-b289e33fc1e3/ss_9dfcc7b1.png)

**P1 证据：超时后刷新，打卡丢失回「今日打卡」/streak 0（perf 记录：daily-reveal 与 checkin 均 status 0 / 20000ms）**
![lost-checkin](https://app.devin.ai/attachments/82acb2e2-5fe3-4392-8280-576620bf9fdb/ss_953ae009.png)

**重试成功后刷新：打卡持久，近四周打卡当日格点亮**
![persisted](https://app.devin.ai/attachments/3847fbb0-88ba-4cb8-8d00-d8f7afef5935/ss_81d7f144.png)

**分享给研友：toast「已复制，发给研友一起做」；剪贴板读出 `今天这道考研政治真题你会吗？「唯物史观…人民群众…」来对答案：https://zhenti.zalize.com/zhenti/2013#q18`**
![share-toast](https://app.devin.ai/attachments/f23c8a9f-de36-4645-a4a2-25970c14ed0c/ss_4d57f9c2.png)

**考点直练：跳 #realsearch/人民群众是历史的创造者，命中 4 道**
![realsearch](https://app.devin.ai/attachments/6917c8b6-8a89-469f-bdb8-35a039c849da/ss_ff55aa70.png)

**T4 分享图弹层（桌面）：蓝紫渐变 canvas「真题工坊·学习打卡 / 🔥 / 连续 1 天 / 累计打卡 1 天…一天不落 / 距考研初试还有 136 天 / zhenti.zalize.com」+「保存图片」(download=真题工坊打卡1天.png) +「关闭」**
![share-modal](https://app.devin.ai/attachments/0de2828c-c10c-4057-bfd9-1318eb6a9f42/ss_0f9a8bbc.png)

**点遮罩关闭后（弹层消失，页面正常）**
![mask-close](https://app.devin.ai/attachments/b2ac23a0-568e-42c9-924c-92d321a37c81/ss_5acddad6.png)

**T3 旧版 /app 每日一题同题（同题干前 20 字+同考点「人民群众是历史的创造者」），且「已打卡 ✓」与 app2 揭晓打卡同步**
![legacy-app](https://app.devin.ai/attachments/b9bb7067-7dfc-4945-ac38-817037d3abe3/ss_zoom_51834dd9.png)

**T5 390px：每日一题展开无横向溢出（scrollWidth=390），揭晓胶囊/tabBar 正常**
![390-card](https://app.devin.ai/attachments/61358066-52ea-4009-baa8-07ec350e9286/ss_21cbea05.png)

**T5 390px 分享弹层完整不裁切**
![390-modal](https://app.devin.ai/attachments/8e40f4b2-c969-40ff-ba0e-9623b192469e/ss_02410c9d.png)

**T5 桌面三栏：每日一题卡位于 2026 新卷卡下方、今日任务上方**
![desktop](https://app.devin.ai/attachments/7fdf4677-7b31-411f-86eb-d967e607e05d/ss_6375c79c.png)

## 监控与口径说明

- console error：仅扩展拦截 Cloudflare beacon 的 `ERR_BLOCKED_BY_CLIENT`（既知豁免）；无 pageerror。
- HTTP≥400：登录前 `/api/me` 401（预期）；除 P1 的两个 status 0（超时中止）外，全部 2xx；`performance` 中 `responseStatus>=400` 为 0。
- 剪贴板内容通过 `navigator.clipboard.readText()` 客观核验；toast 截图为视觉证据。
- 折叠态「做一做 ›」/☀️ 图标/题干截断在 streak=0 截图与 390px 截图中均可见。
- 造数说明：本轮未做整卷——每日一题「揭晓即打卡」本身即产生 streak=1 打卡数据，且做卷不产生 checkin（打卡与作答两套数据），先做卷反而会破坏「pill 即时变化」前置条件；已用 streak=0→揭晓→streak=1 完整覆盖两个边界。
- 测试中途桌面 Chrome 崩溃一次（与被测产品无关），用同一 profile 重启后登录态保留，continued；崩溃前后断言不受影响。
