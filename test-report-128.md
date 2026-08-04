# UX 第 128 轮 + 美工联合走查报告 — 生产 app2（build 4438f6e）

- 对象：https://zhenti.zalize.com/app2/ （meta app-build=`4438f6e-202608041746`），对照旧版 https://zhenti.zalize.com/app
- 性质：体验/视觉走查（非全链路 QA，62 轮已过）。桌面（1600×1069 视口，三栏布局同 1440 断点 xl）+ DevTools 390px。
- 测试账号（请清库）：**qa128-1785865868@test.zalize.com**（qa62 账号已被清库，登录态失效，故新注册）
- 造数：2026 卷提前交卷 0/33（2 道错题）、2019 卷提前交卷 1/31，使趋势图/弱项榜/错题本有数据。**未触发 AI 生成/出卷额度接口**。
- 录屏：`/home/ubuntu/screencasts/rec-47689f9e-0cce-4b7f-b004-e4312c3e3bd3/rec-47689f9e-0cce-4b7f-b004-e4312c3e3bd3-edited.mp4`

## P0–P3 分级问题清单

### P1（应尽快修）
1. **「移出错题本」即点即删，无确认、无撤销**（#wrong 错题卡展开后动作行）。实测点击后立即消失、toast「已移出错题本」，计数 2→1，无 Undo。且该破坏性操作与「报错」同为普通文字链样式，误触成本高。
   建议：a) 加确认（或 toast 内 5s「撤销」按钮，推荐后者，交互更轻）；b) 给破坏性动作红色弱化样式 `text-rose-600/70 hover:bg-rose-50`，与中性操作区分。
   删除后状态：
   ![移出后无撤销](https://app.devin.ai/attachments/b2e4aa93-99b9-4b8b-8c46-a507eb86d613/ss_8a7a1c89.png)

### P2
2. **正确率趋势图 X 轴顺序反了（新→旧）**。实测「第1卷」tooltip=3%（后做的 2019 卷）、「第2卷」=0%（先做的 2026 卷）——趋势线视觉上是「下降」，实际是先 0% 后 3% 的上升。数据源疑为 /api 成绩列表（新→旧）直接喂给 Recharts 未 reverse。建议 `data=[...attempts].reverse()`。
   ![第1卷=3%](https://app.devin.ai/attachments/7a85ad56-c0da-4b29-b41f-7ac332e6ce26/ss_zoom_3e294f0f.png)
   ![第2卷=0%](https://app.devin.ai/attachments/80935d64-4da9-4c7d-858f-5e0671d72b63/ss_zoom_3b306472.png)
3. **趋势图 Y 轴固定 0–100，低分段贴地平线不可读**：0%/3% 两点几乎重叠在基线上，看不出变化。建议 `domain={[0, 'dataMax + 10']}` 或 auto；轴标签 10px 灰色偏淡，建议 `fontSize 11`、`fill #94a3b8→#64748b`。（线色 brand 蓝、网格浅灰本身 OK。）

### P3（小问题，给到类名/色值）
4. **周摘要冗余（W4）**：头部 pill「本周作答 2 次 · 正确率 2%」与「本周摘要」卡前两格（2 本周作答（次）/ 2% 本周正确率）完全重复，卡片仅「有作答天数」为增量信息。建议：pill 保留（首屏概览），摘要卡三格改为差异化指标——「有作答天数 / 考点覆盖 / 待复习错题」，或 pill 去掉正确率只留打卡+作答次数。
   ![头部 pill](https://app.devin.ai/attachments/cd6d592c-c871-4ac8-8e42-c1c19a06bd25/ss_zoom_e1c9df19.png)
   ![本周摘要卡](https://app.devin.ai/attachments/b36aa557-534a-4a8c-b76c-0956417ea0e6/ss_zoom_c779fef1.png)
5. **成绩报告日期格式为美式 `8/4/2026`**（#history 全部成绩、错题卡「收藏于」同源）。中文 UI 建议 `toLocaleDateString('zh-CN')` → `2026/8/4` 或 `8月4日`。
6. **错题卡动作行主次（W3，除 P1 外部分）**：四个动作 收藏(63×32)/练同考点真题(107×32)/移出错题本(80×32)/报错(44×32) 高度均 32px（达 32 底线、低于 44 优选值，移动端同尺寸）。「练同考点真题」玫红描边视觉权重最高、合理；「收藏」灰描边次之、合理；建议动作按钮统一 `min-h-[36px]`（移动端 `min-h-[44px]`）。
7. **移动端 tabBar 文字 10px 偏小**（`text-[10px]`，图标 20px 辨识度 OK）：建议 `text-[11px]`；未选中 `text-ink-3` 对比度偏低，建议 `text-ink-2`。非阻塞。
8. **弱项榜行内三链接（练真题/AI 补练/📖）挤在一行**，小字号玫红/蓝并列略乱；建议统一图标+文字按钮或下拉收纳。

### 无 P0。硬指标结论
- **移动端适配：达标**。390px 各页 scrollWidth=390 无横向溢出；底部 tabBar 5 格 78×53px、快刷凸起圆钮醒目；打卡按钮 80×56px 热区充足；沉浸式蓝渐变头部完整不裁切。
- **视觉现代感：达标（明显优于 /app）**。app2 桌面为 232px 左导航 + 主内容 + 300px 统计右栏三栏布局，选中态 `bg-brand-50 text-brand-600` 清晰；旧版 /app 桌面为顶部导航单列窄栏，信息全部纵向堆叠且带 PWA 安装浮层遮挡内容。

## 关键截图

### 桌面 1440（W1）
| app2 工作台三栏 | 成绩报告 |
|---|---|
| ![app2 desktop home](https://app.devin.ai/attachments/a05a30c8-5278-4953-b178-adc2aa12ac08/ss_b093594b.png) | ![history](https://app.devin.ai/attachments/7a6c1a5b-381c-412f-aa33-daa24aace46a/ss_8bf029c4.png) |

| 分析题背诵 | 我的 |
|---|---|
| ![subjlist](https://app.devin.ai/attachments/d968d5c7-35c1-482d-ac45-1d6383df5bd9/ss_03858ada.png) | ![account](https://app.devin.ai/attachments/e43d8795-9d7a-4f8c-8bb8-61612f0b488c/ss_487d4409.png) |

W1 观感：卡片圆角/留白节奏统一（rounded-2xl + 白卡 + 页灰底），左导航层级清楚，右栏（近四周打卡/弱项榜/背诵进度）信息有增量价值；无对齐/裁切/对比度硬伤。

### 错题卡动作行（W3）
![错题卡动作行](https://app.devin.ai/attachments/76df1dbd-20a1-46fb-8053-d5d3cc5b1cbb/ss_zoom_8aaca8e5.png)

### 390px（W2）
| 工作台 390 | 错题卡展开 390 | 我的 390 |
|---|---|---|
| ![mobile home](https://app.devin.ai/attachments/6e975e1a-2451-4f6a-b032-973c96dce796/ss_532de913.png) | ![mobile wrong](https://app.devin.ai/attachments/27fbad6d-6770-4837-944c-ffdcfaf098a5/ss_158f95c1.png) | ![mobile account](https://app.devin.ai/attachments/6e234899-8127-4149-8faf-aafbc4c91050/ss_0a6078aa.png) |

tabBar 特写：
![tabBar](https://app.devin.ai/attachments/75ca6b12-f7b8-49e5-9982-10c2efec5aeb/ss_zoom_68065e36.png)

### 新旧对比（W6）
| 🔴 旧版 /app 390 | 🔴 旧版 /app 桌面 |
|---|---|
| ![app mobile](https://app.devin.ai/attachments/e0c6bb38-0b55-4ce7-9773-094347e6daab/ss_a019bad1.png) | ![app desktop](https://app.devin.ai/attachments/298d893f-cc12-413d-adfe-169272e32409/ss_d08faa78.png) |

（app2 对应视图见上方 🟢 截图。）

## 覆盖说明 / 未验证项
- **20s 超时 toast（4438f6e 新行为）未验证**：走查全程生产 API 响应正常（本轮未复现 61/62 轮的 70–90s 慢响应），无法在不做故障注入的情况下自然触发「网络较慢或已超时，请重试」toast。本轮定位为视觉走查，未做网络节流的可靠性专项。
- Recharts 检查基于 2 个数据点（本账号仅 2 次作答），多点密集场景（>10 卷时 X 轴标签是否重叠）未覆盖。
- console 仅有既知豁免噪音（扩展拦截 Cloudflare beacon 的 ERR_BLOCKED_BY_CLIENT、登录前 /api/me 401）；无产品报错。
- 走查中两处非 UI 操作说明：注册邮箱由脚本生成；「提前交卷」按钮在录屏开始前的造数阶段用了一次 console click（坐标映射偏差，非产品问题——普通指针点击在修正坐标后同样有效）。
