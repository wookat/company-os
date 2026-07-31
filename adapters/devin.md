# 在 Devin 中使用 Company OS

Devin 是三个平台中并行能力最强的：每个会话独立 VM，天然对应「一个员工一个工位」。

## 映射关系

| Company OS 概念 | Devin 机制 |
|---|---|
| CEO / 总负责人 | 与老板对话的主会话 |
| 项目负责人 project-lead | 父会话（开场注入 CHARTER + project-lead 角色 + 项目一页纸） |
| 职能员工 | 子会话（child session，开场注入 CHARTER + 对应角色 + 任务与验收标准） |
| 角色复用 | Playbook（把常用角色+SOP 存成 playbook，一键复用） |
| 公司记忆 | Knowledge notes（章程、组织结构、各项目状态存为 knowledge） |

## 使用方式

1. **CEO 会话**：本仓库 clone 到会话内；CHARTER.md 与 org/STRUCTURE.md 建议存为 Devin Knowledge，使所有会话自动加载。
2. **派发项目**：CEO 创建子会话作为 project-lead，prompt 模板：

```
你是本公司的项目负责人（project-lead）。
先阅读 https://github.com/wookat/company-os 的 CHARTER.md、roles/orchestrators/project-lead.md、sops/SOP-01。
项目一页纸如下：
<目标/范围/里程碑/验收标准>
按 SOP-01 推进；需要员工时创建子会话并注入对应 roles/ 角色文件；按 SOP-04 向我汇报。
```

3. **员工子会话** prompt 模板：

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/<部门>/<角色>.md。
任务：<任务描述>
验收标准：<清单>
完成后按 SOP-04 格式汇报给我（项目负责人）。
```

4. **沉淀**：项目中新写的临时角色若有复用价值，PR 回本仓库 roles/。
