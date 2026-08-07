# QA155 · 增量回归报告（生产 build 153251f）

- 生产：https://zhenti.zalize.com/app2/ ，bundle `assets/index-Cu90KbVZ.js`（无缓存 HTML 核对，内含「展开完整解析」串）
- 测试账号（**请清库**）：`qa155-1786097803@test.zalize.com`，**uid=272**
  - 数据：attempt×3（2010 整卷 417 0/30、抗美援朝真题卷 418 0/2、AI 模拟卷 419 0/10）、AI 卷 419 落库 10 题、material「官方考点库·史纲」、错题 14+、无收藏/flag
- 录屏：`/home/ubuntu/screencasts/rec-6c0cc793-7637-424d-8ca9-726ca11bfc95/rec-6c0cc793-7637-424d-8ca9-726ca11bfc95-edited.mp4`
- 计划：`/home/ubuntu/zhentigongfang/test-plan-155.md`

## 结论总览

| # | 断言 | 结果 |
|---|------|------|
| T1a | 长解析折叠：首句加粗 + 「展开完整解析 ▾」按钮，余文默认隐藏 | ✅ passed |
| T1b | 点击按钮 → 余文展开、按钮消失 | ✅ passed |
| T1c | 不满足拆分条件的解析原样整段显示、无按钮（Q1/Q17/Q23，2010 卷） | ✅ passed（口径见备注①） |
| T1d | 390px：scrollWidth=390 无溢出、折叠按钮可见（26 个按钮全部渲染） | ✅ passed |
| T2 | AI 补练 10 题（卷 419）：解析引用字母与洗牌后显示答案一致 | ✅ passed（10/10；QA154 时 7/10 矛盾） |
| T3 | 标记待查后按 Enter：翻题不重复 toggle（点击后 blur） | ✅ passed |
| T4 | console error / pageerror / HTTP≥400 全零 | ✅ passed |

**备注①（口径限制）**：全库客观题中不存在真正 ≤90 字的短解析样本；「原样显示」分支是通过首句正则不命中（整段无可拆分首句/余文，如 2010 Q1、Q17、Q23）的题目验证的，与组件 `!first || !rest || t.length<=90` 的兜底逻辑一致，但严格意义的「短解析 ≤90 字」输入未被真实数据覆盖。

## T1 一句话解析置顶（2010 整卷 → #result/417）

| 🔴 默认折叠（Q2：首句加粗+按钮） | 🟢 点击后展开（余文出现、按钮消失） |
|---|---|
| ![折叠态](https://app.devin.ai/attachments/6ba22f51-17f3-41c6-a0f7-21f0c69cf4e5/ss_488a80fd.png) | ![展开态](https://app.devin.ai/attachments/89b744dc-7ccf-402e-a685-a160a1eca96a/ss_826932c5.png) |

| 无拆分条件的解析原样显示（Q1，无按钮） | 390px：折叠卡与按钮完整、无溢出 |
|---|---|
| ![原样显示](https://app.devin.ai/attachments/dfb3e802-06bc-45a9-81da-a1da07c2c3bb/ss_zoom_5c7e68b6.png) | ![390px](https://app.devin.ai/attachments/9c76bced-21bb-408c-bcb8-6d2c3474bc32/ss_zoom_c99e2f8d.png) |

- 按钮文案逐字为「展开完整解析 ▾」，390px 下 CDP 实测 `scrollWidth=390`、26 个折叠按钮全部在 DOM 并可点击。

## T2 AI 解析字母重写复验（P1 修复，卷 #result/419）

流程：真题区「按考点」→「抗美援朝 2 题」组卷 0/2 → 弱项榜「AI 补练 ›」→ 官方考点库·史纲导入 → 10 题模拟卷生成 → 全选 A 交卷。

| 成绩页 0/10（答案分布 ABD/ABCD/BC/BC/ABD/ABC/AD/ACD/BD/ABD，无位置集中） | Q1 解析：字母引用与答案 ABD 一致 |
|---|---|
| ![AI卷成绩页](https://app.devin.ai/attachments/aff11153-ddb2-477e-bf95-5425acf588bb/ss_a594c305.png) | ![Q1解析](https://app.devin.ai/attachments/59fdebfc-a351-486a-b402-9f596bc60c6e/ss_zoom_290e20c9.png) |

- 展开全部 10 题解析逐题核对（全文存档 `/tmp/ai419_full.txt`）：每题解析中「X 正确 / X 错误」引用的字母集合与显示「✓ 正确答案」完全一致，零矛盾（QA154 时 7/10 矛盾）。
- 语义抽核 5 题（Q1/Q3/Q4/Q7/Q9）：字母指向的选项文字与解析论证内容一致，例如 Q3 答案 BC，解析论证 B（彭德怀任司令员/停战协定）与 C 正确、A（"第一次完全胜利是抗日战争"）与 D 错误，与选项内容吻合。
- 有趣的副证：解析中的字母顺序呈"洗牌后"特征（如「B、D、A正确」「C、D、B、A均正确」），符合 021e0df 重映射实现。

## T3 标记待查失焦复验（P3 修复，2010 卷答题页）

| 🔴 第 1 题点「标记待查」→ 已标记（答题卡待查=1） | 🟢 按 Enter×2 → 第 3/30 题，标记仍只有第 1 题 |
|---|---|
| ![标记点亮](https://app.devin.ai/attachments/496a3e51-0ed3-49bc-917d-77eb6b00e2ba/ss_bf16cb67.png) | ![Enter翻题](https://app.devin.ai/attachments/9f3faeec-7d34-417e-943e-f47ebb1f92ca/ss_56e918e5.png) |

- QA154 旧行为（Enter 反复 toggle、误标 17 题）未复现。

## T4 运行时监控

- CDP 监听 `Runtime.consoleAPICalled(error)` / `Runtime.exceptionThrown` / `Network.responseReceived(status≥400)`，覆盖 result/419 重载 + #result/417 + #wrong 导航，共 24s：**事件数 0**。
- 交卷/生成等全流程 UI 操作期间未观察到错误 toast 或异常。

## 其他观察（非阻塞）

- P4 备注：进入「按考点」列表时曾出现一次骨架屏停留（首次点击 tab 未加载出考点列表，切换「按年份」再切回后正常，API 实测 200）。未再复现，疑似偶发前端状态问题，建议留意。
- 复用 QA153 沉淀：mobile 视口恢复需先 `setDeviceMetricsOverride(mobile:false)` 再 `clearDeviceMetricsOverride`，单独 clear 可能不生效。
