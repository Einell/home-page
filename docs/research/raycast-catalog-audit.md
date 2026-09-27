# Raycast 扩展迁移评估

调研日期：2026-09-27。覆盖边界：通过 [Raycast 官方扩展仓库](https://github.com/raycast/extensions) 的 `extensions/` 非递归 Git tree 枚举 **3,322 个目录名**，返回 `truncated=false`；完整 ID 快照见 [raycast-extension-index.json](raycast-extension-index.json)。这不是逐个阅读 3,322 个源码或验证 3,322 个安装包。深入读取其中 41 个扩展的 `package.json` 名称、描述和命令；未复制其代码。仓库树 SHA：`1903083b2aa84d3d6e339d7062e9a1af310e541e`。

Raycast 官方文档说明扩展是聚焦命令的集合、商店有数千项；目录项并不天然适合 Obsidian 首页。筛选规则：一眼可见状态或 1–2 步动作、Obsidian/乔木数据有归属、跨平台可行、授权与隐私代价可控。系统级窗口/剪贴板/浏览器控制不直接迁移到 Home。来源：[Store](https://www.raycast.com/store/extensions)、[扩展分类](https://developers.raycast.com/basics/prepare-an-extension-for-store)、[Quicklinks](https://manual.raycast.com/quicklinks)。

## 深读 41 项：迁移去向

|扩展（源码）|官方清单中的能力摘要|目标|结论|Home 形态或边界|
|---|---|---|---|---|
|[obsidian](https://github.com/raycast/extensions/tree/main/extensions/obsidian)|Control Obsidian with Raycast|Home|复用/增强|搜索笔记、创建、随机回顾已覆盖；把常用命令收拢到 Home 搜索|
|[obsidian-smart-capture](https://github.com/raycast/extensions/tree/main/extensions/obsidian-smart-capture)|Smart capture anything into Obsidian|Home|改造|快速记录目标明确、保存后回看 Inbox|
|[obsidian-tasks](https://github.com/raycast/extensions/tree/main/extensions/obsidian-tasks)|Manage your Obsidian Tasks through Raycast|Home|复用/增强|当前 Todo 已有，下一步做跨文件的今日期限汇总|
|[obsidian-bookmarks](https://github.com/raycast/extensions/tree/main/extensions/obsidian-bookmarks)|Manage your bookmarked links with Obsidian. Save, search, and access your bookmarks. Supports Safari, Arc and other Chromium-based browsers|Home|改造|已有快捷方式；补充从当前笔记/网页保存入口|
|[obsidian-link-opener](https://github.com/raycast/extensions/tree/main/extensions/obsidian-link-opener)|Open URLs from Obsidian markdown files' frontmatter|Home|候选|可把用户显式指定的链接属性显示为快捷入口|
|[tasknotes](https://github.com/raycast/extensions/tree/main/extensions/tasknotes)|Manage TaskNotes tasks in Obsidian from Raycast.|Home|先接入|通过现有插件协议显示任务，不复制任务状态|
|[browser-tabs](https://github.com/raycast/extensions/tree/main/extensions/browser-tabs)|Search and open tabs in Chrome, Safari, Edge, Arc, Brave, Vivaldi, Opera and Orion, etc.|系统|暂不做|浏览器标签权限与 Home 价值不匹配|
|[browser-bookmarks](https://github.com/raycast/extensions/tree/main/extensions/browser-bookmarks)|Integrate bookmarks from Brave, ChatGPT Atlas, Chrome, Dia, Edge, Firefox, Safari, Arc, Vivaldi, Vivaldi Snapshot, Zen, Whale, or Helium.|Home|需导入|仅用户选择导入，不读浏览器私有数据库|
|[any-website-search](https://github.com/raycast/extensions/tree/main/extensions/any-website-search)|Search any site on the web|Home|已做首版|多站搜索卡片，可选择站点|
|[google-search](https://github.com/raycast/extensions/tree/main/extensions/google-search)|Google search with autosuggestions|Home|已做首版|多站搜索中的 Google 来源|
|[brave-search](https://github.com/raycast/extensions/tree/main/extensions/brave-search)|Brave search with autosuggestions|Home|候选|可作为用户可选搜索来源|
|[google-books](https://github.com/raycast/extensions/tree/main/extensions/google-books)|Search Books with Google Books|Reader|候选|补充图书元数据，不在 Home 复制书库|
|[calibre-search](https://github.com/raycast/extensions/tree/main/extensions/calibre-search)|Search your Calibre ebook library by title and author|Reader|需协议|若用户装有 Calibre，再从 Reader 搜索|
|[justwatch-search](https://github.com/raycast/extensions/tree/main/extensions/justwatch-search)|Quickly find where a movie or tv show is streaming.|Home|候选|显示合法观看渠道，需核实稳定 API|
|[imdb](https://github.com/raycast/extensions/tree/main/extensions/imdb)|Easily open your favorite film or TV series on IMDb.|Home|已做首版|电影资料站搜索入口|
|[youtube-search](https://github.com/raycast/extensions/tree/main/extensions/youtube-search)|YouTube search with autosuggestions|Home|已做首版|YouTube 搜索入口|
|[bilibili-search](https://github.com/raycast/extensions/tree/main/extensions/bilibili-search)|Search Bilibili videos with autosuggestions|Home|已做首版|视频搜索卡片新增 B 站来源|
|[youtube-companion](https://github.com/raycast/extensions/tree/main/extensions/youtube-companion)|Collection of scripts to improve YouTube browsing experience|系统|暂不做|浏览器页面脚本不适合 Obsidian Home|
|[youtube-highlights](https://github.com/raycast/extensions/tree/main/extensions/youtube-highlights)|Capture and manage highlights from YouTube videos with timestamps|Reader|候选|公开视频高亮与时码写入笔记，由 Reader 持有|
|[summarize-youtube-video-with-ai](https://github.com/raycast/extensions/tree/main/extensions/summarize-youtube-video-with-ai)|Summarize YouTube videos using Raycast or a configured AI provider|Reader/Agent|候选|给定链接后总结；模型调用复用 Agent|
|[fetch-youtube-transcript](https://github.com/raycast/extensions/tree/main/extensions/fetch-youtube-transcript)|Fetches and saves the transcript of a YouTube video in your downloads folder|Reader/Agent|候选|用户给视频链接后提取字幕交给已有阅读工作流|
|[spotify-player](https://github.com/raycast/extensions/tree/main/extensions/spotify-player)|Spotify's most common features, now at your fingertips. Search for music and podcasts, browse your library, and control the playback. Glance at what's currently playing directly from the menu bar.|Radio/Home|需授权|播放控制要 OAuth/Premium 与设备状态，先保留搜索入口|
|[spotify-controls](https://github.com/raycast/extensions/tree/main/extensions/spotify-controls)|Control the Spotify app for macOS with your keyboard.|系统|暂不做|该扩展限 macOS；Home 不直接控制桌面 App|
|[spotify-beta](https://github.com/raycast/extensions/tree/main/extensions/spotify-beta)|Spotify search, library, playback and now-playing in an alternate package|Radio/Home|需授权|与 Spotify Player 同一类，避免另做第二套播放状态|
|[learning-snacks](https://github.com/raycast/extensions/tree/main/extensions/learning-snacks)|Learn anything you want, one snack at a time. 🍩|Home/Agent|候选|每日一题/复习入口，内容写入用户笔记|
|[arxiv](https://github.com/raycast/extensions/tree/main/extensions/arxiv)|Search arXiv papers, access multiple formats (PDF, TeX, HTML), and export citations in various academic styles.|Reader/Agent|Home 检索首版|论文搜索跳来源站；PDF 和引文保存仍待 Reader 接入|
|[zotero](https://github.com/raycast/extensions/tree/main/extensions/zotero)|Search Zotero Database from Raycast|Reader|需协议|接入 Zotero 已有库，不复制文献数据|
|[hacker-news](https://github.com/raycast/extensions/tree/main/extensions/hacker-news)|Read the latest stories of Hacker News.|RSS|复用|由 RSS 订阅/阅读处理，Home 只展示未读|
|[rss-reader](https://github.com/raycast/extensions/tree/main/extensions/rss-reader)|Browse latest news from your favourite sources|RSS|复用|使用 Qiaomu RSS 协议，不重建 feed 引擎|
|[focus](https://github.com/raycast/extensions/tree/main/extensions/focus)|Control Focus App – Website and App Blocker for Mac|系统|暂不做|外部屏蔽 App 控制不适合 Home 首屏|
|[pomodoro](https://github.com/raycast/extensions/tree/main/extensions/pomodoro)|Pomodoro extension with menu-bar timer|Home|候选|小型计时入口，记录可写日记|
|[timers](https://github.com/raycast/extensions/tree/main/extensions/timers)|Start, stop, and save countdown timers, directly in Raycast, with no external dependencies.|Home|候选|单一倒计时已做；多计时器应进专用视图|
|[snippetslab](https://github.com/raycast/extensions/tree/main/extensions/snippetslab)|Search and view contents in your SnippetsLab library.|Home/Agent|候选|常用片段与 Prompt，优先复用已有 Prompt 库|
|[clipboard-utilities](https://github.com/raycast/extensions/tree/main/extensions/clipboard-utilities)|A bunch of utilities for actions that require multiple items in the clipboard history|系统|暂不做|剪贴板历史权限与隐私成本高|
|[quick-notes](https://github.com/raycast/extensions/tree/main/extensions/quick-notes)|Create simple markdown notes in Raycast and sync to a folder locally. No integrations required!|Home|复用/增强|现有快速记录与 Inbox 预览|
|[google-translate](https://github.com/raycast/extensions/tree/main/extensions/google-translate)|Simple translation using Google Translate|Agent|候选|翻译选中内容，不塞进 Home 常驻卡片|
|[dictionary](https://github.com/raycast/extensions/tree/main/extensions/dictionary)|Search any word with multiple online dictionaries or translation engines in one place—lightweight, zero dependencies.|Home/Reader|Home 检索首版|查词跳剑桥或维基词典；原位释义未做|
|[weather](https://github.com/raycast/extensions/tree/main/extensions/weather)|Weather forecast via wttr.in|Home|低优先|与笔记主任务相关性较弱、需网络/城市|
|[google-calendar](https://github.com/raycast/extensions/tree/main/extensions/google-calendar)|Manage your Google calendar easily. Create events, search contacts, and check out your upcoming schedule.|Home|需授权|只展示今日下一项，OAuth 另行设计|
|[todoist](https://github.com/raycast/extensions/tree/main/extensions/todoist)|Check your Todoist tasks and quickly create new ones|Home|需授权|只展示今日任务，避免复制 Todoist 状态|
|[todo-list](https://github.com/raycast/extensions/tree/main/extensions/todo-list)|Add and complete local todo items; includes backup import/export|Home|复用|现有 Todo 已可添加和勾选，避免复制待办文件|

## 全目录名称筛选

对快照内全部 3,322 个 ID 做关键词检索：`obsidian` 5 项、`spotify` 4 项、`youtube` 11 项、`dictionary` 8 项、`calendar` 12 项、`pomodoro` 2 项、`habit` 3 项、`todo` 6 项。以上是**名称信号**，会遗漏异名功能和包含词却不相关的项目；不能当作类别总量或需求热度。5 个名称含 `obsidian` 的项目均已读取 manifest。完整目录和可复核 ID 见索引 JSON。

## 新增可迁移候选（补充原 38 项）

39 站点模板搜索：保存常用查询 URL；Home 显示 1 个输入 + 2–4 个目标。
40 B 站检索：已加入找视频与电影卡片，视频仍在原站观看。
41 合法观看渠道：输入片名后显示来源站搜索入口，真正片源/地区可用性由原站确认。
42 论文快搜：已加入 arXiv、Crossref 跳转检索；PDF 与结果保存交给 Reader。
43 Zotero 最近文献：只有安装并授权 Zotero 才出现；状态归 Zotero。
44 Calibre 本地图书：Reader 接入现有库，不复制文件。
45 视频字幕入笔记：从公开视频链接获取可用字幕，出处和时码保留。
46 一词多词典：已加入剑桥和维基词典跳转查询，Home 不长期展示释义。
47 选中文本翻译：编辑器命令比常驻 Home 卡片更合适。
48 每日一题：复习队列来自用户笔记或 Agent，不用随机网络题目填满首页。
49 Prompt 快捷片段：复用 Agent Prompt 库，Home 只给最近常用项。
50 单个专注计时：卡片上开始/暂停，结束记录交给日记。
51 浏览器书签导入：用户显式选择导入；之后作为已有快捷方式使用。
52 Spotify 当前播放/控制：需正式 OAuth、Premium 和活跃设备；只在授权后显示。
53 日历下一项：授权后展示当前或下一场日程，详细编辑留在日历。
54 GitHub 待办：开发者页签展示本人待审 PR/Issue；需授权，不默认出现在日记页。
55 视频高亮：用户给链接、时码、摘录后写入 Reader 笔记；不做浏览器页面脚本。
56 视频摘要：给公开视频链接后在 Reader/Agent 流程中总结，显示来源与模型费用边界。

## 本轮实现与剩余边界

当前代码新增多站搜索、找电子书、找视频与电影（含 B 站）、Spotify 搜索、学 AI、找论文、查词，以及收件箱、今日重点、倒计时；均在模块库按需启用。跨站卡片只打开来源网站，不抓取/下载第三方内容；Spotify 只有搜索入口，**不是播放控制**。Raycast 的完整扩展仓库并非可直接移植的库，跨应用命令、权限和数据来源需要逐项设计。
