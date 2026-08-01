# Daily Games 视觉重塑方案 v2（DESIGN-V2.md）

- 作者：ui-designer（专项：全站视觉重塑，最高优先）
- 日期：2026-08-01
- 触发：老板验收批评「页面不美观、设计不好看、太简陋」
- 走查方式：Playwright 实机截图 daily.zalize.com 门户 + 8 款游戏 × 桌面(1280)/移动(390) 共 18 张
- 对标基准：NYT Games（排版仪式感）、LinkedIn 游戏（品牌插画与完成时刻）、neal.fun（个性与趣味）
- 本文取代 DESIGN.md 中的视觉部分；交互流程仍以 UX-FLOWS.md 为准

---

## 0. 一句话诊断

当前全站 = **单一近黑深色底 + 灰色卡片 + 字母方块假 icon + 无插画无动效无光影**，信息层级只靠字号，8 款游戏视觉上是同一张模板换标题——像工程师原型，不像产品。差距不在布局（布局是对的），在**质感四件套：色彩氛围、品牌插画、字体个性、微动效**。

## 1. 逐页差距清单（截图走查结论）

### 1.1 全站共性问题（P0，修一处全站受益）

| # | 问题（现状） | 对标差距 | v2 修复（见章节） |
|---|---|---|---|
| C1 | 背景是无层次纯黑 `#121213`≈`#0d0d0d`，卡片 `#1e1e1f`，只差一档灰 | NYT/LinkedIn 用暖白纸感底+彩色氛围；深色也有色温（蓝黑非纯黑） | §2 色板：浅色默认 + 有色温深色 |
| C2 | 默认进深色。英文休闲游戏受众预期是明亮纸感（NYT 默认浅色） | NYT Games 门户是米白底彩色卡片 | §2：浅色为默认，深色可切 |
| C3 | 游戏 icon 是「字母+圆角方块」占位物（W/N/A/G…） | LinkedIn 每款有独立插画 icon；NYT 每款有标志性图形 | §4：每款 SVG 品牌图形（给出绘制规范） |
| C4 | 刊头 serif 是系统 Georgia 渲染，灰色 `#9x` 弱化，日期期号比标题还抢 | NYT 用 Karnak 强黑刊头，仪式感强 | §3 字体：Fraunces 900 + 主题色期号徽章 |
| C5 | 空「Advertisement」灰框常驻首屏，占视觉焦点 | 对标产品广告不进首屏、未填充即隐藏 | §8 广告位：未填充折叠 + 移出首屏 |
| C6 | 按钮/卡片无 hover/active 层次，无阴影层级，全站零动效 | LinkedIn 卡片 hover 抬升、按压回弹 | §6 动效 token + §5 组件态 |
| C7 | 完成时刻无仪式感（无 confetti/数字滚动/streak 火焰） | Wordle 翻格波浪、LinkedIn 撒花+成绩数字滚动 | §7 完成时刻方案 |
| C8 | 顶栏图标(?/📊/⚙)是裸 emoji/字符，大小不一 | 统一线性 icon 系统 | §5.1：Lucide 图标统一 20px |

### 1.2 逐页问题

| 页面 | 具体差距 |
|---|---|
| 门户 | 卡片纯灰底无识别度；字母 icon（C3）；「Today: 0/8」的 8 个灰格无游戏对应关系提示；迁移横幅（sync code）永久占刊头下黄金位；Classic/Today 分区标题弱；页面无任何色彩氛围 |
| WordBridge | 词格是描边空框，选中态无色块反差；How-to 弹层纯文字墙（对标 NYT 有示例格动画）；Play 按钮绿但页面无一处呼应绿 |
| Numlock | 等宽字体数字格视觉像终端；目标和格子无色彩关系；Undo/Practice 灰药丸无主次；计时器孤立左上 |
| InfiniteAlchemy | 「Pick one/Pick another」虚线框简陋；元素 chip 是灰药丸+emoji，无合成画布感；目标条与盘面割裂 |
| GridSpark | 彩色分区是低饱和马卡龙色直接怼在黑底上，刺眼且廉价；格子无描边节奏；Clear/Textures/Practice 三按钮无主次 |
| BorderRush | 地图深灰配亮橙可以，但地图容器无圆角内光影；输入框+Guess 按钮橙色是全页唯一色彩，头部国旗条弱 |
| DropStack | 盘面近乎全空黑框，虚线红线含义不明；水果 emoji 直接用系统 emoji 无风格化；底部说明文字代替了 onboarding |
| Interrogate | 案情卡文字墙；嫌疑人无头像（对标 LinkedIn 游戏插画人物）；预设问题按钮样式=普通灰条；「Accuse the killer」红按钮与 Start 弹层红按钮同级混淆 |
| EpochLens | 照片直接贴容器无相纸/边框质感（年代感是这款的灵魂）；黄色滑杆是全页唯一色彩；地图占位灰块 |
| 移动端共性 | 卡片间距过大导致首屏只见 2.5 张卡；顶栏 56px 内 icon 偏小；无 safe-area 处理痕迹 |

