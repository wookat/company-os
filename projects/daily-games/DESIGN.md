# Daily Games 每日游戏矩阵 — 设计系统（DESIGN.md）

- 作者：ui-designer（与 ux-researcher 协作，交互依据见同目录 UX-FLOWS.md）
- 日期：2026-07-31
- 技术前提：Tailwind CSS v4（CSS 变量 @theme）、移动端优先、落地于 zalize-games 底座
- 对标：NYT Games 体验水准；所有 token 直接可被前端工程实例复制使用

---

## 1. 品牌方向

### 1.1 矩阵统一识别
- **矩阵名**：Daily Games（门户域名默认 `daily.zalize.com`，各游戏走子路径或子域）
- **统一识别要素**：所有游戏共享同一顶栏结构、同一字体栈、同一完成弹层、同一分享格式头（见 §9）。玩家在任意一款里都能感知"这是同一家的每日游戏"。
- **Logo 心智**：门户 logo 为「日历格 + 游戏格」组合的方格标（可用纯 CSS/SVG 实现，不依赖美术资源）；每款游戏 logo = 方格标 + 该游戏主题色填充。
- **命名规范**：每款游戏一个单词、可读可拼、`.com` 语感（如 Gridly / Sumline / Fuse / Mapdash / Casewise），页面 `<title>` 格式：`{GameName} — A Daily {Category} Game`。

### 1.2 每款游戏主题色（accent）
矩阵底色统一中性灰阶，**每款游戏只用一个 accent 色**做识别与反馈主色：

| 游戏品类 | slug | accent（浅色模式） | accent（深色模式） | 语义 |
|---|---|---|---|---|
| 词类网格 | word | `#538d4e`（绿） | `#6aaa64` | 沿用 Wordle 心智 |
| 数字盘面 | number | `#3a7bd5`（蓝） | `#5a9bf5` | 理性/计算 |
| 合成画布 | craft | `#b06ab3`（紫） | `#c98ccc` | 创造/魔法 |
| 地理猜测 | geo | `#e07a3f`（橙） | `#f0955c` | 探索/地图暖色 |
| 图形推理 | logic | `#0ea5a4`（青） | `#2dd4bf` | 冷静/推理 |
| AI 审讯 | detective | `#c94f4f`（红） | `#e06c6c` | 悬疑/案件 |

规则：accent 只用于**主按钮、正确反馈、streak、进度**；错误/警告用全矩阵统一的语义色（§2）；任何 accent 与其底色组合必须过 4.5:1 对比度（§11）。

---

## 2. 色彩系统与深浅色模式

Tailwind v4 `@theme` CSS 变量表（工程直接复制到 `app.css`）：

