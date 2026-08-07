# R16 竞品研究：业界设计标杆优点清单（cross 线）

> 方法：否定之否定——正题（我们九站现状）→ 反题（标杆更优之处）→ 合题（改进并上线）。
> 实践论：以下每条均为 2026-08-07 浏览器实测（Playwright/Chromium，1440×900 与 375×812 双视口），截图存 `docs/r16-assets/`（`<站名>-1440.jpg` / `<站名>-375.jpg`），不凭印象。
> 九站范围：aiact / biaoshi / data / ext / guifan / mcp / prompter / speech / tiku（均 *.zalize.com）。

## 实测标杆（12 个，均为真实流量/公认口碑站点）

| # | 站点 | 截图 |
|---|---|---|
| 1 | stripe.com | stripe-1440.jpg · stripe-375.jpg |
| 2 | linear.app | linear-1440.jpg · linear-375.jpg |
| 3 | vercel.com | vercel-375.jpg（1440 端多次超时，取 375 实测） |
| 4 | ui.shadcn.com | shadcn-1440.jpg · shadcn-375.jpg |
| 5 | tailwindcss.com | tailwindcss-1440.jpg · tailwindcss-375.jpg |
| 6 | raycast.com | raycast-1440.jpg · raycast-375.jpg |
| 7 | resend.com | resend-1440.jpg · resend-375.jpg |
| 8 | supabase.com | supabase-1440.jpg · supabase-375.jpg |
| 9 | cal.com | cal-1440.jpg · cal-375.jpg |
| 10 | framer.com | framer-1440.jpg · framer-375.jpg |
| 11 | notion.com | notion-1440.jpg · notion-375.jpg |
| 12 | posthog.com | posthog-1440.jpg · posthog-375.jpg |

## 值得学的优点（12 条）

1. **首屏一句话价值主张 + 单一主 CTA**（Stripe 首页 hero；Linear 首页 hero）
   为什么好：3 秒内说清「是什么、为谁、做什么」，CTA 唯一不分散注意力，直接影响转化。
   适用到我们：speech / prompter / ext 首屏已接近；data、mcp 首屏信息密度过高需收敛；biaoshi 首屏 CTA 可更聚焦。

2. **产品真身即 hero 展示**（Linear 首页内嵌真实产品 UI；Cal.com 首页右侧直接放可交互日历卡片；PostHog 首页嵌可交互 demo）
   为什么好：不用文字自证，产品界面即信任状，用户立即理解产品形态。
   适用到我们：prompter 首页已内嵌提词器实机（好）；tiku / guifan 可把「每日一练/搜索框」更前置；data 应放数据集样例预览。

3. **社会证明紧跟首屏**（Stripe 首屏下方客户 logo 墙；Cal.com 首屏 Trustpilot/G2 星级；Supabase 顶栏 GitHub 107.6K stars）
   为什么好：第三方背书是转化的信任杠杆，位置越靠前越有效。
   适用到我们：九站普遍缺社会证明。可用真实可验数字替代（tiku「8680 道题」、guifan「533 所高校」、mcp「3237+ servers」已有，需统一放到首屏徽章位）。

4. **统一的全站页脚：产品矩阵互链 + 法务信任链接**（Stripe / Vercel / Supabase 页脚均有完整产品矩阵、法务、状态页链接）
   为什么好：内链传递权重（SEO）、跨产品导流、页脚法务链接（Privacy/Terms）是信任底线。
   适用到我们：九站页脚不统一——prompter 对 zalize 家族 0 互链、biaoshi/ext 无 `<footer>` 语义标签；应做统一「Zalize 产品矩阵」页脚区块。

5. **导航精简 + 移动端专用抽屉**（Vercel 375px 汉堡菜单；Raycast 顶栏一行收纳 9 项仍不拥挤；Notion 移动端导航）
   为什么好：移动端小屏不牺牲可达性，导航层级 ≤2。
   适用到我们：tiku / guifan 移动端导航已可用；data / mcp 移动端顶栏项目过多需折叠为抽屉。

6. **深浅色主题与品牌色克制**（Linear / Resend / Raycast 全深色一致性；shadcn/ui 中性灰 + 单强调色）
   为什么好：色彩克制=专业感；品牌强调色只用于 CTA 与关键状态，视觉层级清晰。
   适用到我们：九站各自品牌色可保留，但按钮/链接/强调色应站内唯一（部分站 CTA 色彩超过 2 种）。

7. **字体排印层级大胆**（Stripe hero 56px+ 大标题；Resend 衬线大标题制造反差；Framer 超大留白）
   为什么好：大标题+大留白让页面「贵」，阅读动线清晰。
   适用到我们：speech / prompter 已达标；guifan / tiku 中文标题层级可再加大（h1 与正文对比不足）。

8. **结构化数据与完整 SEO head**（Stripe/Vercel 每页 canonical + og + twitter card + JSON-LD；tailwindcss.com 文档页 head 完整）
   为什么好：搜索引擎富摘要与社交分享卡片直接影响 CTR 与收录。
   适用到我们：prompter 线上 HTML 无 canonical/og/JSON-LD（P0）；guifan 缺 og；data canonical 指向 /index 而非 /（重复内容风险）。

9. **未知路由返回真 404**（Stripe / Vercel / Linear 对不存在路径均返回 HTTP 404 + 设计过的 404 页）
   为什么好：SPA 兜底全返 200 会造成搜索引擎「软 404」，伤收录质量。
   适用到我们：biaoshi / ext / prompter 任意路径返回 200（软 404，P1）；aiact / data / guifan / mcp / speech 已正确 404。

10. **性能即体验：静态优先 + 边缘缓存**（tailwindcss.com / shadcn 静态化 TTFB <100ms；Vercel 全球边缘）
    为什么好：LCP/TTFB 直接影响跳出率与 Core Web Vitals 排名信号。
    适用到我们：八站 TTFB 70–90ms 达标；**guifan TTFB 884ms**（D1 实时查询无缓存，P1）；tiku 212ms 可接受。

11. **免费/无门槛承诺显性化**（Cal.com「No credit card required」；PromptCue 式「Free forever · No signup」徽章是 Raycast/Linear 常用模式）
    为什么好：消除注册/付费顾虑，是免费工具站最强转化钩子。
    适用到我们：prompter / speech / ext 已有；tiku / guifan / biaoshi 应在首屏加「免费·无需注册」徽章。

12. **可交互演示优先于说明文案**（PostHog 首页内嵌可点击 demo tabs；Cal.com 内嵌真日历；shadcn/ui 组件页即样例）
    为什么好：让用户 10 秒内「用到」产品而非「读到」产品。
    适用到我们：prompter 已内嵌实机；tiku 可首屏直接嵌 3 道试做题；speech 可嵌向导第一步。

## 反题结论（我们被否定之处）

上一版九站「各站各自为政」：SEO head 完整度、404 语义、页脚信任区、跨站互链、性能预算均无统一标准。本轮以上述 12 条为标尺，形成 `docs/r16-gap-backlog.md` 的主要矛盾排序。
