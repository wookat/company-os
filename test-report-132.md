# QA 第 132 轮回归报告 — 两端 streak 口径统一 + app2 分享图/解析/引导（生产 build 38a8609）

- 时间：2026-08-04（UTC）
- 环境：生产 https://zhenti.zalize.com/app2/ 与 /app
- 部署核对：app2 硬刷新后 `document.scripts` 实际加载 `assets/index-COfXQLw4.js`，与 curl 到的 HTML 一致；旧版 /app meta `app-build=38a8609-202608042021` ✅
- 测试账号（请清库，两个）：
  - **qa132a-1785875078@test.zalize.com**（正向：app2 打卡 → 旧版）
  - **qa132b-1785875078@test.zalize.com**（反向：旧版作答 → app2）
- 录屏：`/home/ubuntu/screencasts/rec-4e52e323-de5a-4d6a-be67-69ec241f5dd9/rec-4e52e323-de5a-4d6a-be67-69ec241f5dd9-edited.mp4`

## 结果总览

| # | 用例 | 结果 |
|---|------|------|
| 1 | 手动打卡 toast 追加「点头部「连续学习」可生成分享图」 | ✅ |
| 2 | 每日一题解析按 A项/B项/C项/D项 分行 | ❌ 未分行（P3，见下） |
| 3 | 分享图矢量火焰（非 emoji） | ✅ |
| 4 | 弹层 ESC / 右上✕ / 遮罩 / 关闭按钮 | ✅（四种全部生效） |
| 5 | 正向：app2 打卡 → 旧版 /app 日历点亮、连续 1 天 | ✅（刷新一次后） |
| 6 | 反向：旧版做一题交卷 → app2 头部已打卡 ✓、streak≥1 | ✅（checkin days=[] 仍显示） |
| 6b | app2「近四周打卡」格是否与头部口径一致 | ❌ 只读 checkin，作答日不点亮（P3 新发现） |
| 7 | 390px 弹层完整 / scrollWidth=390；1440 三栏 | ✅ |
| 8 | console/pageerror/HTTP≥400 | ✅（既知豁免外为零） |

## 详情与证据

### 1. 手动打卡 toast 引导 — 通过
账号 A（新号 streak=0）点头部「今日打卡」，绿色 toast 逐字为「今日打卡成功 ✓，点头部「连续学习」可生成分享图」，pill 即时变「已打卡 ✓」、「连续学习 1 天 分享 ›」。

