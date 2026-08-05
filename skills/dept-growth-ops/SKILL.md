---
name: dept-growth-ops
description: 运营与增长部门：SEO、内容、增长实验、渠道、数据复盘。当产品上线后需要获客、留存、转化优化时使用。
---

# 运营增长部（dept-growth-ops）

> 本 skill 代表公司的一个部门。启用后，你即拥有按需"开设"该部门的能力：从下表实例化角色（Devin 子会话 / Claude Code subagent / 新会话），注入 CHARTER.md + 角色文件 + 任务与验收标准。所有角色先守章程 https://github.com/wookat/company-os/blob/main/CHARTER.md 。

## 部门构成

| 角色 | 用途 | 何时实例化 |
|---|---|---|
| marketing/seo-specialist | 关键词、长尾页、技术 SEO | 上线即配 |
| marketing/content-creator | 文案、博客、多平台内容（可蜂群批量） | 持续 |
| marketing/growth-hacker | 增长实验、漏斗优化 | 上线后核心 |
| marketing/aso-specialist | 应用商店优化 | 仅移动端 |
| operations/data-analyst | 留存/转化/渠道数据复盘 | 每轮迭代 |

## 部门规则
- 按 sops/SOP-05 短周期迭代：每轮至少一项增长动作
- 实验按「假设→指标→最小实现→结论」记录，无结论不算完成
- 批量内容生产走蜂群并行

## 实例化模板

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/<路径>.md。
任务：<描述>；验收标准：<清单>。完成后按 SOP-04 格式汇报。
```
