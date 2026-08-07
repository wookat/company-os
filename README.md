# Company OS

<p align="center">
  <b>把 AI 编码代理（Devin / Claude Code / Codex）组织成一家可自主运转的「AI 公司」</b><br>
  <i>Run your AI coding agents as an autonomous software company: charter, roles, SOPs, cross-platform adapters.</i>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/roles-30-brightgreen.svg" alt="30 roles">
  <img src="https://img.shields.io/badge/SOPs-9-orange.svg" alt="9 SOPs">
  <img src="https://img.shields.io/badge/platforms-Devin%20%7C%20Claude%20Code%20%7C%20Codex-8A2BE2.svg" alt="platforms">
  <a href="https://github.com/wookat/company-os/pulls"><img src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg" alt="PRs welcome"></a>
</p>

---

## 这是什么？

Company OS 是一套**平台无关的指令化组织体系**：用 markdown 定义公司章程（CHARTER）、组织结构、36 个职能角色（指令化员工）和 9 套标准作业流程（SOP），让 AI 代理像一家真实公司一样运转——

- **老板只做两件事**：下需求、做验收。中间全程由 AI 自主闭环推进（授权自主推进、默认即批准、资源缺口不阻塞）。
- **员工 = 指令模板**：同一角色可并行实例化 N 份（蜂群模式），按需弹性扩张。
- **SOP 驱动**：深度调研 → 方案设计 → 最小骨架 → 实现 → 四道把关（QA/体验官/交叉测试/审计）→ 竞品对标验收。
- **一份定义，三平台通用**：Devin（子会话并行）、Claude Code（subagents）、Codex（AGENTS.md）。
- **四个尺度可组合**：角色 → 小队 → 部门（[skills/](skills/)，9 个部门级 SKILL）→ 公司；装哪些部门 skill 就等于为项目开通哪些部门。

## 🚀 一键启动

### Devin —— 创建一个「项目负责人」

新建 Devin 会话，粘贴这段「上任指令」（先上任，需求后聊）：

```text
你是本公司的项目负责人（project-lead）。
先阅读 https://github.com/wookat/company-os 的 CHARTER.md、roles/orchestrators/project-lead.md 和 sops/ 全部流程，并严格遵守。
项目尚未确定。你现在的状态是「待命」：我（老板/CEO）接下来会和你交流讨论需求。
在需求商定之前不要开工；商定后你自己整理出「项目一页纸」（目标/范围/里程碑/验收标准）发我确认，
我说可以（或不回复）后即进入授权自主推进模式，按 SOP-01 执行、按 SOP-04 汇报。
```

需求已明确时，直接用带「项目一页纸」的完整模板：见 [adapters/devin.md](adapters/devin.md)。

### Claude Code —— 安装全部 36 个角色为 subagents

```bash
git clone https://github.com/wookat/company-os.git
cd company-os && bash adapters/install.sh claude
bash adapters/install.sh skills   # 可选：再装 9 个部门级 skill 到 ~/.claude/skills/
# 重启 Claude Code，/agents 查看；使用：
claude "use @agent-project-lead and 启动 XX 项目，按 SOP-01 推进"
```

### Codex —— 注入角色到项目 AGENTS.md

```bash
git clone https://github.com/wookat/company-os.git
cd company-os && bash adapters/install.sh codex <你的项目目录> [角色路径]
# 例：bash adapters/install.sh codex ~/repos/myapp engineering/backend-engineer
```

## 📁 仓库结构

```
company-os/
├── CHARTER.md            # 公司章程：权责、协作机制、开发原则、验收标准（所有角色的公共前置指令）
├── org/                  # STRUCTURE.md 组织结构 · PROJECTS.md 项目登记簿
├── roles/                # 36 个指令化员工（9 个部门）
│   ├── orchestrators/    # project-lead · tech-lead · studio-producer
│   ├── engineering/      # 后端/前端/全栈/算法/数据/DevOps/移动端/快速原型
│   ├── design/           # UI 设计 · UX 研究 · 品牌美工
│   ├── product/          # 产品经理 · 市场调研 · 需求撰写
│   ├── marketing/        # SEO · 内容 · 增长 · ASO
│   ├── operations/       # 数据分析 · 客服 · 基础设施 · 财务
│   ├── qa/               # 测试工程师 · 代码评审
│   ├── legal-research/   # 合规律师 · 领域专家 · 用户体验官
│   └── research/         # 课题组负责人 · 实验科学家 · 统计审稿人 · 敌意审稿人 · 论文一作 · 投稿策略师
├── docs/                 # ENGINEERING.md 工程惯例手册（默认技术栈/部署运维/质量验证/数据工程/工具与捷径）
├── sops/                 # SOP-01 全生命周期 · 02 调研 · 03 上线 · 04 汇报验收 · 05 运营迭代 · 06 科研论文 · 07 游戏生产 · 08 降级上线 · 09 复刻竞品与技术反推
├── skills/               # 9 个部门级 SKILL.md（Agent Skills 规范，按需"开设部门"）
├── templates/            # 项目一页纸 · 验收包 · 外部资源申请单
└── adapters/             # devin.md · claude-code.md · codex.md · install.sh
```

## 💡 核心设计

| 原则 | 含义 |
|---|---|
| 授权自主推进 | 项目确认后不等待批准，任何角色不得因"等回复"暂停 |
| 默认即批准 | 汇报后无反馈 = 默认认可，继续按最优判断执行 |
| 开发全闭环 | 调研、设计、开发、测试、体验、审计全部内部完成，不依赖老板输入 |
| 资源缺口不阻塞 | 支付/API key 等立项时一次性申请；缺口处桩/沙箱先行，到位后替换 |
| 蜂群并行 | 可大规模并行的工作（数据抓取、批量内容）开 20+ 实例同时干 |
| 竞品对标验收 | 达到或超越同类竞品才有资格提交验收，不做 demo/MVP 堆砌 |

## 🤝 参与贡献

- 新角色：在 `roles/<部门>/` 添加 md（frontmatter 含 name/title/department/description），PR 提交
- 新 SOP / 平台适配：欢迎 issue 讨论后 PR
- 指令优先级：老板最新指示 > CHARTER > 角色定义 > SOP

## 致谢

设计上参考了 [contains-studio/agents](https://github.com/contains-studio/agents)、[vijaythecoder/awesome-claude-agents](https://github.com/vijaythecoder/awesome-claude-agents)、[obra/superpowers](https://github.com/obra/superpowers)、[wshobson/agents](https://github.com/wshobson/agents)、[MetaGPT](https://github.com/FoundationAgents/MetaGPT)、[ChatDev](https://github.com/OpenBMB/ChatDev) 等优秀项目。

## License

[MIT](LICENSE)