```css
@import "tailwindcss";

@theme {
  /* ---- 中性色（浅色模式默认） ---- */
  --color-bg: #ffffff;            /* 页面底 */
  --color-bg-subtle: #f6f6f4;     /* 卡片/弹层底 */
  --color-tile: #ffffff;          /* 空格子底 */
  --color-tile-border: #d3d6da;   /* 空格子描边 */
  --color-text: #1a1a1b;          /* 主文字 */
  --color-text-muted: #6e7178;    /* 次文字 */
  --color-divider: #e5e7eb;

  /* ---- 语义色（全矩阵统一） ---- */
  --color-correct: #538d4e;       /* 正确/命中 */
  --color-partial: #b59f3b;       /* 部分正确（黄） */
  --color-absent: #787c7e;        /* 未命中（灰格） */
  --color-error: #d33f3f;         /* 错误抖动/警告 */
  --color-streak: #e8871e;        /* 连胜火焰 */

  /* ---- 游戏 accent（每款页面注入其一为 --color-accent） ---- */
  --color-accent: var(--color-correct); /* 默认词类绿，按游戏覆盖 */

  /* ---- 排版 ---- */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Fraunces", ui-serif, Georgia, serif;   /* 仅标题/刊头 */
  --font-mono: ui-monospace, "SF Mono", monospace;       /* 倒计时/数字 */

  --text-xs: 0.8125rem;   /* 13px 辅助说明 */
  --text-sm: 0.9375rem;   /* 15px 次要文字 */
  --text-base: 1.0625rem; /* 17px 正文（大字号友好，≥17px） */
  --text-lg: 1.25rem;     /* 20px 小标题 */
  --text-xl: 1.5rem;      /* 24px 弹层标题 */
  --text-2xl: 2rem;       /* 32px 页面刊头 */
  --text-3xl: 2.75rem;    /* 44px 大数字（统计/倒计时） */

  /* ---- 间距（4px 基准） ---- */
  --spacing: 0.25rem;     /* Tailwind v4 spacing 基准 */

  /* ---- 圆角 ---- */
  --radius-xs: 4px;       /* 结果格子 */
  --radius-sm: 8px;       /* 按钮/输入 */
  --radius-md: 12px;      /* 卡片 */
  --radius-lg: 20px;      /* 弹层 */
  --radius-full: 9999px;  /* 徽章/键帽药丸 */

  /* ---- 阴影 ---- */
  --shadow-card: 0 1px 3px rgb(0 0 0 / 0.08);
  --shadow-modal: 0 12px 40px rgb(0 0 0 / 0.18);
  --shadow-key: 0 1px 0 rgb(0 0 0 / 0.12);   /* 键帽底边 */

  /* ---- 动效时长/缓动 ---- */
  --duration-tap: 100ms;      /* 按压反馈 */
  --duration-fast: 180ms;     /* hover/toast 进出 */
  --duration-flip: 350ms;     /* 单格翻转（逐格 stagger 250ms） */
  --duration-pop: 120ms;      /* 输入格弹入 scale 1→1.08→1 */
  --duration-shake: 500ms;    /* 无效输入整行抖动 */
  --duration-modal: 240ms;    /* 弹层淡入+上浮 */
  --duration-celebrate: 900ms;/* 胜利波浪总时长 */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ---- 深色模式：class 策略（html.dark），跟随系统 + 手动切换 ---- */
.dark {
  --color-bg: #121213;
  --color-bg-subtle: #1e1e1f;
  --color-tile: #121213;
  --color-tile-border: #3a3a3c;
  --color-text: #f8f8f8;
  --color-text-muted: #a0a3a8;
  --color-divider: #2c2c2e;
  --color-correct: #6aaa64;
  --color-partial: #c9b458;
  --color-absent: #3a3a3c;
  --color-error: #e06c6c;
  --shadow-card: 0 1px 3px rgb(0 0 0 / 0.5);
  --shadow-modal: 0 12px 40px rgb(0 0 0 / 0.6);
}
```

深浅色规则：
- 默认跟随 `prefers-color-scheme`；顶栏设置菜单提供手动三态（Auto/Light/Dark），存 `localStorage.theme`，首屏内联脚本防闪白。
- 结果格着色（correct/partial/absent）两种模式下**必须与分享 emoji（🟩🟨⬛/⬜）语义一致**。

## 3. 排版规范（大字号友好）

| 用途 | token | 字重 | 行高 |
|---|---|---|---|
| 页面刊头（游戏名+期号） | text-2xl / font-serif | 700 | 1.15 |
| 弹层标题 | text-xl | 700 | 1.2 |
| 正文/规则说明 | text-base（17px 起） | 400 | 1.55 |
| 按钮 | text-base | 600 | 1 |
| 统计大数字/倒计时 | text-3xl / font-mono | 700 | 1 |
| 辅助说明/版权 | text-xs | 400 | 1.4 |

- 正文最小 17px（移动端不需捏合缩放）；盘面内字母/数字随格子尺寸用 `clamp()` 缩放，最小 20px。
- 触控目标 ≥44×44px（键帽、格子、按钮一律遵守）。
- 语言：英文界面；数字用 tabular-nums（倒计时不跳动）。

## 4. 布局与断点

- 移动端优先：游戏盘面容器 `max-width: 520px`，水平居中；门户卡片墙 `max-width: 960px`。
- 断点：默认（<640px 单列）/ `sm` 640（门户两列）/ `lg` 1024（门户三列 + 游戏页两侧留白展示广告位 §10）。
- 页面结构统一：`顶栏(56px 固定) → 刊头(游戏名+期号+日期) → 盘面 → 输入区 → 页脚`。竖屏一屏内完整容纳盘面+输入区（键盘不遮挡）。

## 5. 组件规范

### 5.1 顶栏（AppBar，全矩阵共享）
```
┌────────────────────────────────────────────┐
│ [☰]  ▦ Daily Games / {GameName}   ? 📊 ⚙ │  56px
└────────────────────────────────────────────┘
```
- 左：☰ 打开矩阵抽屉（全部游戏清单 + 今日完成状态 ✅/⬜）；logo 点击回门户。
- 右：`?` 帮助弹层、`📊` 统计弹层、`⚙` 设置（主题/减少动效/硬核模式等）。
- 背景 `--color-bg` + 底部 1px `--color-divider`；固定定位；图标按钮 44×44。