---

## 2. v2 设计 token（Tailwind v4 @theme，工程直接替换 app.css）

设计策略：**浅色纸感为默认**（NYT 心智），深色改为「蓝黑夜间」而非纯黑；每款游戏一个品牌色对（`accent` + `accent-soft` 氛围色），页面用 accent-soft 做刊头氛围与卡片渐变，摆脱「全站一张灰」。

```css
@import "tailwindcss";

@theme {
  /* ===== 中性色（浅色默认：暖纸感） ===== */
  --color-bg: #faf8f2;              /* 米白纸感底（NYT 感） */
  --color-bg-subtle: #ffffff;       /* 卡片底 */
  --color-bg-inset: #f1ede3;        /* 盘面凹陷区/输入区底 */
  --color-tile: #ffffff;
  --color-tile-border: #d8d3c4;
  --color-text: #1c1b17;
  --color-text-muted: #6f6b60;
  --color-divider: #e7e2d5;

  /* ===== 语义色 ===== */
  --color-correct: #4f8a48;
  --color-partial: #c9a227;
  --color-absent: #9b968a;
  --color-error: #c94736;
  --color-streak: #e8871e;

  /* ===== 每款游戏品牌色对（页面注入覆盖 --color-accent / --color-accent-soft） ===== */
  --color-accent: #4f8a48;
  --color-accent-soft: #e7f0e4;     /* 刊头氛围/选中底/徽章底 */
  --color-accent-ink: #2e5729;      /* accent 上的深文字/描边 */

  /* ===== 字体（§3） ===== */
  --font-display: "Fraunces Variable", Georgia, serif; /* 刊头/大数字，wght 600-900 + opsz */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace; /* 仅倒计时/计分 */

  --text-xs: 0.8125rem; --text-sm: 0.9375rem; --text-base: 1.0625rem;
  --text-lg: 1.25rem; --text-xl: 1.5rem; --text-2xl: 2.25rem; --text-3xl: 3rem;

  /* ===== 圆角/阴影：建立 3 级光影层级（当前全站为 0） ===== */
  --radius-xs: 6px; --radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px; --radius-full: 9999px;
  --shadow-1: 0 1px 2px rgb(28 27 23 / .06), 0 1px 3px rgb(28 27 23 / .08);   /* 静止卡片 */
  --shadow-2: 0 4px 12px rgb(28 27 23 / .10), 0 2px 4px rgb(28 27 23 / .06);  /* hover 抬升 */
  --shadow-3: 0 16px 48px rgb(28 27 23 / .18);                                 /* 弹层 */
  --shadow-inset: inset 0 2px 4px rgb(28 27 23 / .06);                         /* 盘面凹陷 */

  /* ===== 动效 ===== */
  --duration-tap: 90ms; --duration-fast: 160ms; --duration-med: 240ms;
  --duration-flip: 350ms; --duration-shake: 500ms; --duration-celebrate: 1200ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* 回弹：按钮/卡片/徽章 */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}

/* ===== 深色：蓝黑夜间（非纯黑），保留色温与层次 ===== */
.dark {
  --color-bg: #14161d;             /* 蓝黑 */
  --color-bg-subtle: #1c1f28;
  --color-bg-inset: #10121a;
  --color-tile: #1c1f28;
  --color-tile-border: #343847;
  --color-text: #f2f1ec;
  --color-text-muted: #9a9daa;
  --color-divider: #2a2d39;
  --color-absent: #3f4353;
  --shadow-1: 0 1px 3px rgb(0 0 0 / .4);
  --shadow-2: 0 4px 16px rgb(0 0 0 / .5);
  --shadow-3: 0 16px 48px rgb(0 0 0 / .65);
}
```

### 2.1 八款游戏品牌色对（浅色模式值；深色模式 accent 提亮 8-12%，soft 换为 12% 透明度叠加）

