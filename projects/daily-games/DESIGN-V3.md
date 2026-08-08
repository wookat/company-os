# DESIGN-V3 壳级升级规范：反馈爽感系统（音效 · 微动效 · 结算演出 · 视觉 polish）

- 作者：ui-designer（专项：工厂壳升级，性价比最高一笔，直接拉升 60+ 款门户新款 C 维度 2.5→3.5+）
- 日期：2026-08-08
- 输入：全矩阵 100 款体验评分报告（matrix-score-report.md §二 C 维度：69 款工厂壳「仅完局 confetti、无音效、无微动效、结算平庸」）
- 现状底座（已核实 zalize-games 仓库）：`packages/ui`（@dg/ui，Svelte 组件 + `celebration.ts` 已有 confetti/animateNumber）、`packages/design-tokens`（--z-* token）、`packages/game-kit`（loop/tween/input）、`templates/game-app` 工厂模板。**本规范全部落在这套现有结构上，新增 3 个文件 + 扩 1 个 token 文件，逐款接入只改 ≤10 行。**
- 参照手感：Wordle（翻牌节奏）、NYT Games（克制而精准的音效）、Duolingo（正确音高递升+结算分层演出）
- 可点按体验原型：https://design-v3-demo.pages.dev/ （源码 `design-v3-prototype.html`，音效需点击后解锁）

---

## 0. 设计原则（三条铁律）

1. **反馈必须 <100ms 内开始**：音效与微动效在输入事件同帧触发；结算演出是唯一允许 >1s 的演出，且 ≤2s 完成不拖节奏。
2. **默认克制**：音效短（<250ms）、音量低（master 0.5）、每类音一种音色；动效小位移（≤6px）小缩放（≤1.15）。Duolingo 的爽感来自「精准+递升」，不是「大」。
3. **三开关全尊重**：全局静音（persisted `dg_muted`）、`prefers-reduced-motion`（动效降级为直接变终态，音效不受影响）、页面失焦自动停声。

---

## ① 音效系统 `packages/ui/src/sfx.ts`（Web Audio 合成，0 外部依赖 0 资源文件）

### 1.1 架构
- 单例 `AudioContext`，**首次用户手势时 lazily 创建/resume**（浏览器 autoplay 政策；shell 在 GameShell 挂 once pointerdown/keydown 监听）。
- 每个音 = 1-3 个 `OscillatorNode` + `GainNode` ADSR 包络合成，无采样文件（体积 0，License 0）。
- 主链：`osc → gain(包络) → masterGain(0.5) → ctx.destination`；全局静音即 `masterGain.gain = 0`（不 suspend，避免恢复延迟）。
- `document.visibilitychange` 隐藏时 `ctx.suspend()`，可见时 resume（省电+不在后台响）。

### 1.2 七个标准音色（合成参数表，工程直接照抄）

| 音名 | 触发时机 | 合成配方（type / freq / 包络） | 时长 |
|---|---|---|---|
| `tap` | 任意按键/落子/选中 | triangle 880Hz→660Hz 滑落；gain 0→.18→0（attack 5ms, decay 70ms） | 75ms |
| `correct` | 单步正确/命中/消除 | sine 523Hz(C5) + 泛音 sine 1046Hz(.3×)；attack 8ms decay 180ms | 190ms |
| `wrong` | 错误/无效输入 | square 196Hz(G3)→165Hz(E3) 两连降；gain .12；各 90ms | 200ms |
| `combo(n)` | 连击/连锁第 n 次 | correct 配方，频率沿大调音阶递升：C5·D5·E5·G5·A5·C6（n≥6 封顶 C6）+ 每级 gain +.02（封顶 .3） | 190ms |
| `win` | 胜利结算开场 | 琶音 C5→E5→G5→C6（sine，每音 90ms 间隔 70ms，最后音 decay 400ms） | ~700ms |
| `lose` | 失败结算开场 | sine 330Hz→262Hz 缓降滑音（portamento 250ms）gain .12——**柔和不惩罚**，绝不用蜂鸣 | 350ms |
| `tick` | 倒计时最后 5s/限时模式 | sine 1200Hz 短点 gain .08；最后 1s 换 1500Hz | 40ms |