![toast 引导](https://app.devin.ai/attachments/928e45a1-0e55-4992-9b9c-dcf4ba0560d9/ss_42d8fe1e.png)

### 2. 每日一题解析分行 — 失败（P3，修复对当前题无效）
今日题为 2013 年第 18 题，其解析文案措辞为「A正确：…B正确：…C错误：…D正确：…」。代码 split 正则为 `(?=[A-D]项)`，**不匹配「A正确/C错误」**，故解析仍渲染为一整段密排（见图），修复在此类题上不生效。建议正则放宽为 `(?=[A-D](项|正确|错误))` 或在数据侧统一「X项」措辞。

![解析仍一段密排](https://app.devin.ai/attachments/0285bed0-81a4-4b39-909a-68130fd3b152/ss_zoom_2e7afaff.png)

### 3+4. 分享图矢量火焰与关闭动线 — 通过
- 火焰为橙色（#fb923c）矢量曲线火焰形，与 131 轮的平台 emoji 🔥 明显不同（无黄芯多彩渐变）。
- 右上角白色圆形 ✕ 按钮存在；实测 **ESC 键**、**✕**、**遮罩点击**、**「关闭」按钮** 四种方式均能关闭弹层。
- 「保存图片」download=`真题工坊打卡1天.png` 仍在。

| 🟢 弹层全貌（含右上 ✕） | 🟢 矢量火焰特写 |
|---|---|
| ![弹层](https://app.devin.ai/attachments/9f272f99-58df-4cef-bd8c-daeabfa05060/ss_8e155494.png) | ![矢量火焰](https://app.devin.ai/attachments/38466e8f-f5f5-4f80-8dea-562b82ed1a95/ss_zoom_d4852539.png) |

### 5. 正向同步：app2 打卡 → 旧版 /app — 通过
账号 A 在 app2 打卡后打开旧版 /app：首次加载头部仍为「今天做一题即打卡」（syncDailyDays 异步落 localStorage，符合已知说明）；**F5 一次后**头部变「🔥 连续学习 1 天」，打卡日历 8 月 4 日格 🔥 点亮、「🔥 连续 1 天」。131 轮同场景为「连续 0 天」，本轮修复真实生效。

| 🟢 旧版头部（刷新后） | 🟢 打卡日历 8/4 点亮 |
|---|---|
| ![旧版头部](https://app.devin.ai/attachments/738083c5-b402-4d79-87d7-336541e87399/ss_zoom_b4552a09.png) | ![日历](https://app.devin.ai/attachments/c39f3ca5-f193-4bdd-9324-2098daa0c16d/ss_fb25d80a.png) |

### 6. 反向同步：旧版作答 → app2 — 通过（附 P3 新发现）
账号 B（全新号，未打卡未揭晓）在旧版做 2024 免费卷第 1 题提前交卷（1/32）。打开 app2 硬刷新：头部「已打卡 ✓」+「连续学习 1 天 分享 ›」+「本周作答 1 次 · 正确率 3%」。反证：带 token 请求 `/api/checkin` 返回 `{"days":[]}` —— UI 的已打卡纯由 `stats.attempt_day_ts` 并集而来，口径统一生效。

**P3 新发现**：同一页面右栏「近四周打卡」28 格全灰（当日不点亮）。代码 `Home.tsx` L603 `const days = new Set(checkin)` 只读打卡日、未用 daySet 并集，与头部「已打卡 ✓」自相矛盾。建议该格改用 daySet。

| 🟢 app2 头部已打卡（仅作答无 checkin） | 🔴 近四周打卡格未点亮（P3） |
|---|---|
| ![app2 header](https://app.devin.ai/attachments/9aeff000-be2a-4ac6-bea1-4efa77189056/ss_zoom_a2eded63.png) | ![grid](https://app.devin.ai/attachments/2fc6c42f-29a2-4812-aa80-4562e80d4b40/ss_zoom_57531c78.png) |

旧版交卷成绩页（造数证据）：

![result 1/32](https://app.devin.ai/attachments/51da733d-c325-4d9c-8c02-631ed1060d59/ss_effc56a3.png)

### 7. 双视口 — 通过
- 390px：分享弹层完整（✕/图/保存图片/关闭均在视口内，tabBar 不遮挡），`document.documentElement.scrollWidth=390` 无横向溢出。
  ![390 弹层](https://app.devin.ai/attachments/6ec77e60-b359-4e99-9e5c-8ea443efb170/ss_a854edaa.png)
- 1440：三栏布局正常、弹层居中、火焰/解析可读（见上各图）。

### 8. 监控
- console/pageerror：无产品错误。既知豁免：Cloudflare Insights beacon ERR_BLOCKED_BY_CLIENT（扩展噪音）、登录前 /api/me 401。DevTools 中出现 2 条 `ERR_INVALID_URL data:image/png...`，为 DevTools 对分享图 data-URL 的 sourcemap 探测噪音，弹层图片实际渲染正常。
- HTTP≥400：仅一条 401 为本人 console 无鉴权探测 /api/checkin 所致（自证用，非产品流量）。
- 性能备注：账号 B 注册与 `/api/real/paper?year=2024`、`daily-reveal?src=act` 各挂起约 60 秒后 200（生产 API 间歇性慢，既知，无功能错误）。

## 问题清单
- **P3-1（回归失败项）**：每日一题解析分行 split 正则 `(?=[A-D]项)` 不匹配实际解析措辞「A正确/C错误」，今日题仍一段密排。建议 `(?=[A-D](项|正确|错误))`。
- **P3-2（新发现）**：app2 右栏「近四周打卡」格只读 /api/checkin，不含作答/背诵日；仅作答用户头部「已打卡 ✓」但格子全灰，口径与头部不一致（Home.tsx L603）。
- 提示：旧版首次进工作台 streak 未即时并入（需一次刷新），与需求说明一致，非缺陷。
