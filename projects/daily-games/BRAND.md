# Daily Games 品牌手册（BRAND.md）

- 作者：ui-designer（专项：官网品牌化 + 国际化）
- 日期：2026-08-01
- 定位：本手册是 **DESIGN-V2.md 的品牌层扩展**——所有色彩/字体/圆角/阴影/动效 token 与 DESIGN-V2 §2/§3 完全一致，不另起炉灶；本文新增的是 logo 系统、物料模板、官网信息架构与 i18n 版式规则。
- 源文件全部入库：`projects/daily-games/brand-assets/`（SVG 可直接导出 PNG）。

---

## 1. 品牌核心

| 项 | 定义 |
|---|---|
| 名称 | **Daily Games**（域名 daily.zalize.com；对外统一写法：两词首字母大写，不写 DailyGames） |
| 一句话 | One new puzzle, every day. |
| 品牌人格 | 纸感报刊的仪式感（NYT Games）× 彩色插画的亲和力（LinkedIn Games）× 一点玩心（neal.fun） |
| 品牌隐喻 | **「今日方格」**：2×2 四色圆角方块 = 游戏矩阵/日历格；左上格的四角星 = 今天刚揭晓的新谜题 |

## 2. Logo 系统（`brand-assets/logo/`）

| 文件 | 用途 | 最小尺寸 |
|---|---|---|
| `logo-mark.svg` | 纯图形标（顶栏、favicon 之外的小场景、水印） | 20px |
| `logo-horizontal.svg` | 横版组合标（官网顶栏、页脚、文档页眉） | 高 28px |
| `logo-square.svg` | 方版组合标（社媒头像、卡片、二维码中心） | 64px |
| `favicon.svg` | 浏览器标签页（16–32px 专调：更大间隙、去高光点） | 16px |
| `logo-mono.svg` | 单色版（`currentColor` 继承，印刷/单色水印/深底），星形为镂空 | 高 24px |

规则：
- 四色固定取自四个游戏色系代表：绿 `#4f8a48` / 蓝 `#2f6fd0` / 橙 `#e07a3f` / 紫 `#9b59b6`（即 WordBridge/Numlock/BorderRush/Alchemy 的 accent），不得换色、不得旋转。
- 安全区 = 标志高度的 25%；禁止拉伸、加描边、加投影、放在低对比底上（浅色底用彩色版，深底/彩底用单色白）。
- 字标字体为 Fraunces 900（与刊头字体一致，DESIGN-V2 §3）；对外交付位图时先将文字转曲。
- 顶栏迷你 logo 直接复用 `logo-mark.svg`（DESIGN-V2 §5.1 的「四色方格标」即此标）。

## 3. 色彩系统（= DESIGN-V2 §2，此处只列品牌用法）

- 中性色：暖纸白 `#faf8f2` 底 + 墨黑 `#1c1b17` 文字（浅色默认）；深色为蓝黑 `#14161d` 夜间模式。
- 品牌四色（见 §2 logo 规则）仅用于 logo 与全矩阵物料；**单款游戏物料一律用该款的 accent 色对**（8 组色对表见 DESIGN-V2 §2.1）。
- 对比度硬指标：正文 ≥ 4.5:1，accent-ink on accent-soft ≥ 7:1（已随 DESIGN-V2 校验）。

## 4. 字体系统（= DESIGN-V2 §3）

| 用途 | 字体 | 备注 |
|---|---|---|
| 刊头/大数字/logo 字标 | Fraunces Variable 600–900 | `@fontsource-variable/fraunces` 自托管 |
| 正文/UI | Inter Variable 400/600 | 17px 起 |
| 倒计时/计分 | JetBrains Mono | tabular-nums |
| 中日韩等无 Fraunces 字形的语言 | 刊头回退 `Georgia, "Noto Serif SC", serif`；正文回退系统 UI 字体 | i18n 扩展时按 locale 追加 `@fontsource` 包 |

## 5. 组件库规范（Svelte + Tailwind v4 + bits-ui）

工程侧组件与 token 的对应（类名级规范见 DESIGN-V2 §4.2/§5，此处定组件库约定）：

- **token 入口**：`app.css` 的 `@theme` 全量使用 DESIGN-V2 §2 变量；原型的 `brand-assets/prototypes/tokens.css` 与其逐值一致，可直接比对。
- **组件基座**：交互原语（Dialog/Popover/Tabs/Select/Accordion）一律用 **bits-ui** headless 组件 + token 类名封装，禁止手写焦点管理；每个封装组件放 `src/lib/components/ui/`。
- **必备组件清单**：`Button`（primary/secondary/ghost 三级）、`Badge`（含期号徽章/状态三态）、`GameCard`（DESIGN-V2 §4.2）、`TopBar`、`SectionHeader`、`StatCard`、`HowToAccordion`、`StreakBanner`、`LanguageSelect`。原型三页即为这些组件的视觉验收基准。
- **图标**：UI 图标一律 lucide（20px、stroke 2）；游戏品牌图形用 `brand-assets/game-icons/*.svg`（48 viewBox，内联可染色）。
- **无障碍**：所有可点击目标 ≥ 44×44px；`:focus-visible` 3px accent 外环；动效全部包 `prefers-reduced-motion`。

## 6. 游戏品牌图形（`brand-assets/game-icons/`）

8 款图形按 DESIGN-V2 §4.1 规范绘制入库（48 viewBox、2.5px 圆头描边、accent 填充 + 白高光点、几何扁平）：

