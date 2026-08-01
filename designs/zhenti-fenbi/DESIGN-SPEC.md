# 真题工坊设计规范 v2（DESIGN-SPEC · 对标粉笔完整设计体系）

> 设计线负责人交付 · 2026-08-01 · 沿用 v1 token（redesign-proposal.md §3），本文为完整版规范。
> 配套：`components.html`（组件库实物）、`assets/`（Logo/图标 SVG）、`proto-*.html`（10 个页面原型）。

---

## 0. 使用方式

所有 token 通过 Tailwind CDN 内联 config 注入（无构建）。每个页面 `<head>` 统一粘贴：

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = { theme: { extend: { colors: {
  brand:{50:'#EEF4FF',100:'#DFEAFF',200:'#C3D7FF',300:'#96BAFF',400:'#649AFF',500:'#3D7FFF',600:'#2E6BEC',700:'#2456C7',800:'#1E46A0',900:'#1B3B7F'},
  page:'#F4F6FA',
  ink:{DEFAULT:'#1E2330',2:'#5A6472',3:'#9AA3B2'},
  ok:{50:'#E6F7F1',100:'#C2EDDD',500:'#00B578',600:'#009A66',700:'#007D54'},
  bad:{50:'#FFEDED',100:'#FFD6D7',500:'#FF4D4F',600:'#E5393B',700:'#C22B2D'},
  warn:{50:'#FFF6E5',100:'#FFE9C2',500:'#FFA716',600:'#E58F00',700:'#BF7700'},
  streak:{50:'#FFF0E6',100:'#FFDCC7',500:'#FF7A2F',600:'#E86518',700:'#C25212'},
  night:{bg:'#0F1420',card:'#171E2E',line:'#232C42',ink:'#E8ECF4',ink2:'#A7B0C2',ink3:'#6B7690'}
}}}}
</script>
```

## 1. 色板（含语义色全阶）

### 1.1 品牌蓝 brand（抄粉笔主色气质：饱和明快的功能蓝，抄它 = 抄"权威+效率"的考试工具心智）

| 阶 | 值 | 用途 |
|---|---|---|
| 50 | #EEF4FF | 选中背景、次按钮底、激活 Tab 底 |
| 100 | #DFEAFF | focus ring（`ring-brand-100`）、hover 次按钮 |
| 200 | #C3D7FF | 装饰描边、图表辅助 |
| 300 | #96BAFF | 图表次系列 |
| 400 | #649AFF | 图表主系列浅档、暗底上的链接 |
| 500 | #3D7FFF | **主色**：主按钮、激活态、进度条、链接 |
| 600 | #2E6BEC | 主按钮 hover、亮底可读文本（见 §6） |
| 700 | #2456C7 | 主按钮 active、选中态文字（`text-brand-700`） |
| 800/900 | #1E46A0 / #1B3B7F | 暗色端渐变止点、深色插画 |

### 1.2 语义色全阶（每色 50/100/500/600/700，抄粉笔"绿对红错黄警橙激励"四色语义）

- **ok 正确/完成绿**（粉笔判对绿）：50 `#E6F7F1` 浅底徽章 · 100 `#C2EDDD` · 500 `#00B578` 图形 · 600 `#009A66` 文本（亮底 AA）· 700 `#007D54` 小字文本
- **bad 错误/到期红**：50 `#FFEDED` · 100 `#FFD6D7` · 500 `#FF4D4F` 图形 · 600 `#E5393B` 文本 · 700 `#C22B2D` 小字文本
- **warn 待查/中档黄**：50 `#FFF6E5` · 100 `#FFE9C2` · 500 `#FFA716` 图形（标记待查、黄点）· 600 `#E58F00` 文本 · 700 `#BF7700` 小字文本
- **streak 激励橙**（粉笔打卡火焰橙）：50 `#FFF0E6` · 100 `#FFDCC7` · 500 `#FF7A2F` 火焰/连续天数 · 600 `#E86518` 文本 · 700 `#C25212` 小字

规则：**500 只用于图形（色块/条/环/点），文字一律用 600/700**（保证对比度，见 §6）；浅底徽章 = `bg-{c}-50 text-{c}-600/700`。

### 1.3 中性色

页面底 `page #F4F6FA`（粉笔式浅灰蓝，让白卡自然分层）；卡 `white`；文字三级 `ink #1E2330` / `ink-2 #5A6472` / `ink-3 #9AA3B2`；分隔线 `black/5`，输入描边 `black/10`。

## 2. 字体与字阶

字体栈：系统默认 `font-sans`（PingFang SC / HarmonyOS Sans / MiSans / Segoe UI）；**数字一律 `tabular-nums`**。

