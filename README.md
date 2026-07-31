# Company OS

AI 公司操作系统：把「老板 → CEO → 项目负责人 → 职能员工」的组织结构与协作机制，落地为可在 **Devin / Claude Code / Codex** 三个平台复用的指令化角色体系。

## 仓库结构

```
company-os/
├── CHARTER.md            # 公司章程：权责、协作机制、汇报与验收制度（所有角色的公共前置指令）
├── org/
│   └── STRUCTURE.md      # 组织结构：层级、部门、组队方式
├── roles/                # 角色库（每个角色一个 md，带 frontmatter 元数据）
│   ├── orchestrators/    # 负责人层：项目负责人、技术负责人、制作人
│   ├── engineering/      # 工程：后端、前端、全栈、算法、数据、DevOps、移动端、快速原型
│   ├── design/           # 设计：UI、UX 研究、品牌视觉
│   ├── product/          # 产品：产品经理、调研分析、需求撰写
│   ├── marketing/        # 增长：SEO、内容、增长、ASO
│   ├── operations/       # 运营：数据分析、客服、基础设施、财务
│   ├── qa/               # 质量：测试工程师、代码评审
│   └── legal-research/   # 法务与专项调研：合规律师、市场调研、领域专家
├── sops/                 # 标准作业流程
│   ├── SOP-01-project-lifecycle.md   # 项目全生命周期（需求→spec→计划→实现→评审→交付）
│   ├── SOP-02-research.md            # 调研 SOP
│   ├── SOP-03-launch.md              # 上线/发布 SOP
│   └── SOP-04-reporting.md           # 汇报与验收 SOP
└── adapters/             # 平台适配
    ├── devin.md          # 在 Devin 中使用（playbook / knowledge / 子会话）
    ├── claude-code.md    # 挂载到 ~/.claude/agents/
    ├── codex.md          # 生成 AGENTS.md
    └── install.sh        # 一键安装脚本（Claude Code / Codex）
```

## 核心理念

1. **员工 = 指令模板**：每个角色是一个平台无关的 markdown 文件，可同时实例化多份（并行开工），按需弹性扩张，不预先"养人"。
2. **扁平组队**：负责人（orchestrator）+ 专家池，按项目临时组队，不搞深层级。
3. **章程先行**：`CHARTER.md` 是所有角色的公共前置指令，规定授权自主推进、主动汇报不等回复、老板验收制。
4. **SOP 驱动**：每个项目负责人强制走 `sops/` 定义的标准流程。

## 快速使用

- **Devin**：见 `adapters/devin.md`（父会话=项目负责人，子会话=职能员工）
- **Claude Code**：`bash adapters/install.sh claude`（角色装入 `~/.claude/agents/company-os/`）
- **Codex**：`bash adapters/install.sh codex <项目目录>`（生成/追加 AGENTS.md）
