# SOP-03 上线/发布

适用：对外产品/服务的首次发布与重大版本发布。执行者：project-lead 牵头，devops-engineer 执行。

## 上线前检查清单
- [ ] CI 全绿；qa-engineer 测试报告无 blocker
- [ ] compliance-counsel 合规审查通过（隐私政策/服务条款已上线）
- [ ] 密钥全部走环境变量/secret 管理，仓库无泄漏（扫描确认）
- [ ] 域名/DNS/HTTPS 配置完成；SEO 基础（title/meta/sitemap/robots）就绪
- [ ] 支付链路（如有）端到端真实验证一次
- [ ] 监控与告警就绪；错误上报接通
- [ ] 回滚方案明确（一条命令/一次操作可回滚）

## 发布步骤
1. 预发布环境全流程走查（user-experience-officer）
2. 发布到生产；发布后立即冒烟测试主流程
3. 观察期 24h：监控错误率/延迟/成本异常

## 发布后
- 数据埋点确认上报正常；data-analyst 建立基线
- project-lead 按 SOP-04 汇报上线结果（地址、演示、已知问题）