| 级 | 类 | 用途 |
|---|---|---|
| Display | `text-4xl sm:text-5xl font-extrabold tabular-nums` | 倒计时、成绩大数字 |
| H1 | `text-xl sm:text-2xl font-bold` | 页面标题 |
| H2 | `text-lg font-bold` | 分组标题 |
| H3 | `text-[15px] font-semibold` | 卡片标题、列表主文本 |
| 题干 | `text-[16px] leading-7 font-medium` | 答题页题干（刷题主阅读面，抄粉笔 16px/28 行高） |
| Body | `text-sm leading-6 text-ink-2` | 正文、选项、解析 |
| Caption | `text-xs text-ink-3` | 辅助说明、meta |
| Micro | `text-[11px] font-semibold` | 题型徽章（多选/材料分析） |

## 3. 间距 / 圆角 / 阴影栅格

- **间距（4px 基）**：页面容器移动 `px-4 pb-24`、桌面 `max-w-5xl mx-auto px-6 py-8`；卡内 `p-4 sm:p-5`；卡间 `space-y-4`；分组标题 `mt-6 mb-2`；行内元素 gap `2/3`。触控 ≥44px：主按钮 `h-12`、次按钮 `h-10`、图标钮 `h-9 w-9`、底 Tab `h-14`。
- **圆角三档**：卡片/弹窗 `rounded-2xl`(16)；按钮/输入/选项块/列表行 `rounded-xl`(12)；徽章/chips/搜索 `rounded-full`；小色块 `rounded-lg`(8)。
- **阴影两档**：卡 `shadow-[0_1px_3px_rgba(30,41,59,0.06)]` + `border border-black/5`；浮层（弹窗/toast/下拉）`shadow-xl`。禁止其他阴影档。

## 4. 暗色 Token（仅落地页 / 营销面使用）

落地页整体改为**亮色**、与应用内同一语言（见 proto-landing.html，替换现有暗色 indigo 落地页）。night 系列 token 仅供落地页局部深色段（页脚、产品演示窗、社会证明横带）使用：底 `night-bg #0F1420`、卡 `night-card #171E2E`、线 `night-line #232C42`、文字 `night-ink #E8ECF4` / `night-ink2 #A7B0C2` / `night-ink3 #6B7690`；暗底上主 CTA 仍用 `brand-500`（对比 4.6:1 ✓），渐变 `from-brand-600 to-brand-900`。应用内（登录后）一律亮色，不做暗色模式。

## 5. 对照粉笔：抄了什么、为何（逐项）

| 项 | 粉笔的做法 | 我们的落地 | 为何 |
|---|---|---|---|
| 主色 | 饱和功能蓝 | brand-500 全站唯一行动色 | 考试工具的"权威/效率"心智，用户肌肉记忆 |
| 页面底 | 浅灰蓝非纯白 | page #F4F6FA | 白卡免描边自然分层 |
| 语义四色 | 绿对/红错/黄警/橙激励 | ok/bad/warn/streak 全阶 | 判题、到期、打卡场景直觉映射 |
| 大数字 | 练习报告大号加粗数字 | Display 级 + tabular-nums | 分数/倒计时是核心情绪点 |
| 选项交互 | 整行块选中变蓝底 | 选项块选中 `bg-brand-50 border-brand-500` | 命中区大、状态醒目 |
| 成绩环 | 圆环得分+评语 | SVG 环 红<40/黄≤70/绿 | 一屏读懂成绩 |
| 底部 Tab | 移动端 3-5 Tab | 3 Tab（工作台/错题本/我的） | 拇指导航 |
| 错题卡 | 左色条+复习阶段 | `w-1` 色条 + 莱特纳 n/4 徽章 | 扫读+紧迫感 |
| 打卡 | 火焰橙连续天数+日历 | streak 色 + 4 周日历弹层 | 留存钩子 |

## 6. 无障碍对比度要求（WCAG 2.1 AA）

- 正文/列表 ≥4.5:1：`ink`(15.6:1)、`ink-2`(7.0:1) ✓；`ink-3` 仅限 caption/占位（3.0:1，不承载关键信息）。
- 彩色文字必须用 600/700 阶：`brand-600` 白底 4.7:1 ✓、`ok-600` 4.6:1 ✓、`bad-600` 4.5:1 ✓、`warn-700` 4.5:1 ✓、`streak-600` 4.5:1 ✓；**500 阶禁止做小号文字**（如 warn-500 白底仅 1.9:1）。
- 白字按钮底 ≥4.5:1：`bg-brand-500` 4.6:1 ✓、`bg-ok-600`、`bg-bad-500` 4.5:1 ✓。
- 非文本（图标/描边/进度）≥3:1；focus 可见：`focus:ring-2 ring-brand-100 + border-brand-500`；键盘可达：答题 A-D/←→、弹窗 Esc；触控 ≥44×44。
- 色盲兜底：对错除颜色外必须带符号 ✓/✗、徽章文字（答对/答错/待查）。

## 7. 组件规格（实物见 components.html）

按钮五态、输入、chips、分段控件、卡片、徽章、toast、弹窗、进度环/条、空态、列表行的最终类名以 `components.html` 内每个示例旁的代码注释为准；组件与页面的工程替换映射表见交付消息。