| 游戏 | accent | accent-soft | accent-ink | 色彩人格 |
|---|---|---|---|---|
| WordBridge | `#4f8a48` 桥绿 | `#e7f0e4` | `#2e5729` | 沉稳词类经典绿 |
| Numlock | `#2f6fd0` 锁蓝 | `#e3ecfa` | `#1d4587` | 精密/机械 |
| InfiniteAlchemy | `#9b59b6` 炼金紫 | `#f1e6f6` | `#63357a` | 神秘/魔法 |
| GridSpark | `#0f9d8f` 星火青 | `#dff3f0` | `#0a6158` | 冷静逻辑 |
| BorderRush | `#e07a3f` 陆橙 | `#faeadd` | `#8f4a1e` | 地图/冒险 |
| DropStack | `#d94f70` 果莓红 | `#fbe5eb` | `#8c2f47` | 活泼/果味 |
| Interrogate | `#b3403a` 案卷红 | `#f7e3e2` | `#6f2622` | 悬疑/罪案 |
| EpochLens | `#a8842c` 相纸金 | `#f5eedb` | `#6b5316` | 复古/胶片 |

用法规则（类名级）：
- 刊头区背景：`bg-[radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_70%)]`——每款游戏进门第一眼就有品牌氛围（修 C1/逐页「无色彩」）。
- 主按钮：`bg-(--color-accent) text-white shadow-1 hover:shadow-2 active:scale-[0.97]`；次按钮：`bg-(--color-accent-soft) text-(--color-accent-ink)`；三级按钮：`bg-transparent border border-(--color-divider)`（修 Numlock/GridSpark 按钮无主次）。
- 选中态/进度/streak 一律 accent；GridSpark 分区色重做为 `--color-accent-soft` 同明度的 8 色带描边体系（§6.4）。

## 3. 字体系统（修 C4）

| 用途 | 字体/类 | 规格 |
|---|---|---|
| 游戏刊头 | `font-display font-black`（Fraunces wght 900, opsz 72） | text-2xl/3xl，字色 `--color-text`，**不再灰化** |
| 期号+日期 | 徽章化：`font-sans text-sm font-semibold bg-(--color-accent-soft) text-(--color-accent-ink) rounded-full px-3 py-1` | `#31 · Aug 1` 从灰字变成品牌徽章 |
| 正文/按钮 | Inter Variable 400/600 | 17px 起 |
| 大数字（统计/倒计时/计分） | `font-display font-bold tabular-nums`；倒计时用 mono | 数字滚动动画见 §7 |

引入方式：`@fontsource-variable/fraunces` + `@fontsource-variable/inter`（npm，自托管，无 Google Fonts 依赖）；`font-display: swap`；预载 2 个 woff2 ≤120KB。

## 4. 门户卡片视觉与每款品牌图形（修 C3、门户全部问题）

### 4.1 每款游戏 SVG 品牌图形（绘制规范，交给前端/可用 AI 生成后人工调）
统一规格：`viewBox="0 0 48 48"`，2.5px 圆头描边 + accent 填充 + 白色高光点，几何扁平风（LinkedIn 游戏 icon 风格），单文件 `<svg>` 内联（可继承 currentColor），每款一个隐喻：

| 游戏 | 图形隐喻 | 绘制要点 |
|---|---|---|
| WordBridge | 两组方格间一座拱桥 | 4 格×2 + 半圆拱，拱身 accent 渐变 |
| Numlock | 挂锁锁体是数字 7 段码 | 锁梁圆弧 + 锁体内 8 字七段码镂空 |
| InfiniteAlchemy | 圆底烧瓶内∞符号气泡 | 瓶内液面 accent-soft，∞ 用双圆环 |
| GridSpark | 3×3 网格一格迸出四角星 | 星体 accent，网格 divider 色 |
| BorderRush | 两块相接拼图状国土+虚线航线 | 航线 2-3 段圆点虚线+小飞机头 |
| DropStack | 三颗叠果（小→大） | 圆形渐变体积感+高光点+叶柄 |
| Interrogate | 侦探帽+放大镜压在对话气泡上 | 气泡内「?」，放大镜柄 45° |
| EpochLens | 胶片框内一枚怀表 | 胶片齿孔上下各 3，表针指 X |