### 5.2 帮助弹层（HelpModal）
- 首次访问自动弹出（`localStorage.seenHelp_{slug}`），之后仅 `?` 唤起。
- 结构：标题 "How To Play" → 一句话目标 → 3-4 条要点（每条配 mini 示例格，示例格用真实 Tile 组件跑一次翻转动画）→ 主按钮 "Play"。
- 尺寸：移动端底部抽屉（圆角 `--radius-lg` 顶部），桌面居中卡片 max-w 480px；进出 `--duration-modal`。

### 5.3 统计弹层（StatsModal，兼完成页）
- 四区自上而下：**Statistics**（Played / Win % / Current Streak / Max Streak 四列大数字）→ **成绩分布**（横向条形图，今日成绩行高亮 accent）→ **NEXT PUZZLE IN hh:mm:ss**（font-mono 倒计时）→ **Share 主按钮 + More games 卡片行（2-3 款，今日未玩优先）**。
- 完成/失败自动弹出（延迟：最后一格动画结束 + 800ms）；可关闭，关闭后盘面顶部常驻结果条。

### 5.4 分享按钮（ShareButton）
- 主按钮样式：`--color-accent` 底、白字、`--radius-full` 药丸、内含 "Share 🔗" 图标文案，高度 48px。
- 行为：优先 `navigator.share({text})`；降级 `clipboard.writeText` + 按钮态变 `✓ Copied!`（2s 后还原）+ toast。
- 生成文本规范见 §9；禁止生成图片。

### 5.5 键盘/触控输入组件（Keyboard / InputSurface）
- **屏幕键盘（词类）**：三行 QWERTY，键帽 `--radius-sm`、`--shadow-key`、最小 44px 高；键帽随反馈永久着色（correct>partial>absent 优先级）；支持物理键盘映射；按压 `scale(0.94)` `--duration-tap`。
- **数字盘面**：数字键 0-9 + 运算/操作键成两行药丸键；同键帽规范。
- **触控直接操作**（合成/地图/推理）：拖拽元素 `touch-action: none`，拖起时 `scale(1.06)` + `--shadow-card` 抬升；落点吸附动画 `--ease-bounce`；同时保留点选两步式操作（无障碍备选）。
- **AI 审讯输入**：单行文本输入 + 发送按钮；输入框 `--radius-full`，聚焦 accent 描边 2px。

### 5.6 结果格子动画（Tile）
- 尺寸：`clamp(48px, 14vw, 62px)` 方格，`--radius-xs`，2px 描边。
- 输入弹入：`--duration-pop` scale 1→1.08→1。
- 揭示翻转：rotateX 90° 翻转 `--duration-flip`，行内逐格 stagger 250ms；翻转过半切换底色（correct/partial/absent）。
- 无效输入：整行水平抖动 `--duration-shake`（±4px×4 次）+ toast 文案。
- 胜利：命中行逐格上跳波浪 `--duration-celebrate`（stagger 100ms）。
- 全部动画包 `@media (prefers-reduced-motion: reduce)` 降级为直接变色（§11）。

### 5.7 其他共享组件
- **Toast**：顶部居中小黑条（深色模式反色），`--duration-fast` 进出，2s 自动消失，同时 `aria-live=polite`。
- **结果条（ResultBar）**：完成后盘面上方常驻：`🟩🟩🟨 3/6 · [Share] · Next: 07:12:44`。
- **游戏卡片（GameCard，门户/导流用）**：accent 色块 icon + 游戏名 + 一句话玩法 + 状态徽章（`Play` / `✅ 3/6` / `🔥 12`），`--radius-md` + `--shadow-card`。
- **Streak 徽章**：`🔥 N` 药丸，`--color-streak`；断签当日门户卡片显示 "Keep your streak!"。

## 6. 页面线框（五类游戏）

### 6.1 词类网格（word）
```
┌──────────────────────────────┐
│ ☰   ▦ Gridly        ? 📊 ⚙ │
├──────────────────────────────┤
│      GRIDLY  #217 · Jul 31   │
│   ┌───┬───┬───┬───┬───┐      │
│   │ C │ R │ A │ N │ E │ ←已判定行(着色)
│   ├───┼───┼───┼───┼───┤      │
│   │ S │ L │ _ │ _ │ _ │ ←输入行
│   ├───┼───┼───┼───┼───┤      │
│   │   │   │   │   │   │ ×4   │
│   └───┴───┴───┴───┴───┘      │
│  Q W E R T Y U I O P         │
│   A S D F G H J K L          │
│  [ENTER] Z X C V B N M [⌫]  │
└──────────────────────────────┘
```
说明：盘面与键盘同屏；键帽着色同步格子判定；6 行猜测。

