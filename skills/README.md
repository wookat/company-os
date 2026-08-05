# 部门级 Skills

把公司按 **4 个尺度（scale）** 组织，每个尺度都是可独立复用的指令单元：

```
Scale 1  角色 Role         roles/*.md          一个员工（最小单元，可并行 N 实例）
Scale 2  小队 Squad        org/STRUCTURE.md    按项目临时组队（组队模板）
Scale 3  部门 Department   skills/dept-*/      一个部门 = 一个 SKILL.md（本目录）
Scale 4  公司 Company      CHARTER + sops/     章程与流程（全局前置）
```

## 9 个部门 skill

| skill | 部门 | 覆盖角色 |
|---|---|---|
| dept-management | 经营管理部 | project-lead · studio-producer · finance-tracker |
| dept-product-planning | 产品策划部 | market-researcher · product-manager · spec-writer · domain-expert |
| dept-design | 设计部 | ux-researcher · ui-designer · brand-designer |
| dept-engineering | 开发部 | tech-lead · 前后端/全栈/移动端/原型/DevOps |
| dept-algorithm-data | 算法数据部 | ml-engineer · data-engineer（蜂群）· data-analyst |
| dept-growth-ops | 运营增长部 | SEO · 内容 · 增长 · ASO · 数据复盘 |
| dept-aftersales | 售后部 | support-responder · 体验官 · infra-maintainer |
| dept-qa-audit | 质量审计部 | qa-engineer · code-reviewer · compliance-counsel · 体验官 |
| dept-research | 科研部 | PI · 实验科学家 · 统计/敌意审稿 · 论文一作 · 投稿策略 |

每个 SKILL.md 遵循 Agent Skills 规范（frontmatter `name`+`description`），内含：部门角色表（何时实例化谁）、部门规则、实例化模板。

## 安装

- **Devin**：项目仓库放入 `.agents/skills/dept-*/SKILL.md` 自动被发现；或让负责人直接阅读本目录
- **Claude Code**：`bash adapters/install.sh skills` → 装入 `~/.claude/skills/`
- **Codex**：skill 内容可直接并入 AGENTS.md（`adapters/install.sh codex` 指定 skill 路径同理）

## 设计理由

- **按需开设部门**：一个项目装哪些部门 skill，就等于公司为它开通哪些部门——小项目只装 engineering + qa-audit，完整产品装全部 9 个。
- **skill 是"部门开办手册"而非角色本体**：角色仍在 roles/ 单一来源维护，skill 只做引用与部门规则，避免内容重复漂移。
- **description 驱动自动触发**：平台会按任务语义自动激活对应部门 skill（如提到"上线获客"自动触发 dept-growth-ops）。