### 4.2 门户 GameCard v2（类名级规范）
```html
<a class="group relative overflow-hidden rounded-(--radius-md) bg-(--color-bg-subtle)
          shadow-1 hover:shadow-2 hover:-translate-y-0.5 active:scale-[0.99]
          transition-all duration-(--duration-fast) ease-(--ease-out)
          [--color-accent:#2f6fd0] [--color-accent-soft:#e3ecfa]">
  <!-- 顶部品牌氛围条：accent-soft → 透明 渐变 + 右上角淡出大号品牌图形 -->
  <div class="h-20 bg-linear-to-br from-(--color-accent-soft) to-transparent relative">
    <svg class="brand-icon absolute right-3 top-3 size-14 opacity-90
                group-hover:scale-110 group-hover:rotate-3 transition-transform
                duration-(--duration-med) ease-(--ease-spring)">…</svg>
  </div>
  <div class="p-4 pt-2">
    <h3 class="font-display text-lg font-bold">Numlock</h3>
    <p class="text-sm text-(--color-text-muted) line-clamp-2">Cross out numbers to hit every target sum</p>
    <div class="mt-3 flex items-center justify-between">
      <span class="badge-state">…</span>   <!-- 状态三态见下 -->
      <span class="text-(--color-accent) font-semibold text-sm">Play →</span>
    </div>
  </div>
</a>
```
- 状态三态徽章 `badge-state`：未玩 `bg-(--color-accent) text-white "Play"`；已完成 `bg-(--color-accent-soft) text-(--color-accent-ink) "✓ 3/6"`；进行中 `border border-(--color-accent) text-(--color-accent) "Resume"`。
- 「Today: n/8」改为 8 个**迷你品牌图形**（完成=accent 实色，未玩=divider 描边），点击直达对应游戏。
- 迁移横幅（sync code）降级为门户底部一次性 toast（`localStorage` 关闭后不再出现），让出刊头黄金位。
- 门户刊头加当日大字：`font-display text-3xl` "Saturday" + 下方彩色迷你格日历徽章，建立「今天的仪式感」。

## 5. 组件态规范（修 C6/C8）

### 5.1 顶栏
- 图标统一 lucide（`circle-help` / `chart-column` / `settings`），`size-5`，按钮 `size-11 rounded-full hover:bg-(--color-bg-inset) active:scale-90 transition`。
- 左侧矩阵入口用 §4.1 迷你 logo（四色方格标 SVG），替代当前 ▦ 字符。
- 顶栏底部改为 `border-b border-(--color-divider)` + 滚动后加 `shadow-1`（滚动感知）。

### 5.2 按钮全站三级（所有页面统一替换）
```css
.btn-primary  { @apply bg-(--color-accent) text-white font-semibold rounded-full h-12 px-6
                 shadow-1 hover:shadow-2 hover:brightness-105 active:scale-[0.97]
                 transition-all duration-(--duration-tap); }
.btn-secondary{ @apply bg-(--color-accent-soft) text-(--color-accent-ink) …同尺寸; }
.btn-ghost    { @apply border border-(--color-divider) text-(--color-text-muted)
                 hover:border-(--color-accent) hover:text-(--color-accent) …; }
```
- 例：Numlock 页 `Practice`→btn-secondary、`Undo`→btn-ghost；GridSpark `Clear/Textures`→ghost、无 primary（盘面即主操作）。

### 5.3 盘面容器（全部游戏统一「凹陷画布」质感）
`rounded-(--radius-md) bg-(--color-bg-inset) shadow-inset p-3`——盘面与页面产生前后层次（修 DropStack 空黑框/BorderRush 地图容器/EpochLens 照片贴边）。

### 5.4 How-to 弹层 v2
- 弹层 `rounded-(--radius-lg) shadow-3`，标题 font-display，**每条要点左侧配 24px 品牌图形节选或迷你演示格**；WordBridge 弹层内嵌 4 格自动播放选中→翻色 demo（CSS animation 循环，无 JS）。
- 移动端改底部抽屉（`translate-y` 进场 `--ease-out`）。

## 6. 逐款游戏界面 v2 mockup 说明（工程可直接照做）

每款共同改造：刊头氛围渐变（§2 用法）+ 期号徽章（§3）+ 凹陷盘面（§5.3）+ 按钮三级（§5.2）。以下只写各自增量：

