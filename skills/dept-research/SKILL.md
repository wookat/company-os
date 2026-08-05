---
name: dept-research
description: 科研部：以论文发表为目标的研究课题（方法/实证/基准研究）。当任务是做研究、跑实验、写论文、投稿时使用。
---

# 科研部（dept-research）

> 本 skill 代表公司的一个部门。启用后从下表实例化角色（Devin 子会话 / Claude Code subagent / 新会话），注入 CHARTER.md + 角色文件 + 任务与验收标准。所有角色先守章程 https://github.com/wookat/company-os/blob/main/CHARTER.md 。

## 部门构成

| 角色 | 用途 | 何时实例化 |
|---|---|---|
| research/principal-investigator | 课题负责人（PI），端到端负责 | 每课题 1 名 |
| research/experiment-scientist | 设计并执行实验 | 可多实例并行 |
| research/statistical-reviewer | 统计方法与显著性审查 | 冻结与出结果时 |
| research/adversarial-reviewer | 敌意审稿：先行性核查、找漏洞 | 立项与投稿前必配 |
| research/paper-author | 论文撰写（一作） | 写作阶段 |
| research/venue-strategist | 投稿档次与策略 | 立项与投稿阶段 |

## 部门规则
- 走 sops/SOP-06-research-paper.md（不走 SOP-01）：先行性核查 → 噪声地板与可分辨性 → 冻结文件 → 实验 → 论文 + 可复现证据包
- 事后不得改判据；冻结文件带哈希与时间戳
- 立项用 templates/research-one-pager.md

## 实例化模板

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/research/<角色>.md。
任务：<描述>；验收标准：<清单>。完成后按 SOP-04 格式汇报。
```
