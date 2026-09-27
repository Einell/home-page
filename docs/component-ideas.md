# Home 组件灵感与建议

调研日期：2026-09-26。以下为产品提案，本轮没有开发这些组件。

## 浏览器新标签页工具：借鉴什么

| 工具 | 已核对的功能 | 对 Home 的启发 |
| --- | --- | --- |
| [iTab（官方商店页面）](https://chromewebstore.google.com/detail/itab%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/mhloojimgilafopcmlcikiidgbbnelip) | 组件、日历、备忘录、倒计时、网站分组 | 组件按用途选，不要求新用户从空白画布配置；每个组件先有可用默认值。 |
| [Momentum](https://www.momentumdash.com/) | Daily Goal、Todo、番茄钟、声音场景、倒计时 | 把今日最重要的一件事和专注计时连起来，减少开始行动的步骤。 |
| [Tabliss](https://tabliss.io/) | 可配置小组件、时间、Todo、快捷链接、天气、背景 | 小组件可独立取舍，保持安静的首页；主页应快速可用。 |
| [Infinity New Tab（官方商店页面）](https://chromewebstore.google.com/detail/infinity-new-tab/dbfmnekepjoapopniengjbcpnbljalfg) | 网站入口、Todo、便签、天气和历史管理 | 常用入口的价值来自就近访问和容易整理，不需要复杂层级。 |

右列是针对 Home 的设计判断，不是这些产品的官方建议。iTab 官网抓取超时，使用其官方 Chrome 商店描述核对功能；不依据下载量或宣传语排序。

## 推荐组件

### 1. 小日历：优先做

用途是「找到那天的日记」。紧凑月历，今天高亮，有日记的日期显示一个点；点击已有日期打开日记，空白日期明确提供创建操作，沿用用户的目录、日期格式和模板。提供回到今天；第一版不显示字数和连续打卡。

它与今日待办互补：待办负责行动，日历负责找回时间上下文。已装 Calendar 时可借用其配置或打开原插件，但首页自己的基础日记导航不强依赖社区插件。装了 Periodic Notes 后，可扩展周记/月记入口。是否有可靠公开接口需实施前核对，不承诺直接搬用插件内部组件。

依据：[Obsidian 日记](https://obsidian.md/help/plugins/daily-notes)、[Calendar](https://github.com/liamcain/obsidian-calendar-plugin)、[Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes)。Calendar 已提供日记导航；Periodic Notes 提供周记/月记能力。

### 2. 置顶笔记 / 笔记片段：优先做

选一个笔记或标题下的片段，在主页展示内容；适合本周目标、项目下一步、常用清单。点击进入原笔记编辑，内容始终只有原笔记一份，删除组件不删正文。第一版以只读展示和打开原文为主，避免引入第二个编辑器。

它补齐现有快捷方式：快捷方式用于进入，片段用于直接看到内容。实现前需核对 Obsidian 原生 Markdown 渲染、内链和嵌入资源的生命周期，限制长文高度和昂贵嵌入。

### 3. 专注计时：下一批

从今日待办选择一项，开始 25 分钟或自定时长；暂停/结束即可。切页签仍继续，关闭应用后按时间戳恢复而不依赖每秒写盘。是否记录专注日志由用户选择。可与乔木电台搭配，但不自动播放。

灵感来自 [Momentum 的 Pomodoro 和 Focus Mode](https://www.momentumdash.com/)。这是 Home 的拟议交互，不是已实现的集成。

### 4. 工作区入口：下一批，成本相对可控

列出用户保存的「写作 / 阅读 / 研究」布局，一次恢复相关笔记和侧栏。Home 页签管理首页卡片，Obsidian 工作区恢复应用布局，两者在文案上明确区分，避免又造一套同名页签系统。

依据：[内置 Workspaces](https://obsidian.md/help/plugins/workspaces)。它保存打开文件、页签和侧栏布局。若读取布局缺少稳定 API，先通过已有命令进入原生选择器。

### 5. 旧笔记重访：适合阅读页

每天一张旧笔记摘要，用户可限定文件夹并排除 Inbox/模板。当天保持稳定，提供换一篇和打开原文。以后再尝试「去年今日」或最近未复习的笔记；日期优先读明确属性，不能假定所有文件创建时间都是真正记录日期。

灵感来自 [内置 Random note](https://obsidian.md/help/plugins/random-note)。建议展示用户自己的内容。

### 6. 项目列表：后续评估

基于已保存的 Bases 视图或 Dataview 查询，展示三个进行中的项目及下一步。用户沿用原数据和筛选条件；第一版只读摘要，打开原视图继续操作。

依据：[Bases](https://obsidian.md/help/bases) 将视图建立在本地 Markdown 与属性之上；[Dataview](https://blacksmithgu.github.io/obsidian-dataview/) 提供查询能力。官方支持自定义 Bases 视图不等于可以稳定地在任何第三方卡片里嵌入全部视图，需要先验证宿主接口和性能。

### 7. 今日复习：有学习需求时添加

已安装 Spaced Repetition 时，展示待复习入口，支持可靠公开数据接口时再显示准确数量；没有接口则显示「开始复习」，不要估算一个看似精确的数。

依据：[Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) 支持卡片和整篇笔记复习。

### 8. 模板动作：优先复用现有入口

会议记录、读书笔记、项目笔记等高频模板可接入新建菜单或快捷动作。已有命令能完成的先直接调用，不必先新增一张卡片。

依据：[Templater](https://silentvoid13.github.io/Templater/) 与 [QuickAdd](https://quickadd.obsidian.guide/)。适配时展示用户已有模板和动作，执行前明确目标位置。

## 推荐下一步

先选 **小日历 + 置顶笔记片段**。二者让主页同时具备日期导航和内容展示，能补充现有代办、最近笔记、Reader、RSS 和快捷入口。专注计时作为下一轮候选。

天气、热搜、行情、通用每日名言暂排后面：外部服务依赖和维护成本较高，与用户笔记的关联较弱。每页初始保持约 2–4 个组件，按需要添加，避免默认铺满。