> combo 音高递升是 Duolingo 手感的核心配方；`sharpeye` 已验证（评分报告点名参考）。

### 1.3 API（TypeScript 签名）
```ts
// packages/ui/src/sfx.ts
export type SfxName = 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'tick';
export function sfx(name: SfxName): void;          // fire-and-forget，未解锁/静音时静默 no-op
export function sfxCombo(step: number): void;      // 1-based，音高沿音阶递升
export function setMuted(m: boolean): void;        // 写 localStorage 'dg_muted'
export function isMuted(): boolean;                // 默认 false（低音量克制型默认开）
export function unlockAudio(): void;               // GameShell 在首个手势调用；幂等
```
- 设置弹层（SettingsModal）加一行「Sound 🔊/🔇」开关，读写同一存储键；顶栏不加图标（保持克制）。
- 触觉：移动端在 `correct/win` 同时 `navigator.vibrate?.(10)`、`wrong` 20ms，同受静音开关控制。

## ② 微动效库 `packages/ui/src/fx.ts` + `packages/design-tokens/tokens.css` 扩展

实现策略：**能用 CSS class 的用 class（声明式、可树摇）；需要运行时参数的用 WAAPI helper**（`element.animate()`，自动叠加不打断布局）。全部动效在 `@media (prefers-reduced-motion: reduce)` 下 duration→1ms 直达终态（token 层统一处理，见 2.3）。

### 2.1 CSS 类（加入 design-tokens/components.css，前缀 `zfx-`）

| 类名 | 用途 | 关键帧 |
|---|---|---|
| `.zfx-press` | 所有按钮/可点格：按压回弹 | `:active { scale: .95 }` transition `--z-dur-1 --z-ease-pop`（还原时回弹） |
| `.zfx-pop` | 元素入场/落位 | scale 0→1.12→1，`--z-dur-2 --z-ease-pop` |
| `.zfx-land` | 棋子/方块落格 | translateY(-8px)→0 + scale 1.06→1，`--z-dur-2` |
| `.zfx-correct` | 单格正确 | scale 1→1.12→1 + 背景闪 `--z-success-soft`，280ms |
| `.zfx-shake` | 错误/无效 | translateX ±4px×4，`--z-dur-3`（500ms 内完成） |
| `.zfx-clear` | 消除退场 | scale 1→1.15→0 + opacity→0，240ms（消除类游戏行/组通用） |
| `.zfx-glow` | 连击中高亮 | box-shadow 0 0 0→12px accent 15% 呼吸，1s 循环 |

### 2.2 WAAPI helpers（fx.ts，需要参数/编排的场景）
```ts
export function popIn(el: Element, delay?: number): Animation;      // 逐格 stagger 入场（delay=index*40ms）
export function burst(el: Element): Animation;                      // 消除爆裂：scale+fade+8 粒 accent 色微粒（DOM 粒子，非 canvas）
export function floatScore(anchor: Element, text: string): void;    // “+30” 飘字：从锚点上浮 32px 淡出 600ms
export function rollNumber(el: Element, to: number, dur?: number): void; // 数字滚动（包装现有 animateNumber 到 DOM）
export function fillProgress(el: Element, pct: number): Animation;  // 进度条充能：width→pct%，350ms --z-ease，末端亮一下
export function pulse(el: Element, times?: number): Animation;      // 分享按钮脉冲（默认 3 次停）
```
- 手感配对规则（壳级约定，逐款不再自行发明）：`tap`+`.zfx-press` / `correct`+`.zfx-correct` / `wrong`+`.zfx-shake` / `combo`+`.zfx-glow`+`floatScore` / 消除 = `burst()`+`sfxCombo`。