### 6.2 数字盘面（number）
```
┌──────────────────────────────┐
│ ☰   ▦ Sumline       ? 📊 ⚙ │
├──────────────────────────────┤
│    TARGET: 187   moves: 2/5  │
│   ┌────┬────┬────┬────┐      │
│   │ 25 │  7 │  3 │ 50 │ ←数字牌(点选/拖拽)
│   └────┴────┴────┴────┘      │
│   算式轨道: 25 × 7 = 175     │
│   ┌───────────────────┐      │
│   │  175   [+][−][×][÷]│     │
│   └───────────────────┘      │
│   [UNDO]        [SUBMIT]     │
│   进度: ●●○○○  距目标 12    │
└──────────────────────────────┘
```
说明：点选两数+运算符生成新数牌；每步可撤销；距目标差值做进度反馈（正确=accent，接近=partial）。

### 6.3 合成画布（craft）
```
┌──────────────────────────────┐
│ ☰   ▦ Fuse          ? 📊 ⚙ │
├──────────────────────────────┤
│ 今日目标: 🌋 Volcano  (3/∞步)│
│ ┌──────────────────────────┐ │
│ │        画布区             │ │
│ │   [💧Water]→←[🔥Fire]     │ │ ←拖两元素相碰=合成
│ │        ↓                  │ │
│ │     [♨️Steam] ✨new!      │ │
│ └──────────────────────────┘ │
│ 元素托盘(横向滚动):           │
│ [💧][🔥][🌍][💨][♨️]…       │
│ 已发现 12 · First Discovery 🏅│
└──────────────────────────────┘
```
说明：托盘拖元素入画布，两元素重叠触发合成（LLM 判定，复用 DeepSeek relay 缓存）；每日目标物给完成态；新发现弹徽章。

### 6.4 地图猜测（geo）
```
┌──────────────────────────────┐
│ ☰   ▦ Mapdash       ? 📊 ⚙ │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │      世界地图(可拖/缩放)  │ │
│ │   已猜国家按距离着色      │ │
│ │   🟥近 🟧 🟨 🟩远…       │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 🔍 Type a country…       │ │ ←自动补全下拉
│ └──────────────────────────┘ │
│ 猜测 4 · 最近: France 812km ↗│
└──────────────────────────────┘
```
说明：输入框自动补全防拼写挫败；每次猜测地图即时着色 + 距离/方向提示；无限次数计次。

### 6.5 AI 对话审讯（detective）
```
┌──────────────────────────────┐
│ ☰   ▦ Casewise      ? 📊 ⚙ │
├──────────────────────────────┤
│ 📁 Case #42: The Locked Room │
│ [案情卡▾] [嫌疑人: A][B][C]  │ ←tab 切换审讯对象
│ ┌──────────────────────────┐ │
│ │ 🕵️ You: 案发时你在哪?     │ │
│ │ 😐 B: 我一直在厨房…       │ │ ←流式输出
│ │      (证词与A矛盾 📌可钉住)│ │
│ └──────────────────────────┘ │
│ 剩余提问: ▮▮▮▮▮▮▯▯ 6/8      │
│ ┌────────────────────┐[发送] │
│ │ Ask a question…    │       │
│ │        [🎯 指认凶手]        │
└──────────────────────────────┘
```
说明：有限提问数（每日 8 次）构成挑战与 token 成本上限；矛盾证词可钉住到线索板；指认走确认弹层（不可逆操作二次确认）。

## 7. 门户页线框（交叉导流枢纽）
```
┌──────────────────────────────┐
│        ▦ Daily Games         │
│   Friday, July 31 · 🔥 12    │
│   Today: 3/6 played ✅✅✅⬜⬜⬜│
│ ┌──────────┐ ┌──────────┐    │
│ │🟩 Gridly │ │🟦 Sumline│    │
│ │ ✅ 3/6   │ │  Play →  │    │
│ └──────────┘ └──────────┘    │
│ ┌──────────┐ ┌──────────┐    │
│ │🟪 Fuse   │ │🟧 Mapdash│    │
│ …（全部完成→全勤徽章+合并分享）│
└──────────────────────────────┘
```

## 8. 完成页规范（StatsModal 完整态）
```
┌──────────────────────────────┐
│            ✕                 │
│        You got it! 🎉        │  ←失败: "Next time!" + 答案揭示
│  Played  Win%  Streak  Max   │
│   217     94    🔥12    31   │
│  Guess Distribution          │
│  1 ▏2                        │
│  2 ▇▇ 31                     │
│  3 ▇▇▇▇▇ 89  ← 今日(accent) │
│  ...                         │
│  NEXT PUZZLE IN  07:12:44    │
│  [       Share 🔗        ]   │
│  More games ────────────     │
│  [🟦 Sumline ▸] [🟧 Mapdash ▸]│
└──────────────────────────────┘
```