### 6.1 WordBridge
- 词格：`rounded-(--radius-xs) bg-(--color-tile) border border-(--color-tile-border) shadow-1 font-semibold uppercase tracking-wide`；选中态 `bg-(--color-text) text-(--color-bg) -translate-y-0.5`（NYT Connections 同款「跳起」）；提交判定成组时整行合并为难度色横条（黄/绿/蓝/紫，沿用现有难度色但提高饱和：`#f5c518 #6aaa64 #4a90d9 #a969c6`）+ 组名以 `font-display` 展示。
- 错误：整行 shake + mistakes 点阵（4 个圆点逐个熄灭，代替文字计数）。
- 隐藏桥揭示：四条色带向中心聚拢成拱桥形动画（`--duration-celebrate`，CSS clip-path），这是本款的招牌时刻。

### 6.2 Numlock
- 数字格改 `font-display font-bold`（去终端感），命中划除时格子 `line-through` + 落一层 `bg-(--color-accent-soft)` + 对应行/列目标数字滚动递减（§7 数字滚动复用）。
- 目标列/行数字底 `bg-(--color-accent-soft) text-(--color-accent-ink) rounded-(--radius-xs)`，达成时翻转为 accent 实色+白勾。
- 计时器并入刊头徽章右侧同排，弱化为 `text-(--color-text-muted)`。

### 6.3 InfiniteAlchemy
- 合成台重做：两个圆形凹槽（`size-20 rounded-full bg-(--color-bg-inset) shadow-inset border-2 border-dashed border-(--color-tile-border)`），拖入后凹槽实体化为元素圆盘并轻微悬浮（`animate-bounce` 幅度 2px）；合成瞬间两盘相向合并 + 白闪 + 新元素 `--ease-spring` 弹出。
- 元素 chip：`rounded-full bg-(--color-bg-subtle) shadow-1 border border-(--color-divider) hover:border-(--color-accent) hover:-translate-y-0.5`；新发现的 chip 带 `ring-2 ring-(--color-accent)` + ✨ 角标 3 秒。
- 目标条固定盘面顶：目标 emoji 大号 + 步数进度点。

### 6.4 GridSpark
- 分区配色整体重制为**同明度低饱和 8 色系**（浅色模式）：`#f2c4c4 #f2e2b3 #c9e5bd #bcd7f2 #d8c9ee #f2d4b8 #c4e5e0 #d9d9d9`，深色模式同色相 24% 透明度叠加在 inset 底上（修「马卡龙怼黑底」刺眼问题）。
- 分区边界 2px `--color-text` 10% 透明度粗描边（区块感），格线 1px divider。
- 放置 👑：落格 `--ease-spring` scale 0→1.15→1；冲突格红色斜纹背景（`repeating-linear-gradient(45deg…)`）代替纯红，更精致。

### 6.5 BorderRush
- 地图容器：`rounded-(--radius-md) overflow-hidden shadow-inset` + 顶部内侧 24px 高的渐变暗角（vignette），地图瞬间有「屏幕感」。
- 起终点国旗条升级为两张小卡（国旗+国名+脉冲圆点），中间连接线为动态虚线（`stroke-dashoffset` 动画）表达「找路中」。
- 猜中路径国家依次点亮 accent（150ms stagger），错误猜测国土闪红后回灰。

### 6.6 DropStack
- 水果改为**风格化圆形贴纸**（SVG 圆形渐变+高光+描边，8 档大小8 色，替代系统 emoji，一次绘制全平台一致）。
- 盘面底部画「果篮」木纹色带（8px），虚线警戒线改为顶部红色渐隐条 + 超线时脉冲。
- 合并时刻：两果相触 → 白色圆形冲击波扩散（300ms）→ 新果 `--ease-spring` 弹出 + 分数 `+N` 上浮淡出。
- 「Drag to aim」说明移入 How-to 弹层，盘面内改为首次游玩时的半透明手势提示动画（3 秒后消失）。

### 6.7 Interrogate
- 嫌疑人可视化：每案 3-4 个**几何头像**（程序生成：肤色/发型/配饰 3 层 SVG 组合，案件种子决定），tab 选中态 accent 底白字+头像放大 1.1。
- 案情卡改「档案夹」质感：顶部标签耳朵 + 纸纹底（`bg-[repeating-linear-gradient(0deg,transparent_0_23px,var(--color-divider)_24px)]` 横线纸），Case 标题 font-display。
- 对话流：侦探消息右对齐 accent-soft 气泡，嫌疑人左对齐白卡气泡+头像；流式输出时三点打字指示。
- 预设问题改为「证物签」样式 chip（左侧 📎 图标，hover 抬升）；`Accuse the killer` 保持全宽 btn-primary（案卷红），Start 弹层按钮文案改 "Open the case file" 避免同级混淆。

