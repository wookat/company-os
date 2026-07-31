# 真题工坊

把你的复习资料变成一场仿真模拟考。上传讲义/笔记 → AI 抽取考点 → 按考研真题风格命题（逐考点生成→查重→AI 审校）→ 在线计时答题判卷 → 错题一键导出 Anki .apkg → 考点覆盖度报告。

- 线上地址：https://zhenti.zalize.com （备用 https://zhentigongfang.wookat520.workers.dev）
- 技术：Cloudflare Workers + D1 + KV + Static Assets；DeepSeek（生成+审校双通道）；Tailwind 前端；sql.js+JSZip 浏览器端打包 .apkg
- 账号：邮箱+密码（PBKDF2），JWT 会话
- 付费：免费每天 1 卷；会员通过兑换码开通（redeem_codes 表），在线支付待接入

## 部署
```bash
export CLOUDFLARE_API_TOKEN=...
wrangler d1 execute zhentigongfang --remote --file=schema.sql
wrangler deploy
wrangler secret put DEEPSEEK_KEY
wrangler secret put JWT_SECRET
```
兑换码见 redeem_codes_private.txt（勿公开）。