### 2.3 token 扩展（tokens.css 增量，--z-* 命名延续现状）
```css
:root {
  /* Motion v3 增量 */
  --z-dur-4: 500ms;                                /* shake/演出节拍 */
  --z-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  /* Feedback soft 色（正确/错误闪底，浅深两版） */
  --z-success-soft: color-mix(in srgb, var(--z-success) 18%, transparent);
  --z-danger-soft: color-mix(in srgb, var(--z-danger) 15%, transparent);
  /* 视觉 polish（§④）：卡片渐变与升级阴影 */
  --z-shadow-md: 0 4px 12px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.05);
  --z-shadow-pop: 0 8px 24px color-mix(in srgb, var(--z-accent, var(--z-brand)) 18%, rgb(0 0 0 / 0.10));
  --z-grad-card: linear-gradient(160deg, color-mix(in srgb, var(--z-accent, var(--z-brand)) 10%, var(--z-surface)), var(--z-surface) 55%);
  --z-radius-tile: 0.625rem;                       /* 游戏格专用，统一 60+ 款格子圆角 */
}
@media (prefers-reduced-motion: reduce) {
  :root { --z-dur-1: 1ms; --z-dur-2: 1ms; --z-dur-3: 1ms; --z-dur-4: 1ms; }
}
```

## ③ 结算演出模板 `packages/ui/src/components/Settlement.svelte`

替换现状「confetti + 干弹层」。**总时长 ≤2s，每层可跳过（点击任意处直达终态）**，reduced-motion 全部直达终态。

### 3.1 胜利时间线（分层入场）
| t | 层 | 演出 | 音 |
|---|---|---|---|
| 0ms | 遮罩+卡片 | 卡片 `--z-ease-pop` 上浮入场；confetti（现有 celebrate()） | `win` 琶音 |
| 250ms | ① 评级徽章 | 徽章 scale 0→1.2→1 盖章式落下（按成绩分档：🏆 Perfect / ⭐ Great / 👍 Solved，文案见 3.3） | 盖章 thud（tap 低八度 220Hz） |
| 650ms | ② 分数滚动 | 主成绩 rollNumber 0→N（600ms）；副统计四格随后 stagger 淡入 | 无（滚动不配音，避免吵） |
| 1250ms | ③ 连胜火焰 | `🔥 N` 徽章 pop 入场；N 增加时翻牌+火焰 `drop-shadow` 亮一下；断签日显示「New streak starts today」 | `correct` 单音 |
| 1600ms | ④ Share 按钮 | pulse ×3（呼吸光圈），倒计时/More games 同时淡入 | 无 |

### 3.2 失败时间线（鼓励向，~1.4s）
| t | 层 | 演出 | 音 |
|---|---|---|---|
| 0ms | 卡片入场 | 无 confetti；柔和上浮 | `lose` 缓降音 |
| 200ms | 答案揭示卡 | 答案卡翻面展示（rotateX 翻牌）——好奇心闭环优先 | 翻牌 tap |
| 700ms | 鼓励文案+统计 | "So close! / Next time!" + 统计淡入（played 照常 +1） | 无 |
| 1100ms | Share+倒计时 | 失败也给完整四件套（UX-FLOWS 铁律），share 文案自动带 ❌ 行 | 无 |

### 3.3 评级分档（壳级统一，slot 允许逐款覆盖）
- 按「成绩相对满分/步数上限」三档：≥90% → Perfect（金）、≥60% → Great（accent）、其余 → Solved（中性）。游戏传 `grade()` 回调可自定义（如 merge2048 按分数带）。

### 3.4 组件 API
```svelte
<Settlement
  outcome="win"            {/* 'win' | 'lose' */}
  score={1234}             {/* 主成绩数字（滚动） */}
  scoreLabel="points"
  grade="perfect"          {/* 'perfect' | 'great' | 'solved'，可省略由 shell 算 */}
  stats={{ played, winPct, streak, maxStreak }}
  answerReveal={snippet}   {/* 失败翻牌内容，win 时忽略 */}
  shareText={buildShareText(...)}
  onclose={...}
/>
```

