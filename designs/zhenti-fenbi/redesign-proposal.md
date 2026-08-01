# 真题工坊 UI 重设计方案（对标临摹：粉笔 App 刷题界面）

> UI 设计师交付 · 2026-08-01 · 附 5 个可直接打开的单文件 Tailwind CDN 高保真原型（双视口 390px / 桌面自验通过）

---

## 一、现状体验记录（真实测试号，零生成零交卷）

测试号：devin.ui.test0801@example.com（自注册，免费版）。截图见 `shots/` 目录：

| 页面 | 桌面截图 | 390px 截图 | 现状问题 |
|---|---|---|---|
| 落地页 | current-landing-desktop.png | current-landing-mobile390.png | 深色科技风尚可，但与登录后的素白工作台风格完全割裂 |
| 工作台 | current-dashboard-desktop.png | current-dashboard-mobile390.png | 全页一列白卡，无视觉层级；桌面端 max-w 窄条居中，大量留白浪费；数据（倒计时/连续学习）淹没在小字里 |
| 错题本 | current-wrongbook-desktop.png | current-wrongbook-mobile390.png | 空态只有一行灰字；列表态是素 details 折叠，无科目色彩、无复习进度可视化 |
| 我的 | current-account-desktop.png | current-account-mobile390.png | 表单直接裸露，会员状态/邀请/兑换码/改密码平铺一列，无卡片分组感 |
| 答题页 / 成绩页 | （代码走查 renderExam/renderResult，未触发生成） | 同左 | 选项按钮是细边框白块、缺按压反馈层次；成绩页信息密但表格感弱 |
| 样卷预览 | current-sample-paper-desktop.png | current-sample-paper-mobile390.png | 深色卡片可读性差，选项行高拥挤 |

**移动端注意点**：无底部 Tab（顶部三链接过小，拇指热区不足）；今日任务按钮偏小；PWA 安装横幅遮挡内容。

## 二、选型：抄谁、为什么

**选定对标：粉笔 App 的刷题界面**（视觉语言 + 信息架构 + 刷题交互范式整体临摹）。

理由（对比其余候选）：

1. **场景完全同构**：粉笔就是"中国考试刷题"这个垂直里经过亿级用户验证的设计——练习页、答题卡、成绩报告、错题本、每日任务，每个页面真题工坊都有一一对应物，可以逐屏临摹，不需要任何"翻译"。
2. **目标用户零学习成本**：考研人几乎都用过粉笔/腾讯题库类产品，蓝底白卡、大数字统计、圆环成绩、底部 Tab 是他们的肌肉记忆。
3. Duolingo 游戏化风格做题娱乐感太强，与"仿真模拟考"的严肃卖点冲突；shadcn/ui + Linear 是开发者工具审美，冷灰低饱和，对移动端为主的考生缺乏情绪价值；不背单词卡片风只适合单点记忆场景，撑不起试卷/成绩/错题的多页信息密度。
4. 粉笔的视觉基因（品牌蓝 + 浅灰蓝底 + 白色大圆角卡 + 橙色激励色 + 大号数字）全部可以用 Tailwind 原子类精确表达，与现有单文件 CDN 架构零冲突。

临摹要点清单（从粉笔刷题界面提取）：
- 全局：浅灰蓝页面底（非纯白），内容全部装进白色大圆角卡片，卡片间距离产生分组；品牌蓝作为唯一主行动色。
- 移动端：底部 3-Tab 导航（工作台/错题本/我的），主行动按钮通栏大按钮。
- 工作台：顶部横幅化的"今日任务/打卡"激励区（倒计时大数字+火焰连续天数），下方统计三宫格，大数字+小标签。
- 答题页：顶栏＝退出+计时+答题卡入口；题干区大字号；选项为整行白色圆角块，选中态整块变品牌蓝浅底+蓝描边+徽章实心；底部固定"上一题/下一题"栏。
- 成绩页：大圆环得分置顶，下方"击败 xx%"胶囊、统计行、考点雷达/条形、逐题解析折叠列表。
- 错题本：科目胶囊筛选 + 卡片列表，每卡左侧色条 + 复习阶段徽章。

## 三、设计规范（全部 Tailwind 类名，CDN 可直接用）

### 3.1 颜色 Token（tailwind.config 内联扩展）

