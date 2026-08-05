---
name: dept-algorithm-data
description: 算法与数据部门：模型、LLM 应用、数据采集/挖掘/分析。当项目涉及算法、模型、数据管道或大规模数据采集时使用。
---

# 算法数据部（dept-algorithm-data）

> 本 skill 代表公司的一个部门。启用后，你即拥有按需"开设"该部门的能力：从下表实例化角色（Devin 子会话 / Claude Code subagent / 新会话），注入 CHARTER.md + 角色文件 + 任务与验收标准。所有角色先守章程 https://github.com/wookat/company-os/blob/main/CHARTER.md 。

## 部门构成

| 角色 | 用途 | 何时实例化 |
|---|---|---|
| engineering/ml-engineer | 模型/LLM 应用/评估基准 | 算法项目核心 |
| engineering/data-engineer | 采集、清洗、ETL 管道 | 数据项目核心，可蜂群并行 |
| operations/data-analyst | 指标体系、业务分析 | 上线后常驻 |

## 部门规则
- **蜂群模式**：大规模采集/挖掘任务拆分片区，组织 20+ 个 data-engineer 实例并行（CHARTER §6 效率优先）；由 1 个协调实例汇总去重
- 一切结论有实验数据支撑；防泄漏（时间切分/embargo）；实验参数与结果落盘
- 采集遵守目标站点条款；限速、幂等、可断点续传

## 实例化模板

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/<路径>.md。
任务：<描述>；验收标准：<清单>。完成后按 SOP-04 格式汇报。
```
