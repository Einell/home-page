# Qiaomu Home 需求驱动组件扩展目标

日期：2026-09-27。状态：目标已启动；首批研究、实现与隔离库验收已完成。

## 推荐执行版（中文，可直接复制）

/goal 基于真实用户需求扩展 Qiaomu Home：先核验当前项目和已有模块，再研究 Chrome 新标签页扩展及 Obsidian 用户讨论，产出至少 30 个不重复、可追溯的组件方案与优先级路线图，并完成首批 3 个高价值组件的实现和验证。
验证：每个方案包含用户场景、痛点、来源链接、证据类型、最小功能、首页适配原因、现有能力重叠、依赖、隐私与维护成本、优先级和验收标准。区分直接用户诉求与产品能力推断，不虚构需求热度。以需求证据、高频价值、首页适配度和实现成本评分。运行 npm run check（lint、test、build，其中 build 包含类型检查）；在可用的本地 Obsidian 测试环境验证组件添加、移除、排序、重载持久化、核心交互、空状态、窄屏和键盘访问，保存证据，明确未验证项。
约束：保留已有未提交改动及用户数据，复用已有模块库、配置与原生能力；组件按需启用，避免首页拥挤；使用现有风格及 Lucide 图标，保留克制的键盘焦点。不引入付费服务、账号、笔记云端上传或未经授权的发布，不自动操作微信及其内嵌页面。
边界：仅修改当前 qiaomu-home 仓库内相关实现、测试、研究与验收文档，以及必要的隔离测试产物。不得覆盖真实 vault 笔记、插件配置或修改无关个人 skill。
迭代策略：研究先行，先检查已存在和正在开发的功能，形成至少 30 项需求矩阵再选首批 3 项；一次完成一个组件并验证；单个问题最多进行 3 轮基于新证据的修复，记录剩余风险并推进独立工作。
完成条件：需求矩阵、评分、路线图落盘；首批 3 个组件可用且项目检查通过；验收报告明确实际运行证据与未覆盖的平台或环境。不将方案数当成实现数，不将构建通过当作实机验证。
暂停条件：需要新凭证、付费、破坏性数据迁移或外部发布时请求用户决定，继续独立可做事项；持续阻塞按目标工具的状态规则处理，不擅自标记完成。

默认选择理由：30 项是研究候选池，首批 3 项验证真实价值与架构适配，避免一次堆入大量未经验证的首页模块。

## Goal Draft (English-compatible)

/goal Expand Qiaomu Home from real user needs: inspect the current project and existing modules, research Chrome new-tab extensions and Obsidian user discussions, deliver at least 30 distinct and traceable component proposals with a ranked roadmap, and implement and verify the first 3 high-value components.
Verification: document each proposal's user scenario, pain point, source URL, evidence type, minimum functionality, homepage fit, overlap, dependencies, privacy and maintenance cost, priority, and acceptance criteria. Distinguish direct user requests from inferences based on product features; do not invent popularity. Rank by evidence, frequency of use, homepage fit, and implementation cost. Run npm run check (lint, test, build including type checking). In an available local Obsidian test environment, verify adding, removing, ordering, persistence after reload, core interactions, empty states, narrow layouts, and keyboard access. Save evidence and identify unverified checks.
Constraints: preserve existing uncommitted changes and user data; reuse the module library, settings, and native capabilities. Keep modules opt-in and the homepage uncluttered. Follow existing styling and Lucide icons with restrained keyboard focus. Do not introduce paid services, accounts, cloud note uploads, unauthorized publication, or UI automation of WeChat or its embedded pages.
Boundaries: edit only related implementation, tests, research and verification documents in the current qiaomu-home repository and necessary isolated test artifacts. Do not overwrite real vault notes or plugin settings or change unrelated personal skills.
Iteration policy: research first, inspect existing and in-progress functionality, produce the 30-item matrix, then select the first 3 components. Implement and verify one component at a time. Make at most 3 evidence-led repair rounds per issue, document remaining risks, and continue independent work.
Stop when: the demand matrix, scoring and roadmap are saved, the first 3 components work and project checks pass, and the verification report identifies real runtime evidence and unverified platforms or environments. Do not equate proposal count with implemented components or a passing build with host verification.
Pause if: new credentials, payments, destructive data migrations or external publication require a user decision; continue independent work. Follow goal-tool status rules for persistent blockers and never claim premature completion.

## 启动记录

- 当前工作区已有未提交变更，涉及模块库、设置、待办、新手插件组件等；后续开发必须保留并识别重叠。
- 当前 package.json 版本 0.3.1；检查入口为 npm run check。
- Nowledge 定向线程搜索已尝试；本地 127.0.0.1:14242 拒绝连接，未获得历史搜索结果。
- 已交付：38 项需求证据矩阵、首页适配评分与路线图、3 个可选组件、隔离库验收报告；未执行外部发布。