## 9. 分享卡（emoji 矩阵格式规范，全矩阵统一）

四行式：**标题行（游戏名+期号）→ 日期+成绩 → emoji 矩阵 → URL**

```
Gridly #217
Jul 31 · 3/6 🔥12

⬛🟨⬛⬛⬛
🟨🟩⬛🟨⬛
🟩🟩🟩🟩🟩

daily.zalize.com/gridly
```

各品类成绩行与矩阵格式：

| 游戏 | 成绩格式 | 矩阵行 |
|---|---|---|
| word | `3/6` | 每猜测一行 🟩🟨⬛（浅色分享用⬛，勿用⬜混淆） |
| number | `2 moves · 🎯exact` | 每步一格：🟩精确 🟨接近 🟥偏离，如 `🟨🟩🎯` |
| craft | `Volcano in 7 fuses` | 合成链长度条 `🟪🟪🟪🟪🟪🟪🟪✨`（新发现加✨） |
| geo | `4 guesses` | 距离渐进 `🟥🟧🟨🟩🎯` |
| logic | `5/8` | 每题一格 `🟩🟩⬛🟩🟩` |
| detective | `Solved · 5 questions` | 提问消耗 `🕵️❓❓❓❓❓✅`（失败`❌`） |
| 全勤合并卡 | `Daily Games · Jul 31 · 6/6 ✅` | 每款一行缩略（accent 方块+成绩） |

硬性规则：
1. 纯文本 + emoji，总长 ≤ 280 字符（X 兼容）；不含答案本体（无剧透）。
2. 期号与日期同时给（跨时区聊天可核对同题）。
3. URL 恒放末行、不带协议头（视觉干净，聊天软件自动链接化）、带归因参数由分享按钮追加（显示时截断）。
4. emoji 语义与站内格子颜色一一对应。

## 10. 广告位规范（不骚扰原则）

| 位置 | 尺寸 | 时机 | 禁则 |
|---|---|---|---|
| 游戏页盘面下方横幅 | 320×100（移动）/ 728×90（桌面） | 常驻，位于折叠线下 | 不得推挤盘面/键盘布局（预留固定高度防 CLS） |
| 桌面两侧边栏 | 300×600 | ≥1280px 视口 | 移动端不出现 |
| 完成弹层内原生位 | 卡片式原生广告 1 条 | 仅完成后，位于 More games 之下 | 不得先于 Share/导流出现 |
| 激励视频 | 全屏 | 仅玩家主动点击（如"额外提示"）触发 | 严禁自动播放/插屏打断游玩 |

- 全站禁止：进入前插屏、倒计时强制观看、盘面遮挡浮层、声音自动播放。
- 广告容器统一预留占位高度 + `Ad` 角标（合规）；未填充时折叠为 0 但不引起布局跳动（min-height 由容器保留）。

## 11. 无障碍（验收硬指标）

- **对比度**：正文/格子文字 ≥4.5:1，大字号（≥24px bold）≥3:1；correct/partial/absent 三色在两种模式下经工具核验；色盲支持——设置内"高对比模式"（🟧橙/🟦蓝替代绿/黄，同 Wordle Colorblind Mode），分享 emoji 同步切换。
- **键盘导航**：全部交互可 Tab 到达，焦点环 2px accent；弹层 focus-trap + Esc 关闭；屏幕键盘可用物理键盘替代；拖拽操作必须有点选两步式等价路径。
- **屏幕阅读器**：格子判定结果 `aria-live=polite` 播报（"C, correct position"）；倒计时不连播（`aria-live=off`，仅按钮聚焦时读一次）；图标按钮全部 `aria-label`。
- **reduced-motion**：`prefers-reduced-motion: reduce` 下翻转/波浪/抖动全部降级为 ≤120ms 淡入变色；胜利彩带禁用。
- **触控**：目标 ≥44px；页面禁双击缩放但保留捏合（地图类除外，地图自由缩放）。

## 12. 实现注意（交给 tech-lead / 前端）

- 所有 token 以本文件 §2 `@theme` 为唯一事实源；组件优先复用 zalize-games 底座与 shadcn/ui 能力范围，不造轮子。
- 共享组件（AppBar / HelpModal / StatsModal / ShareButton / Toast / GameCard / Tile）做成矩阵公共包，六款游戏只注入 accent 与内容。
- 每日种子、统计、streak 全部 localStorage（键名前缀 `dg_{slug}_`），无账号体系。
- 验收对照：本文件 §10/§11 与 UX-FLOWS.md §二 的硬指标进入 qa-engineer 用例。
