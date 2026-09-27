# Qiaomu Home 组件需求与首页适配研究

调研日期：2026-09-27。候选池 38 项；“候选”不代表承诺全部开发，也不代表来源证明市场规模。

## 首页适配硬门槛

一个组件必须在 Home 上提供一眼可判读的状态或 1–2 步高频动作；默认隐藏新模块；卡片可限定在 3–6 行且不会挤走今日日记/待办。需要多步骤编辑、全库扫描或持续通知的功能应打开专用视图或借助已有插件。适配分 1–2 的项目不进入首批开发。已有功能标“复用/增强”，不得重复造一份数据。

评分：证据 E：论坛明确诉求=5，论坛实际工作流=4，官方/产品能力推断=2；首页适配 H、使用频次 F、实现容易度 C 各 1–5。总分=2E+3H+2F+C；高重叠不代表高优先级。直=论坛直接请求，推=从论坛工作流推断，产品=竞品展示的能力，不能当作真实需求统计。

## 证据来源

- [D1](https://forum.obsidian.md/t/add-or-create-todays-daily-note-for-display-on-a-canvas-dashboard/55715)
- [D2](https://forum.obsidian.md/t/script-to-update-daily-note-embeded-on-canvas/61180)
- [M1](https://forum.obsidian.md/t/dataview-list-of-25-most-recently-modified-files-in-vault/23771)
- [R1](https://forum.obsidian.md/t/enable-customization-for-the-random-note-feature/38274)
- [R2](https://forum.obsidian.md/t/enhancement-for-random-notes-core-plugin-restricted-to-a-certain-folder-or-tabr/37666)
- [C1](https://forum.obsidian.md/t/quick-add-workflow-into-daily-notes-using-quickadd-advanced-uri-and-shortcuts-ios-and-macos/74664)
- [C2](https://forum.obsidian.md/t/dashboard-and-workflow-for-obsidian-at-work-sales/34794)
- [T1](https://forum.obsidian.md/t/gtd-for-daily-notes/78727)
- [T2](https://forum.obsidian.md/t/simple-task-management-workflow-w-o-daily-notes/35118)
- [P1](https://forum.obsidian.md/t/building-an-automated-project-dashboard-can-this-be-done/12671)
- [P2](https://forum.obsidian.md/t/link-that-generates-templated-note/56990)
- [H1](https://forum.obsidian.md/t/achieving-habit-tracker-with-obsidian/78290)
- [F1](https://forum.obsidian.md/t/pomodoro-plugin/1968)
- [F2](https://forum.obsidian.md/t/pomodoro-timer-integration-with-obsidian-and-process-that-timing-data-is-that-possible/78365)
- [L1](https://forum.obsidian.md/t/script-find-orphaned-links-linking-to-no-existing-note/6976)
- [B1](https://forum.obsidian.md/t/my-visual-book-tracking-moc-dataviewjs-css/115541)
- [Q1](https://forum.obsidian.md/t/noria-connecting-notes-projects-tasks-and-reviews-in-obsidian/118107)
- [Tab](https://tabliss.io/)
- [Bon](https://bonjourr.fr/)
- [Mom](https://get.momentumdash.help/hc/en-us/articles/115007780748-How-Momentum-works)
- [Inf](https://www.infinitytab.com/)
- [Night](https://github.com/zombieFox/nightTab)
- [AD](https://community.obsidian.md/plugins/cool-dashboard)
- [WS](https://forum.obsidian.md/t/possible-to-automate-pane-opening/58255)
- [SQ](https://forum.obsidian.md/t/is-it-possible-to-set-up-default-filters-that-will-be-applied-to-every-search-automatically/56823)
- [RSS](https://forum.obsidian.md/t/feedle-inline-rss-feeds-for-obsidian/113061)
- [RAD](https://github.com/joeseesun/qiaomu-radio)
- [AG](https://github.com/joeseesun/qiaomu-agent)

## 38 项候选矩阵

|序号/组件|用户场景与痛点|首页最小形态与理由|来源/类型|适配 H · 频次 F · 易实现 C · 总分|现有重叠|依赖/隐私/维护|验收|
|---|---|---|---|---|---|---|---|
|01 今日日记正文|日记使用者回到首页却看不到今日内容|只读摘录与打开/创建今日笔记；首屏能直接判断/行动|[D1](https://forum.obsidian.md/t/add-or-create-todays-daily-note-for-display-on-a-canvas-dashboard/55715) / 直|5 · 5 · 3 · **38**|顶部已有今日入口；正文未有|原生日记；本地；中|日期切换和修改后更新，空日记能创建|
|02 最近修改|写作者想接续最近实际编辑的内容|按 mtime 排列并一键打开；首屏能直接判断/行动|[M1](https://forum.obsidian.md/t/dataview-list-of-25-most-recently-modified-files-in-vault/23771) / 直|5 · 5 · 5 · **40**|已有最近打开，语义不同|Vault 文件统计；本地；低|显示最近编辑且无文件时有空态|
|03 限定范围随机回顾|复习者随机命中模板或无关笔记|指定文件夹后抽取一篇笔记；首屏能直接判断/行动|[R1](https://forum.obsidian.md/t/enable-customization-for-the-random-note-feature/38274) / 直|5 · 4 · 3 · **36**|现有搜索不同；随机笔记插件|Vault 列表；本地；低|仅从指定范围抽样，空范围说明原因|
|04 收件箱待处理|随手记录后忘记回看|展示目标 Inbox 最近几条并打开；首屏能直接判断/行动|[Q1](https://forum.obsidian.md/t/noria-connecting-notes-projects-tasks-and-reviews-in-obsidian/118107) / 产品|5 · 5 · 3 · **32**|现有快速记录仅写入|Vault 文件；本地；中|添加后立即可见且不误改原文|
|05 项目下一步|项目笔记多却不知道当前行动|从指定项目笔记取未完成的下一项；首屏能直接判断/行动|[P1](https://forum.obsidian.md/t/building-an-automated-project-dashboard-can-this-be-done/12671) / 直|5 · 4 · 2 · **35**|已有待办只针对当前任务笔记|Markdown 解析；本地；中|来源链接准确，勾选写回原文件|
|06 今日期限任务|任务散在不同日记与项目中|汇总今日到期条目并打开来源；首屏能直接判断/行动|[T1](https://forum.obsidian.md/t/gtd-for-daily-notes/78727) / 直|5 · 5 · 2 · **37**|已有待办无全库期限索引|日期语义；本地；高|不把无日期任务误列今日|
|07 逾期任务|跨日遗留不易发现|列出已过期且未完成任务；首屏能直接判断/行动|[T1](https://forum.obsidian.md/t/gtd-for-daily-notes/78727) / 推|5 · 4 · 2 · **33**|已有自动结转不同|日期语义；本地；高|准确区分逾期和完成|
|08 今日主目标|打开 Home 容易被多个入口分心|显示/更改一个今日重点；首屏能直接判断/行动|[Mom](https://get.momentumdash.help/hc/en-us/articles/115007780748-How-Momentum-works) / 产品|5 · 5 · 4 · **33**|已有任务列表，单一重点仍不同|本地设置；本地；低|每天可更新并在所有 Home 标签同步|
|09 当前工作集|回来后不记得上次一起开的资料|恢复一组笔记入口；首屏能直接判断/行动|[WS](https://forum.obsidian.md/t/possible-to-automate-pane-opening/58255) / 推|4 · 4 · 2 · **30**|最近打开只能单项|工作区状态；本地；中|一键打开该组，避免重复 leaf|
|10 置顶笔记|常用项目笔记难快速定位|固定 1–6 篇笔记；首屏能直接判断/行动|[Inf](https://www.infinitytab.com/) / 产品|4 · 5 · 4 · **30**|快捷方式已支持笔记，重叠高|已有快捷方式；本地；低|优先改快捷方式而不另造模块|
|11 常用文件夹|进入固定目录需要多次导航|一键打开文件夹；首屏能直接判断/行动|[Inf](https://www.infinitytab.com/) / 产品|4 · 4 · 4 · **28**|快捷方式已有|已有快捷方式；本地；低|复用快捷方式类型|
|12 今日时间轴|今日笔记碎片缺少时间脉络|展示今日带时间戳段落；首屏能直接判断/行动|[C2](https://forum.obsidian.md/t/dashboard-and-workflow-for-obsidian-at-work-sales/34794) / 推|4 · 4 · 2 · **30**|日记预览可部分覆盖|Markdown 解析；本地；中|只呈现有效时间戳并回跳|
|13 每周回顾入口|周末回顾时找不到对应周记|展示本周周记及待复盘事项；首屏能直接判断/行动|[P2](https://forum.obsidian.md/t/link-that-generates-templated-note/56990) / 直|4 · 2 · 3 · **29**|周期笔记插件可能已有|Periodic Notes 可选；本地；中|遵从插件路径和模板|
|14 日记日历条|想快速回看前几天记录|近 7 日可点日期条；首屏能直接判断/行动|[D2](https://forum.obsidian.md/t/script-to-update-daily-note-embeded-on-canvas/61180) / 推|4 · 5 · 3 · **33**|Calendar 插件已有日历|日记配置；本地；中|日期与配置格式一致，缺日记明示|
|15 习惯今日打卡|已有日记属性但首页看不到今天状态|显示 1–3 项习惯状态；首屏能直接判断/行动|[H1](https://forum.obsidian.md/t/achieving-habit-tracker-with-obsidian/78290) / 直|4 · 4 · 2 · **32**|Habits 专业插件重叠|日记属性；本地；高|仅写选定属性，跨日刷新|
|16 目标进度|学习目标进度分散|显示一个目标笔记的完成比；首屏能直接判断/行动|[H1](https://forum.obsidian.md/t/achieving-habit-tracker-with-obsidian/78290) / 直|4 · 3 · 2 · **30**|已有图表/习惯插件|用户定义字段；本地；高|分母/分子来源可追踪|
|17 专注计时|写作时要切出工具计时|25 分钟开始/暂停/结束；首屏能直接判断/行动|[F1](https://forum.obsidian.md/t/pomodoro-plugin/1968) / 直|4 · 4 · 3 · **33**|Pomodoro 插件较成熟|本地计时；本地；中|切页不丢时长，关闭行为明确|
|18 专注记录|希望计时与日记/项目关联|结束后写入选定日记；可能不适合首屏，需按需启用|[F2](https://forum.obsidian.md/t/pomodoro-timer-integration-with-obsidian-and-process-that-timing-data-is-that-possible/78365) / 直|3 · 3 · 2 · **27**|番茄钟插件可能支持|日记写入；本地；中|用户确认写入目标与时长|
|19 工作时段|忘记今天是否已到休息时间|只展示当前工作时段；可能不适合首屏，需按需启用|[Tab](https://tabliss.io/) / 产品|3 · 3 · 4 · **23**|时钟已在页首|本地时间；本地；低|不常驻抢占笔记位置|
|20 倒计时|重要期限容易忘|展示一个截止日与剩余日；首屏能直接判断/行动|[Mom](https://get.momentumdash.help/hc/en-us/articles/115007780748-How-Momentum-works) / 产品|4 · 3 · 4 · **26**|已有待办无日历天数|本地设置；本地；低|跨时区日期正确|
|21 近期里程碑|项目多个关键日期需可见|按日期列 3 个里程碑；首屏能直接判断/行动|[Mom](https://get.momentumdash.help/hc/en-us/articles/115007780748-How-Momentum-works) / 推|4 · 3 · 2 · **28**|倒计时/任务重叠|日期属性；本地；中|来源可打开、过期状态正确|
|22 未链接笔记|积累笔记后忘了整理孤岛|显示少量孤立笔记并打开；可能不适合首屏，需按需启用|[L1](https://forum.obsidian.md/t/script-find-orphaned-links-linking-to-no-existing-note/6976) / 直|3 · 2 · 2 · **25**|专用审计插件已有|MetadataCache；本地；高|扫描成本可控，忽略模板|
|23 失效内部链接|旧项目链接指向不存在内容|显示修复入口及数量；可能不适合首屏，需按需启用|[L1](https://forum.obsidian.md/t/script-find-orphaned-links-linking-to-no-existing-note/6976) / 直|3 · 2 · 2 · **25**|专用审计插件已有|MetadataCache；本地；高|仅展示证实失效的链接|
|24 标签热区|按主题回到最近工作|显示最近使用的标签；可能不适合首屏，需按需启用|[P1](https://forum.obsidian.md/t/building-an-automated-project-dashboard-can-this-be-done/12671) / 推|3 · 3 · 2 · **25**|原生搜索/Dataview 已可用|MetadataCache；本地；中|标签点击进入搜索|
|25 智能搜索预设|重复输入相同限定查询|保存 1–3 个查询入口；首屏能直接判断/行动|[SQ](https://forum.obsidian.md/t/is-it-possible-to-set-up-default-filters-that-will-be-applied-to-every-search-automatically/56823) / 直|4 · 4 · 3 · **33**|已有搜索，预设尚无|Obsidian 搜索；本地；中|保留查询范围并可编辑|
|26 模板速建|反复创建同类笔记步骤多|列 1–3 个模板生成入口；首屏能直接判断/行动|[P2](https://forum.obsidian.md/t/link-that-generates-templated-note/56990) / 直|4 · 4 · 2 · **32**|已有创建动作和模板插件|Templates/Templater 可选；本地；中|复用原生命令并确认目标|
|27 阅读进度|返回首页后找不到正在读的书|显示当前读物和进度；首屏能直接判断/行动|[B1](https://forum.obsidian.md/t/my-visual-book-tracking-moc-dataviewjs-css/115541) / 直|4 · 4 · 3 · **33**|Reader 协议已有继续阅读|Reader；本地；低|复用 Reader 数据，不复制存储|
|28 待读队列|订阅文章淹没待读|展示未读 1–3 条；首屏能直接判断/行动|[RSS](https://forum.obsidian.md/t/feedle-inline-rss-feeds-for-obsidian/113061) / 推|4 · 4 · 3 · **31**|RSS 模块已存在|RSS 提供者；本地；低|复用提供者及来源|
|29 播客继续听|关闭应用后忘记收听位置|显示正在听的节目；可能不适合首屏，需按需启用|[RAD](https://github.com/joeseesun/qiaomu-radio) / 产品|3 · 2 · 3 · **20**|Radio 模块已存在|Radio 提供者；本地；低|仅调用原有继续听动作|
|30 AI 待跟进|对话中提的问题未处理|显示最近对话并继续；可能不适合首屏，需按需启用|[AG](https://github.com/joeseesun/qiaomu-agent) / 产品|3 · 2 · 2 · **19**|Agent 最近对话模块已有|Agent；本地敏感；中|只在用户启用时展示，不传隐私|
|31 网页链接分组|常用网站入口杂乱|折叠的网站快捷方式组；首屏能直接判断/行动|[Inf](https://www.infinitytab.com/) / 产品|4 · 4 · 4 · **28**|已有快捷组，增强即可|已有快捷方式；本地；低|复用组排序及键盘访问|
|32 便笺草稿|想短暂记一句话而不打开文件|单行输入追加到 Inbox；首屏能直接判断/行动|[Bon](https://bonjourr.fr/) / 产品|5 · 5 · 5 · **34**|现有搜索已可快速记录|现有 captureNote；本地；低|复用快速记录，不建第二份数据|
|33 天气|出门前看天气|城市今日天气摘要；可能不适合首屏，需按需启用|[Tab](https://tabliss.io/) / 产品|2 · 2 · 2 · **16**|无，但与笔记无关|外部天气；位置隐私；中|默认关闭，需同意城市来源|
|34 每日引语|打开应用想看一句话|展示一条本地语句；可能不适合首屏，需按需启用|[Bon](https://bonjourr.fr/) / 产品|1 · 1 · 4 · **13**|时钟/背景已有氛围|本地静态内容；本地；低|不占核心首屏|
|35 背景切换|希望按心情调整首页|一键切换本地/图库背景；可能不适合首屏，需按需启用|[Tab](https://tabliss.io/) / 产品|2 · 2 · 4 · **18**|现有壁纸功能已实现|壁纸服务可选；网络；中|复用现有切换器|
|36 音乐/白噪音|专注时听背景声|控制当前音轨；可能不适合首屏，需按需启用|[Mom](https://get.momentumdash.help/hc/en-us/articles/115007780748-How-Momentum-works) / 产品|2 · 2 · 2 · **16**|Radio 已有；播放生命周期复杂|Radio/音频；本地；高|优先调用 Radio，不复制播放器|
|37 笔记活动热力|想看到长期记录节奏|近 30 日每日修改次数；可能不适合首屏，需按需启用|[H1](https://forum.obsidian.md/t/achieving-habit-tracker-with-obsidian/78290) / 推|2 · 2 · 2 · **20**|专用统计插件较多|全库统计；本地；高|离线计算且不影响启动|
|38 自定义公告|团队希望首页提示固定信息|显示选定笔记首段；可能不适合首屏，需按需启用|[AD](https://community.obsidian.md/plugins/cool-dashboard) / 产品|3 · 2 · 3 · **20**|快捷笔记可部分覆盖|Vault 文件；本地；中|仅用户指定，修改后更新|

## 首批选择与阶段路线

第一阶段：01 今日日记正文、02 最近修改、03 限定范围随机回顾。01/02/03 都能在 Home 的紧凑卡片上完成信息判断和打开笔记；已有日记入口、最近打开、搜索都不能直接提供相同状态。随机回顾只展示一个题目及“换一篇/打开”，不把管理界面放入首页。01 的“在首页直接编辑”需求更强，但会牵涉编辑器宿主、撤销、模板与焦点；先做只读预览+原生编辑跳转，再按真实反馈决定嵌入编辑器。这是明确的未覆盖需求。

第二阶段：04 收件箱待处理、05 项目下一步、06 今日到期、08 今日主目标。需要先确认 Markdown 任务来源、写回语义和日记路径，优先复用现有待办模块。

第三阶段：09 工作集、13 周回顾、14 日历条、15 习惯打卡、17 专注计时、20 倒计时、25 搜索预设、26 模板速建。依赖/状态更复杂，先以专用插件或原生命令接入为主。

复用/不单独开发：10/11/31 快捷组，27/28/29/30 乔木插件提供者，32 现有快速记录，35 壁纸切换。33/34/36/37/38 首页相关性或维护收益较低，暂不排进开发阶段。

## 先验评估与实现边界

- 类型：Home 是 Obsidian 自定义视图；状态所有者分别为日记 Markdown、vault 文件统计、用户配置中的回顾范围。无云端数据流。
- 官方 sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin ，2026-08-02 提交 `07ceb81d1fb3384af611ebf665a1ec42a7e5926d`，0BSD，作为宿主 API 约定参考。
- Calendar: https://github.com/liamcain/obsidian-calendar-plugin ，固定提交 `ef3f2696da11aa1d11a272179caea062d6144640`，MIT，2022 年维护快照；说明日记定位已有成熟方案，Home 仅做入口/预览，不复制日历。
- Smart Random Note: https://github.com/erichalldev/obsidian-smart-random-note ，固定提交 `e17078681af5659c0400c4924cf8424dfa6d3b2a`，API 未返回许可证，2021 年维护快照；仅借鉴用户可见能力，独立实现，不复制代码。
- 当前项目的 `todayPath`、`openTodayNote`、模块目录、页面配置、拖动排序与原生 `TFile`/Vault API 可直接复用。日记只读，随机回顾只读，最近修改只读；不复制第三方源码。
- 技术结论：Go，但三个组件保持按需启用、范围可配置、移动端小卡片。真实 Obsidian 宿主验证与自动化测试分别记录。

## Home 页面占位复核

独立测试库实测，默认 Home 已有今日待办、最近打开、新手指南、常用入口。加入三个卡片后，日记预览与最近修改能在双栏中各占一格，随机回顾另起一行；新手指南占高较大，新增卡片默认在其后，用户可通过现有布局菜单上移。建议后续把“新手必装”从默认主页移到首次引导或模块库，但该现有功能属于另一轮改动，本次未改其用户配置。日记预览与今日待办在内容上可能重复：Home 上应由用户按日记使用习惯二选一或并用，默认不同时启用。