### 6.8 EpochLens
- 照片装裱：白色相纸边框（`p-3 bg-white shadow-2 rotate-[-0.6deg]`）+ 底部手写体年份猜测区，像桌上一张老照片；换题时下一张从右上滑入叠上（拍立得堆叠感）。
- 年份滑杆重做：轨道改「时间轴刻度尺」（每 10 年一刻度线），把手为圆形放大镜图形，拖动时上方浮出大号 font-display 年份气泡。
- 地图占位灰块加海岸线描边 + 猜测落点插图钉动画（落下+微弹）。

## 7. 完成/分享时刻动效方案（修 C7，全矩阵共享一个 `celebration.ts`）

时序（总长 ~2.4s，reduced-motion 时全部降级为 300ms 淡入）：
1. **盘面收官动画**（0-900ms）：各款招牌动画（WordBridge 拱桥聚拢 / Numlock 全目标翻绿波浪 / Alchemy 目标元素爆星 / GridSpark 皇冠齐跳 / BorderRush 路径全线点亮 / DropStack 全盘果实齐震 / Interrogate 凶手卡片盖「SOLVED」红章 / EpochLens 五张照片扇形展开）。
2. **confetti**（600ms 起，1.2s）：canvas-confetti 库，粒子色 = 当款 accent + accent-soft + 白，120 粒、两侧 60° 喷射；失败不喷，改为柔和的答案揭示卡上滑。
3. **完成弹层进场**（900ms）：`shadow-3` 卡片 `--ease-spring` 上浮，标题 font-display（"Brilliant!" / "Solved it!" 按成绩分档文案）。
4. **数字滚动**（进场后 400ms）：统计四格数字从 0 滚到实值（`requestAnimationFrame` easeOut，600ms），今日成绩条在分布图中 accent 高亮生长。
5. **streak 火焰**：`🔥 N` 徽章——N 变化时旧数字上翻出、新数字下翻入（翻牌效果）；streak≥7 火焰加 `animate-pulse` 微光晕（`drop-shadow(0 0 6px var(--color-streak))`）。
6. **倒计时**：mono tabular-nums，秒位翻页式滚动（每秒 `translate-y` 8px 切换）。
7. **Share 按钮**：呼吸微光（`shadow` 2s 循环，3 次后停），点击后按钮内文案「Copied ✓」+ 顶部 confetti 小喷 20 粒（分享也值得庆祝）。

## 8. 广告位 v2（修 C5）
- 未填充广告容器 `display:none`（由填充回调控制），**不再渲染空「Advertisement」灰框**；填充后容器 `min-height` 预留一次性展开（仍防 CLS：进入视口前就确定高度）。
- 位置下移：桌面移至完成弹层下方原生位 + 页尾横幅；移动端仅页尾。首屏（盘面+操作区）内不出现任何广告容器。

## 9. 无障碍与深浅色验收（沿用 DESIGN.md §11，新增两条）
- 全部 accent/accent-soft/accent-ink 组合已按 4.5:1 校验（accent-ink on soft ≥ 7:1）。
- 新增动效均包 `@media (prefers-reduced-motion: reduce)`；confetti/数字滚动/翻牌全部直接呈现终态。

## 10. HTML/CSS 原型
`projects/daily-games/design-v2-prototype.html`（本 PR 同目录）：单文件零依赖，包含 v2 token 全量 CSS 变量、门户卡片（8 款品牌色对+图形占位）、按钮三级、词格/完成弹层（含 confetti+数字滚动+streak 翻牌演示）、深浅色切换。打开即看，类名与本文一致，工程可直接拷贝样式。

## 11. 实施顺序（给前端排期建议）
1. P0（1 天）：token 全量替换（§2/§3）+ 按钮三级 + 广告空框隐藏 + 顶栏图标——全站观感立刻换代。
2. P0（1-2 天）：门户卡片 v2 + 8 款品牌图形 + 期号徽章 + 刊头氛围。
3. P1（2-3 天）：完成时刻动效包（§7，一次实现全矩阵挂接）。
4. P1（3-4 天）：逐款增量改造（§6，可 8 个实例并行，每款 0.5 天）。
5. P2：How-to 弹层演示格、Interrogate 头像系统、DropStack 贴纸水果。