`wordbridge.svg`（词格拱桥）· `numlock.svg`（七段码挂锁）· `alchemy.svg`（∞ 烧瓶）· `gridspark.svg`（网格四角星）· `borderrush.svg`（拼图国土+航线）· `dropstack.svg`（三叠果）· `interrogate.svg`（侦探帽+放大镜+气泡）· `epochlens.svg`（胶片怀表）

用法：门户卡片氛围区右上角 52px；游戏详情页 hero 88px；今日进度条 26px 迷你格；OG 图右侧 240px 大图。图形内联 SVG 使用，描边色可继承该款 accent。

## 7. 物料模板（`brand-assets/templates/`）

| 文件 | 规格 | 用法 |
|---|---|---|
| `og-template.svg` | 1200×630 | 门户/每款游戏分享图：改 `--accent/--accent-soft` + 标题/标语/期号 + 右侧图标槽；`rsvg-convert -w 1200` 导出 PNG |
| `app-icon-512.svg` | 512×512（圆角 r115 已烘焙） | 平台提交图标；中心 416px 安全区 |
| `app-icon-1024.svg` | 1024×1024（满血无圆角） | App Store/Play 源图，平台自行遮罩圆角 |
| `screenshot-template.svg` | 1290×2320 竖版 | 商店/营销截图：换 accent 色对 + 标语 + 手机屏内贴实机截图；标语 ≤2 行并预留 20% 长度余量 |
| `social-header.svg` | 1500×500 | X/Twitter 等社媒头图；文案保持在 y 70–430 裁切安全区内 |

规则：单款游戏物料用该款 accent 色对做主色；全矩阵物料用暖纸白底 + 8 色条/四色标。导出位图前文字转曲或安装 Fraunces/Inter。

## 8. 官网重设计（信息架构 + 原型 `brand-assets/prototypes/`）

三页原型均为响应式单页（同一文件覆盖桌面 1280 与移动 375px 两档验收视口），链接共享 `tokens.css`，类名与 DESIGN-V2 一致，工程可直接对照实现：

### 8.1 `home.html` — 门户首页（IA 重排）
自上而下：**顶栏**（logo + lucide 图标）→ **今日刊头仪式区**（Fraunces 大字星期 + 日期期号徽章 + 8 枚可点迷你品牌图形的今日进度条）→ **新手引导条**（首访显示，完成任一局后折叠）→ **Today's games 矩阵**（GameCard v2：氛围渐变 + 品牌图形 + 状态三态徽章）→ **Streak 激励模块**（🔥 大数字 + 本周点亮格 + 「今天玩一局保火」文案）→ **Classic games** → 页脚（About/How-to/隐私 + 语言选择器）。
- 移动 375px：卡片 2 列紧凑模式（隐藏描述行、缩小氛围区），首屏可见 ≥4 张卡（修 DESIGN-V2 §1.2 移动端问题）。

### 8.2 `game.html` — 游戏详情页（以 WordBridge 为例）
Hero（accent 氛围 + 88px 图形 + 标题 + 期号/时长/全球同题徽章 + Play 主按钮/Practice 次按钮）→ How-to 卡（含 CSS 自动播放的选中演示格，DESIGN-V2 §5.4）→ 个人统计四格 → 其他游戏横向入口 → 页脚。

### 8.3 `about.html` — About + How-to-play
品牌宣言 hero + 三张价值卡（全球同题/无账号 streak/八种思维）→ 8 款游戏手风琴（品牌图形 + 规则三步 + 直达按钮，`<details>` 原生无障碍）→ 页脚（含语言选择器）。

### 8.4 国际化版式规则（多语言文本扩展空间）
1. **不给文案定宽**：按钮 `min-height` 固定但宽度随内容伸展且允许换行（`max-width:100%`）；德语/俄语按 +35%、泰语/印地语按 +15% 预算。
2. **卡片描述固定 2 行槽位**：`line-clamp: 2` + `min-height: 2.6em`，长文案截断、短文案不塌陷。
3. **标题用 `clamp()` 流式字号**，长语言自动缩放不溢出；副标题限制 `max-width: 34em` 测量宽。
4. **弹性容器**：所有「文本 + 按钮」行 `flex-wrap: wrap`，文案过长时按钮整行下移而不是挤压。
5. **语言选择器** `min-width: 9em` 容纳最长语言自称（Português/简体中文）；顶栏 480px 以下只留图形标，为长站名语言让位。
6. 日期/期号统一走 `Intl.DateTimeFormat`；数字/时间用 tabular-nums 防跳动。
7. RTL 预留：布局全部用逻辑属性方向无关的 flex/grid，未用绝对定位排文本；上线阿语前加 `dir="rtl"` 全站走查一次。

## 9. 验收对照（本次交付范围）

| 需求 | 交付物 |
|---|---|
| Logo（横/方/favicon/单色） | `brand-assets/logo/` 5 个 SVG |
| 色彩与字体系统 | §3/§4（与 DESIGN-V2 token 对齐，未新增冲突值） |
| 组件库规范 | §5 + 原型三页作为视觉基准 |
| 物料模板（OG/512/1024/截图/社媒头图） | `brand-assets/templates/` 5 个 SVG |
| 门户首页/游戏详情/About 原型（桌面+375px） | `brand-assets/prototypes/` 3 个 HTML + `tokens.css` |
| 多语言扩展空间 | §8.4 七条硬规则，已落进原型 CSS |
| SVG/物料源文件入库 | 全部位于 `brand-assets/`，纯 SVG/HTML/CSS 零依赖 |