```js
tailwind.config = { theme: { extend: { colors: {
  brand:   { 50:'#EEF4FF',100:'#DFEAFF',500:'#3D7FFF',600:'#2E6BEC',700:'#2456C7' }, // 粉笔品牌蓝
  page:    '#F4F6FA',        // 页面底色（浅灰蓝）
  ink:     { DEFAULT:'#1E2330', 2:'#5A6472', 3:'#9AA3B2' }, // 三级文字
  streak:  '#FF7A2F',        // 激励橙（连续学习/火焰）
  ok:      '#00B578',        // 正确绿（粉笔同款绿）
  bad:     '#FF4D4F',        // 错误红
  warn:    '#FFA716',        // 待查/中档黄
}}}}
```

用法约定：
- 页面底 `bg-page`；卡片 `bg-white`；主按钮 `bg-brand-500 hover:bg-brand-600 text-white`；
- 文字三级：标题 `text-ink`、正文 `text-ink-2`、辅助 `text-ink-3`；
- 语义色只用于状态：绿=对/完成，红=错/到期，橙=连续学习与激励，黄=标记待查。

### 3.2 字体

```html
<body class="font-sans text-ink antialiased">  <!-- 系统栈：PingFang SC / HarmonyOS Sans / Segoe UI -->
```
- 数字一律 `tabular-nums font-semibold`（成绩、倒计时、统计），大数字 `text-3xl`~`text-5xl font-extrabold`；
- 字号阶梯：页面题 `text-lg font-bold`（移动）/`text-xl`（桌面）；卡片题 `text-[15px] font-semibold`；正文 `text-sm`；辅助 `text-xs`；题干 `text-[16px] leading-7`。

### 3.3 圆角 / 阴影 / 边框

- 卡片 `rounded-2xl`（16px）；按钮与输入 `rounded-xl`（12px）；胶囊 `rounded-full`；选项块 `rounded-xl`。
- 阴影只用一档：卡片 `shadow-[0_1px_3px_rgba(30,41,59,0.06)]`，悬浮层 `shadow-xl`；卡片同时 `border border-black/5`。
- 不再使用 slate-100 细描边白卡贴白底——底色改灰蓝后卡片靠明度差自然分层。

### 3.4 间距

- 页面容器：移动 `px-4 pb-24`（给底部 Tab 留位），桌面 `max-w-5xl mx-auto px-6 py-8`；
- 卡片内边距 `p-4`（移动）/`p-5`（桌面）；卡片间距 `space-y-4`；分组标题与卡片 `mt-6 mb-2`；
- 触控目标 ≥44px：主按钮 `h-12`，次按钮 `h-10`，底部 Tab `h-14`。

### 3.5 组件样式速查

| 组件 | Tailwind 类 |
|---|---|
| 主按钮 | `h-12 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[.98] text-white text-[15px] font-semibold` |
| 次按钮 | `h-10 rounded-xl bg-brand-50 text-brand-600 text-sm font-medium` |
| 幽灵按钮 | `h-10 rounded-xl border border-black/10 bg-white text-ink-2 text-sm` |
| 卡片 | `bg-white rounded-2xl border border-black/5 shadow-[0_1px_3px_rgba(30,41,59,0.06)] p-4 sm:p-5` |
| 胶囊标签 | `px-2.5 py-1 rounded-full text-xs font-medium`（+语义色 `bg-brand-50 text-brand-600` 等） |
| 输入框 | `h-11 rounded-xl border border-black/10 bg-white px-4 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none` |
| 选项块（默认） | `w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-black/10 bg-white text-[15px]` |
| 选项块（选中） | `border-brand-500 bg-brand-50 text-brand-700`，字母徽章 `bg-brand-500 text-white border-brand-500` |
| 选项块（判对/判错，成绩页） | 对 `border-ok/40 bg-ok/5`；错 `border-bad/40 bg-bad/5` |
| 进度条 | 轨 `h-2 bg-black/5 rounded-full`，值 `bg-brand-500`（考点覆盖用 `bg-ok`） |
| 底部 Tab（移动） | `fixed bottom-0 inset-x-0 h-14 bg-white border-t border-black/5 grid grid-cols-3`，激活项 `text-brand-600`，未激活 `text-ink-3` |
| 桌面顶栏 | `sticky top-0 bg-white/90 backdrop-blur border-b border-black/5 h-14` |

## 四、5 个原型对照说明（改了什么、为什么好看）

原型文件均为单文件 Tailwind CDN，可直接双击打开；每个都内置移动（底部 Tab）与桌面（顶栏 + 宽布局）两套响应式表现。**功能元素 100% 保留**（以现状截图与 app 源码走查为准）。

