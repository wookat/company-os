# QA 第 135 轮 — 成绩分享图 + 390 胶囊单行复验（生产 build aa798d9）

部署核对（已完成）：app2 curl=assets/index-DoWAKKog.js（执行时与 document.scripts 比对）。
代码依据：aa798d9 web/src/pages/Result.tsx——makeScoreCard(640×800 蓝紫渐变，标题「真题工坊 · 成绩单」96y/卷名 160y/分数环 r120@340y 按 pct 比例白弧/大分数 72px/`/ M 题 · 正确率 X%`/beat≥20 显示「击败了 X% 的研友」否则 grade/产品说明/域名 716y)；按钮「📷 生成成绩分享图 ›」位于分数行下 `<p class="mt-2">`；弹层 z-[60] max-w-xs，✕(-top-2.5 -right-2.5)/遮罩 onClick/ESC keydown 关闭，「保存图片」a[download=真题工坊成绩单.png]。d8ff4e3 Layout.tsx 胶囊加 whitespace-nowrap text-xs sm:text-sm。

账号：新号 qa135-<ts>@test.zalize.com（报邮箱清库）。

## T1 成绩分享图（核心，1440px）
1. 做 2026 卷：答 2 题（第 1 题 D=否定之否定 正确项随缘，任意作答即可）→ 提前交卷 → 成绩页。记录页面实际值：score/total（如 1/33）、正确率 X%、「击败了 Y% 的研友」或评语。
2. 断言 A：分数行下存在「📷 生成成绩分享图 ›」胶囊按钮（brand 蓝描边浅底）。点击 → 弹层出现：
   - 图内容与页面一致：标题「真题工坊 · 成绩单」、卷名「2026 考研政治真题卷」、大分数=score、「/ total 题 · 正确率 X%」、beat≥20 时「击败了 Y% 的研友」逐字一致（截图比对）；
   - 分数环：pct 低（~3–6%）时白色弧仅顶部一小段（若画成整圈/半圈即比例错，可区分）；
   - 底部「历年真题免费在线刷 · 判分 · 错题本 · 分析题背诵」+「zhenti.zalize.com」。
3. 断言 B 关闭三路：ESC → 关；再开 → 点右上白圆 ✕ → 关；再开 → 点遮罩 → 关（每路截图或确认弹层消失）。
4. 断言 C 保存：再开 → 点「保存图片」→ 下载文件 `真题工坊成绩单.png`（~/Downloads 校验存在且 >10KB、file 类型 PNG 640×800）。
5. 390px：再开弹层 → 卡片完整、✕ 可见不被裁切、保存/关闭按钮可点、scrollWidth=390。

## T2 QA134 P4 复验：390px 新版本胶囊单行
390px #home，console 覆写 fetch 伪 bundle（同 QA134 方法）+ dispatch visibilitychange → 胶囊出现。
- 断言：胶囊单行（rect height ≤ ~40px，QA134 实测两行 60px 可区分）、完整在视口内、不压 hero「你好，qa…」问候行（截图）。验后刷新清除。

## T3 负例 + 回归
- 直刷 #result/:pid（成绩页 F5）：正常渲染、console/pageerror 清零。
- 新版本胶囊负例：不拦截 dispatch visibilitychange → 无胶囊（不误报）。
- 每日一题卡可展开（揭晓前无答案泄漏）；favicon 无 404；HTTP≥400=0；1440/390 无横向溢出。

执行顺序：注册→T1（做卷→成绩页→分享图→关闭三路→下载→390 弹层）→T2（390 胶囊）→T3 汇总。
产出：test-report-135.md（内嵌截图）+ 录屏 + 测试邮箱。
