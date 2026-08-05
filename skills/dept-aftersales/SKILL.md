---
name: dept-aftersales
description: 售后与用户服务部门：用户反馈、客服、体验走查、口碑维护。当产品有真实用户、需要处理反馈与售后时使用。
---

# 售后部（dept-aftersales）

> 本 skill 代表公司的一个部门。启用后，你即拥有按需"开设"该部门的能力：从下表实例化角色（Devin 子会话 / Claude Code subagent / 新会话），注入 CHARTER.md + 角色文件 + 任务与验收标准。所有角色先守章程 https://github.com/wookat/company-os/blob/main/CHARTER.md 。

## 部门构成

| 角色 | 用途 | 何时实例化 |
|---|---|---|
| operations/support-responder | 反馈分类、回复模板、FAQ | 上线即配 |
| legal-research/user-experience-officer | 以真实用户身份定期走查 | 每轮迭代 |
| operations/infra-maintainer | 事故响应、服务健康 | 常驻值守 |

## 部门规则
- 高频问题必须反哺产品：整理成需求提给产品策划部
- 事故分级响应：影响主流程的问题即时修复并汇报（SOP-04 重大风险类）
- 反馈周报：TOP 问题 + 建议，供 SOP-05 迭代排序

## 实例化模板

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/<路径>.md。
任务：<描述>；验收标准：<清单>。完成后按 SOP-04 格式汇报。
```
