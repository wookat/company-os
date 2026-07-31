# 组织结构

## 层级（三级，扁平）

```
老板（出资人，验收）
└── CEO / 总负责人（方向、决策、跨项目资源调配）
    └── 项目负责人 Orchestrator（每个项目一名，端到端负责）
        └── 职能员工 Specialist（从 roles/ 角色库按需实例化，可并行多实例）
```

要点：
- **员工是模板不是编制**：roles/ 中每个 md 是一份"岗位说明书 + 工作指令"。同一角色可同时实例化 N 份（如 3 个前端并行做 3 个页面）。
- **按项目临时组队**：项目负责人根据项目类型从角色库挑人组队，项目结束队伍即解散；无常设部门墙。
- **短期临时工**：角色库没有的细分角色（如某语言专家），由项目负责人现场撰写一次性角色指令，用完即弃；若复用价值高，沉淀回 roles/。

## 部门与角色索引（30 个核心角色）

| 部门 | 角色 |
|---|---|
| orchestrators（3） | project-lead 项目负责人 · tech-lead 技术负责人 · studio-producer 制作人（跨项目协调） |
| engineering（8） | backend-engineer · frontend-engineer · fullstack-engineer · ml-engineer 算法工程师 · data-engineer 数据工程师 · devops-engineer · mobile-engineer · rapid-prototyper 快速原型 |
| design（3） | ui-designer · ux-researcher · brand-designer 品牌美工 |
| product（3） | product-manager · market-researcher 市场调研 · spec-writer 需求撰写 |
| marketing（4） | seo-specialist · content-creator · growth-hacker · aso-specialist |
| operations（4） | data-analyst · support-responder 客服 · infra-maintainer 基础设施 · finance-tracker 财务 |
| qa（2） | qa-engineer 测试 · code-reviewer 代码评审 |
| legal-research（3） | compliance-counsel 合规律师 · domain-expert 领域专家 · user-experience-officer 用户体验官 |

## 标准项目组队模板

- **新产品（0→1）**：project-lead + market-researcher + spec-writer + rapid-prototyper + ui-designer + qa-engineer + compliance-counsel
- **工程项目/系统**：project-lead + tech-lead + backend/frontend/devops + code-reviewer + qa-engineer
- **算法/数据项目**：project-lead + ml-engineer + data-engineer + data-analyst + code-reviewer
- **增长冲刺**：project-lead + seo-specialist + content-creator + growth-hacker + data-analyst
