# 真题工坊运维手册（RUNBOOK）

生产：https://zhenti.zalize.com （Cloudflare Worker `zhentigongfang`，D1 `zhentigongfang`，KV binding `RATELIMIT`）

## 部署与回滚

```bash
cd /home/ubuntu/zhentigongfang
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_WORKERS_API_TOKEN"
./deploy.sh                      # 构建 web/ + wrangler deploy
git push cos master:zhenti-app   # 代码备份到 GitHub
```

回滚：`npx wrangler rollback`（回到上一版本）或 `npx wrangler deployments list` 后 `npx wrangler rollback --version-id <id>`。注意静态资源（public/、web/dist）随 Worker 版本一起回滚。

## 数据备份与恢复（D1）

- **内置 Point-in-Time（Time Travel）**：D1 自动保留 30 天任意时刻恢复能力，无需额外配置。
  - 查看当前书签：`npx wrangler d1 time-travel info zhentigongfang`
  - 恢复到时间点：`npx wrangler d1 time-travel restore zhentigongfang --timestamp=<unix或ISO>`（会覆盖当前库，先 export 留底再操作）
- **手动全量导出（异地留底，建议每周一次）**：
  - `npx wrangler d1 export zhentigongfang --remote --output backups/d1-backup-$(date +%Y%m%d).sql`
  - 导出文件含用户邮箱/密码哈希，**禁止提交 git**（backups/ 已在 .gitignore）。
- **恢复演练结论（2026-08-05）**：export 产物为标准 SQL（含 schema+数据），可用 `wrangler d1 execute --file` 重放到新库验证。
- 真题内容数据双份：D1 + 仓库 `data/realexam/*.json`（内容订正时两边同步）。

## 密钥

- Worker secrets：`RESEND_KEY`（邮件）。更新：`printf '%s' "$KEY" | npx wrangler secret put RESEND_KEY`
- Admin key：`/home/ubuntu/.zhenti_admin_key`（勿打印/提交）。

## 监控与观测

- 慢 API（>5s）：KV `slowlog` 环形日志（近 50 条），运营看板 /admin amber 徽标。
- 5xx 错误：KV `errlog` 环形日志（近 50 条），运营看板红色徽标。
- Cron（每日北京 8:00 提醒邮件）：`npx wrangler tail` 观察 `remind cron:` / `resend=` 日志。
- 实时日志排障：`npx wrangler tail --format pretty`。

## 已知运行特征

- Workers/D1 冷启动偶发 API 慢（秒级到分钟级抖动）；前端已有骨架屏+20s 超时+自动重试兜底，属基础设施特征而非查询问题（wrongbook SQL 已确认走索引 ~0.5ms）。
- `/app2` HTML no-store、bundle 指纹长缓存；旧标签页需硬刷新才见新版（应用内有「新版本已发布」提示胶囊）。
- KV 聚合缓存：`agg:years` / `agg:kps`（TTL 6h）；内容订正后需删除这两个 key 立即生效。

## 内容订正 SOP

1. 远程 D1 UPDATE（`npx wrangler d1 execute zhentigongfang --remote`）；
2. 同步 `data/realexam/*.json`；
3. 删 KV `agg:kps` / `agg:years`；
4. 推 IndexNow（key `8f4b2c1de6a94570a3c9d1f7b5e28a64`，由 Worker 路由提供）；
5. 生产抽查详页（curl 带 `-A "Mozilla/5.0"`）。