### 1. 工作台 `proto-dashboard.html`（对照 current-dashboard-*.png）
改动：
- 顶部新增粉笔式"冲刺横幅"：距初试倒计时大数字 + 🔥连续学习天数（可点开打卡日历）+ 今日任务 0-3 进度圆点，替代原来藏在卡片角落的小灰字；
- 今日任务三条改为带勾选圆圈的清单行，行动按钮加大到 44px 热区；
- 统计三宫格（最近正确率+趋势柱 / 今日待复习错题 / 考点攻克进度）临摹粉笔"练习报告"大数字卡；"近 7 天"周报行保留在卡底；
- 我的资料、考点库五科按钮（马原·哲学/毛中特/史纲/思修法基/形势与政策）、上传资料、5 题快练、一键每日一卷、免费版额度行、试卷列表（查看成绩/重做/继续作答/生成中态）全部保留，试卷列表改为带状态色点的清单卡。
为什么好看：页面从"一列等宽白条"变成"横幅→数据→行动→列表"的粉笔式节奏，灰蓝底让白卡有了层次，大数字给考生即时的掌控感。

### 2. 答题页 `proto-exam.html`（对照 renderExam 源码走查）
改动：
- 顶栏固定：退出、"第 x/y 题·已答 n"、⏱计时、⚑标记待查；下方细进度条改为品牌蓝；
- 题干加大到 16px/leading-7，多选/材料分析徽章保留；
- 选项块整行可点、选中态蓝底蓝框+实心字母徽章（粉笔同款交互）；多选提示、报错入口、键盘 A-D 提示保留；
- 底部固定操作栏（上一题/提前交卷/下一题），拇指可达；答题卡（题号宫格+黄点标记+下一道待查）收进可展开面板，桌面端右侧常驻。
为什么好看：做题时视野里只有题目和选项——导航、答题卡全部收到固定栏/侧栏，选中反馈从"细边框变色"升级为整块高亮，命中率和确定感都更强。

### 3. 成绩页 `proto-result.html`（对照 renderResult 源码走查）
改动：
- 得分大圆环置顶（红/黄/绿三档色保留），下方"击败 xx% 研友"胶囊、正确率/用时行、历史成绩胶囊、保存成绩海报按钮全部保留；
- 考点覆盖度改成粉笔报告式条形列表：左考点名+累计掌握度、右侧彩条+分数，弱项排前；"查看弱项榜"入口保留；
- 逐题解析：答对折叠/答错展开保留，选项加判对判错底色，"你当时选了/答案/解析"分区展示；材料分析题自评区保留；
- 底部双按钮：返回工作台 / 立即重练本卷错题。
为什么好看：第一屏就是"分数+击败百分比"的情绪峰值（粉笔交卷页的核心爽点），下面的诊断信息用色条而不是纯文字表达强弱，一眼看出该补哪。

### 4. 错题本 `proto-wrongbook.html`（对照 current-wrongbook-*.png）
改动：
- 头部：错题总数 + 错题重练（主按钮）+ 导出 Anki .apkg（会员锁样式保留）；
- 今日复习/全部 Tab、科目胶囊筛选、搜索框全部保留，搜索框改粉笔式圆角灰底；
- 错题卡：左侧科目色条 + 多选徽章 + 右上"今日复习/复习中 n/4"阶段徽章（莱特纳盒进度可视化），展开后选项、你的答案（红）、正确答案（绿）、解析、移出错题本、报错保留；
- 空态配插画字符和"去做一份模拟卷"引导按钮，不再是一行灰字。
为什么好看：每张错题卡有了"科目身份"和"复习进度"两个视觉锚点，列表可扫读；到期红徽章制造紧迫感，这正是粉笔错题本的留存钩子。

### 5. 我的 `proto-account.html`（对照 current-account-*.png）
改动：
- 顶部个人卡：头像字符 + 邮箱 + 会员状态徽章（免费版/权益说明），临摹粉笔"我的"页头；
- 邀请研友改成奖励卡片：双方各得 3 天会员、进度（已邀 n/10）、邀请链接+复制按钮；
- 升级会员：内测免费横幅 + 兑换码输入行保留，做成金色渐变权益卡；
- 修改密码折叠为独立卡片分组；退出登录改为底部红字整行按钮（粉笔式危险操作位）。
为什么好看：从"裸表单堆叠"变成"身份→权益→设置→危险操作"的标准账户页信息架构，每个区块都有卡片承载，扫一眼就知道去哪。

## 五、落地建议

1. 现有 app 就是模板字符串拼 Tailwind 类，可直接按 §3.5 组件速查逐个替换类名，无需引入任何构建；
2. 优先级：答题页/成绩页（使用时长最高）→ 工作台 → 错题本 → 我的；
3. 落地页后续可换成浅色同语言版本，消除"深色官网 → 素白应用"的割裂（本次未在 5 原型范围内）。