## ④ 视觉 polish（工厂壳皮肤统一升级）

1. **每游戏主题色系统标准化**：现状各 app 在 index.css 手写 accent；升级为 game.config.ts 声明 `accent/accentSoft/accentInk` 三元组 → ThemeProvider 注入 `--z-accent/--z-accent-soft/--z-accent-ink`（浅深两套，深色 accent 提亮 10%、soft 换 18% 透明叠加——DESIGN-V2 §2.1 规则并入壳）。60+ 款按品类分 8 色族（词类绿/数字蓝/逻辑青/空间紫/地理橙/纸牌红/知识金/动作莓红），同族内微调明度错开。
2. **卡片/格子质感**：门户卡与游戏内面板底 `--z-grad-card`（accent 10% 渐变入面）替代纯 surface；游戏格圆角统一 `--z-radius-tile`；主按钮 hover 用 `--z-shadow-pop`（带 accent 色的投影，Duolingo 同款）。
3. **暗色对齐**：所有新增 soft/grad token 用 `color-mix` 基于 `--z-accent` 派生，暗色自动正确；验收：8 色族 × 深浅 × correct/wrong 闪底全部 ≥3:1 对可辨识（非文字色 3:1 即可）。

## ⑤ 落地方式：共享 shell 库接入

### 5.1 新增/改动文件（全部在现有 packages 内）
```
packages/ui/src/sfx.ts               新增（①）
packages/ui/src/fx.ts                新增（②，rollNumber 包装现有 celebration.animateNumber）
packages/ui/src/components/Settlement.svelte   新增（③，内部复用 celebrate()/StatsModal 布局）
packages/design-tokens/tokens.css    扩展（2.3/④ token）
packages/design-tokens/components.css 扩展（zfx-* 类）
packages/ui/src/components/GameShell.svelte    +unlockAudio 手势挂载、SettingsModal +Sound 开关
templates/game-app                   模板同步接入（新款自动带全套）
```

### 5.2 逐款接入 API（每款 ≤10 行改动）
```ts
import { sfx, sfxCombo, popIn, burst, floatScore } from '@dg/ui';

// 1. 输入处：onKey → sfx('tap')（键盘组件已在壳内，自动获得）
// 2. 判定处（各款唯一必改点）：
if (hit)  { sfx('correct'); el.classList.add('zfx-correct'); }
else      { sfx('wrong');   row.classList.add('zfx-shake'); }
chain > 1 && (sfxCombo(chain), floatScore(el, `+${points}`));
// 3. 结算：<StatsModal> → <Settlement outcome={won?'win':'lose'} … />（props 同构迁移）
```
- **分批推进**：第 1 批模板+demo 校准手感 → 第 2 批 Top15 打磨候选（评分报告 §三）→ 第 3 批脚本化批量迁移剩余款（判定点 grep `applyResult/markGamePlayed` 定位，半自动）。
- 回归风险控制：sfx/fx 全部 fire-and-forget、异常静默（try/catch 包 AudioContext 构造），任何一款接入失败不影响玩法逻辑；CI 现有 lint/build 覆盖。

## ⑥ 验收清单（qa-engineer 用例）
- [ ] 首次进入无手势前不报 AudioContext 警告；首个点击后音效即生效
- [ ] 静音开关持久化；切后台无声；恢复前台正常
- [ ] combo 连击 6 连音高封顶不刺耳；快速连点不爆音（同音 30ms 节流）
- [ ] reduced-motion 下：零位移动画、结算直达终态、confetti 不放，音效仍可用
- [ ] 胜利结算 2s 内四层全部呈现；点击跳过直达终态；失败版无惩罚感
- [ ] 一款样板（建议 wordfive）接入前后 Lighthouse 性能分差 ≤2 分
