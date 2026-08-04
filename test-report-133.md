# QA 第 133 轮回归报告 — QA132 P3×2 修复复验 + 慢API观测 + 看板旧端 PV（生产 build 5d125a3）

- 时间：2026-08-04（UTC）
- 环境：生产 https://zhenti.zalize.com/app2/ 与 /admin
- 部署核对：app2 硬刷新后 `document.scripts` 实际加载 `assets/index-DHpn1K-p.js`，与 curl 到的 HTML 一致 ✅
- 测试账号（请清库）：**qa133-1785876397@test.zalize.com**
- 录屏：`/home/ubuntu/screencasts/rec-91acf01d-24c4-4a6b-8b1c-44e802f3d3c1/rec-91acf01d-24c4-4a6b-8b1c-44e802f3d3c1-edited.mp4`

## 结果总览

| # | 用例 | 结果 |
|---|------|------|
| 1 | 近四周打卡格并集口径（仅作答无 checkin 当日格点亮） | ✅ |
| 2 | 每日一题解析按选项分行（「A正确/C错误」措辞被新正则命中） | ✅ |
| 3 | 390px 解析分行可读、scrollWidth=390 无溢出 | ✅ |
| 4 | /admin 公开 PV「旧端N」分项（今日 a1=2） | ✅ |
| 5 | 慢API(>5s) slowlog 入账 + amber 徽标显示 | ✅ |
| 6 | console/pageerror/HTTP≥400 | ✅（仅 /admin 页 favicon.ico 404，站点级既有，见备注） |

## 详情与证据

### 1. 近四周打卡格并集口径（QA132 P3-2 复验）— 通过
新号 qa133 **不打卡不揭晓**，仅在 app2 做 2026 卷第 1 题提前交卷（1/33）。回 #home 硬刷新（1440px）：
- 头部「已打卡 ✓」+「连续学习 1 天 分享 ›」；
- 右栏「近四周打卡」**今日格（右下）蓝色点亮**——QA132 同前置下 28 格全灰，修复真实生效；
- 反证：带 Bearer zt_token 实测 `GET /api/checkin` 返回 `{"days":[]}`，点亮纯由 attempt_day_ts 并集而来。

| 🟢 1440 工作台（头部已打卡 + 今日格点亮） | 🟢 近四周打卡特写（QA132 时为全灰） |
|---|---|
| ![home 1440](https://app.devin.ai/attachments/8d4af477-524f-43f0-afc3-51a8666a2f04/ss_c736e97f.png) | ![grid](https://app.devin.ai/attachments/f71effaf-9705-482f-a315-4940bb0bb87b/ss_zoom_3ecc211f.png) |

### 2+3. 每日一题解析分行（QA132 P3-1 复验）— 通过
今日题仍为 2013 年第 18 题（解析措辞「A正确：/B正确：/C错误：/D正确：」，与 QA132 同题，构成同题对照）。揭晓后解析块**每个选项独立成行**，新正则 `(?=[A-D](?:项|正确|错误|对|错))` 命中；QA132 同题为一整段密排。390px 下同样分行、行距正常，`scrollWidth=390` 无横向溢出。

| 🟢 1440 揭晓后解析分行 | 🟢 390px 分行可读 |
|---|---|
| ![analysis 1440](https://app.devin.ai/attachments/839f07a4-a541-48e8-939e-bf88d7b41045/ss_zoom_a0f3849e.png) | ![analysis 390](https://app.devin.ai/attachments/88daff31-af1b-4d34-97f9-a12711153886/ss_ae37bb6e.png) |

整卡揭晓全貌（含 ✓ 标注与答案 ABD）：

![daily revealed](https://app.devin.ai/attachments/68b38531-a79e-4760-bcec-2a8a2c5a9241/ss_d1239876.png)

### 4. /admin 看板「旧端」PV 分项 — 通过
测试中先访问一次 /app（累计 a1），登录 /admin 后公开 PV 行 08-04 显示 `524 (年107/考72/索48/析57/详83/科9/析年22/题131/搜94/新端21/旧端2)`——「旧端2」≥1；hover title 含「旧客户端 2」（DOM title 属性核对）。历史日期行显示「旧端0」，格式一致。

### 5. 慢API(>5s) 观测 — 通过（自然触发）
本轮 /admin 两次加载 `/api/admin/searches` 各耗时 ~9–10s（>5s），slowlog 真实入账。`curl -H "X-Admin-Key: <key>" /api/admin/searches` 返回：
```json
"slow_api": [
  {"t":"2026-08-04T20:50:56","p":"/api/admin/searches","m":"GET","ms":8662,"s":200},
  {"t":"2026-08-04T20:44:08","p":"/api/admin/searches","m":"GET","ms":9707,"s":200}
]
```
看板搜索区同步显示 amber 徽标「慢API(>5s) 近1条 · 最新 /api/admin/searches 10s」（首次加载时 1 条，第二次请求也入账）。徽标"仅有记录才显示"的隐藏分支本轮因已有记录未覆盖。

| 🟢 看板：PV 旧端分项 + 慢API amber 徽标（页面全景） | 🟢 特写（08-04 旧端2 / 慢API徽标） |
|---|---|
| ![admin](https://app.devin.ai/attachments/b7c266f5-afda-4859-bda6-39467869a1ba/ss_b585a09f.png) | ![zoom](https://app.devin.ai/attachments/29588a52-fd9d-4fea-94e9-2a539df6006d/ss_zoom_a47ba5a5.png) |

### 6. 监控
- console/pageerror：无产品错误（Cloudflare beacon 扩展噪音、登录前 401 豁免）。
- HTTP≥400：仅 `/favicon.ico` 404（/admin 页请求站点根 favicon，站点级既有缺失，与本轮改动无关，建议补一个 favicon）。
- 双视口：390 `scrollWidth=390`；1440 三栏正常。

## 备注
- 慢API观测本身即捕获了 `/api/admin/searches` 的 9–10s 慢响应——该接口做多表聚合，属此前多轮报告的"生产 API 间歇性慢"同类现象，本轮功能上正是用它验证了 slowlog 闭环。
- 徽标为空时隐藏的分支未覆盖（当前 KV 已有记录，14 天 TTL 内无法自然清空）。
