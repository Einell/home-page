# 乔木Home / Qiaomu Home

**中文** | [English](#english)

> 打开 Obsidian 的第一眼：搜索、新建，接着做你刚才在做的事。

> A calm start page for Obsidian: find a note, create something, and pick up where you left off.

[在 Obsidian 安装](https://community.obsidian.md/plugins/qiaomu-home) · [下载 0.3.0](https://github.com/joeseesun/qiaomu-home/releases/tag/0.3.0) · [报告问题](https://github.com/joeseesun/qiaomu-home/issues) · [许可证](LICENSE)

乔木Home 把 Obsidian 的启动页和空白新标签页换成一个安静的起点：大字时间、Unsplash 壁纸、一个能搜笔记也能问 AI 的搜索框、一排快捷新建按钮，以及「继续」卡片——最近的笔记、在读的书、未读的文章、刚才听的电台、上次的 AI 对话。

## 它做什么

| 区域 | 能做什么 |
| --- | --- |
| 搜索框 | 按名称、别名、路径搜笔记（最近打开的更靠前）；装了乔木插件时，同时搜书、文章、电台和对话。`↵` 打开，`⇧↵` 追加到 Inbox 或今日日记，`⌘↵` 直接问乔木 Agent。没有结果时一键新建同名笔记或转到全文搜索。 |
| 新笔记与快捷按钮 | 新笔记、今日日记、白板、数据库、文件夹、导入文件，加上乔木插件提供的「添加图书」「添加订阅」「新对话」。可隐藏、排序，也能把任意 Obsidian 命令放上来。 |
| 继续 | 最近笔记，以及每个乔木插件的继续卡片：书的封面和进度、未读文章数、正在播放的电台（可直接播放/暂停）、最近对话。 |
| 页签与模块 | 可启用多个页签，每页独立设置最近笔记、今日代办、快捷入口和插件卡片。模块可隐藏、设为 1–6 条（默认 3 条）；页签支持命名、排序和删除。 |
| 壁纸 | 内置 50 张 Unsplash 精选（无需密钥），或用自己的 Unsplash Access Key 按关键词随机，或用库中的图片。每天一张、每次打开换一张或手动更换；当前壁纸缓存在本地，离线也能秒开。 |
| 推荐 | 没装的乔木插件显示一张推荐卡片，点「安装」打开插件市场页面；已安装未启用的可直接去启用。可逐个隐藏。 |

## 0.2 更新

新增快速记录、原生书签和可选页签模式。搜索结果不会再被卡片遮挡；插件延迟加载或重载后会自动恢复连接，不再误报需要更新。已有布局自动保留为第一个页签。

### 0.3 开发中：直接布置主页

当前开发分支新增模块库，尚未公开发布，市场安装仍为上方的正式版本。

- 点击主页「添加内容」，搜索和预览模块，添加到当前页签；缺少插件时可打开安装或启用入口。
- 新建页签后直接选内容；页签菜单支持重命名、复制、排序和删除。
- 卡片 `⋯` 可设置显示条数（默认 3 条，可选 1–6 条）、移动到其他页签或移除。
- 「编辑布局」支持拖动页签和卡片；菜单中的前移、后移也可完成排序。
- 同一插件的多个模块可以分别配置，旧版插件级设置自动继承。
- 「快捷方式」可创建多个分组，添加库内笔记、文件夹或 http/https 网址，选择图标和名称。入口可在编辑模式中排序或通过菜单前移、后移；文件夹会在文件列表中展开定位，库内改名会更新目标。
- 添加快捷入口先平铺选择类型，再填写目标；名称和图标按需展开，切换类型保留草稿。
- 工具栏使用图标按钮；编辑状态显示完成图标。拖动使用独立手柄、插入线和边缘滚动，也可用菜单排序。
- 网址默认使用网页图标，可手动选择其他图标，不自动抓取网站 Logo。

## 和乔木插件一起用

| 插件 | 在主页上 |
| --- | --- |
| [乔木 Reader](https://github.com/joeseesun/qiaomu-reader) | 继续阅读（封面、进度）、添加图书、搜书名 |
| [乔木 RSS](https://github.com/joeseesun/qiaomu-ai-rss) | 最新未读与未读数、添加订阅、搜文章 |
| [乔木电台](https://github.com/joeseesun/qiaomu-radio) | 正在播放与最近电台，一键播放/暂停 |
| [乔木 Agent](https://github.com/joeseesun/qiaomu-agent) | 最近对话、新对话；搜索框 `⌘↵` 直接提问 |

插件之间不互相依赖：任何一个单独使用都正常。

## 让你的插件接入

乔木Home 用一个很小的公开协议发现其他插件。复制一个文件、设置 `plugin.qiaomuHome`，你的插件就会出现在主页上。见 [乔木Home 协议](docs/qiaomu-home-protocol.md)。

## 隐私

- 不需要账号。设置保存在本库的插件数据中；Unsplash Access Key 保存在 Obsidian 密钥库，设置里只存它的名称。
- 网络请求只有壁纸：内置图库从 `images.unsplash.com` 加载图片；启用 Unsplash 搜索时，用你的密钥请求 `api.unsplash.com`（并按 Unsplash API 规范报告一次使用）。
- 搜索只在本地进行。只有你按 `⌘↵` 时，问题才会交给乔木 Agent，由它按你的设置处理。
- 乔木Home 从不安装或启用任何插件，只打开对应的插件市场或设置页面。

## 手动安装

推荐从 [Obsidian 社区目录](https://community.obsidian.md/plugins/qiaomu-home) 安装。也可下载同一版本 Release 的 `main.js`、`manifest.json`、`styles.css`，放进库的 `.obsidian/plugins/qiaomu-home/`，然后在 Obsidian 设置中启用「Qiaomu Home」。需要 Obsidian 1.11.4 或更新版本。0.1.0 已通过官方自动扫描；人工复核状态另行确认。

如需从源码构建，请看下方开发说明。桌面端已在本地库验证；移动端尚无真机验收。

## 开发

```bash
npm install
npm run check   # lint + 测试 + 构建
```

把 `main.js`、`manifest.json`、`styles.css` 复制到库的 `.obsidian/plugins/qiaomu-home/`，在设置中启用。

## License

GPL-3.0-only，另见 [商业授权说明](COMMERCIAL-LICENSE.md)。协议文件 `protocol/qiaomu-home.ts` / `.js` 以 MIT 授权，任何插件都可以直接复制使用。壁纸照片遵循 [Unsplash License](https://unsplash.com/license)，并在页面上署名摄影师。

---

<a id="english"></a>

# English

Qiaomu Home replaces Obsidian's startup page and empty new tabs with search, quick creation, recent notes, and optional cards from Qiaomu Reader, RSS, Radio, and Agent. It works without those optional plugins.

Version 0.2 adds Shift+Enter quick capture, native bookmarks, per-card visibility and item limits, and optional pages with independent layouts. It also fixes search layering and automatically reconnects plugin cards after loading or reloading.

## Install

Install from the [Obsidian community directory](https://community.obsidian.md/plugins/qiaomu-home). Alternatively, download `main.js`, `manifest.json`, and `styles.css` from the [0.2.0 release](https://github.com/joeseesun/qiaomu-home/releases/tag/0.3.0) into `.obsidian/plugins/qiaomu-home/` in your vault, then enable Qiaomu Home in Obsidian. Requires Obsidian 1.11.4 or newer. Version 0.1.0 passed the automated scan; manual review is a separate stage.

To build from source, run `npm install && npm run check` and copy the same three files. Desktop has been checked in a local vault; mobile has not been verified on a physical device.

Search stays local. Wallpaper images load from Unsplash; optional Unsplash search uses a key stored in Obsidian SecretStorage. Asking Agent sends text only when you press its shortcut. See [privacy details](#隐私) and [license](LICENSE) (GPL-3.0-only; the standalone protocol files are MIT licensed).

### 开发版待办

点击齿轮 → **＋ 添加内容 → 待办**。默认写入今日日记的「今日待办」，沿用日记目录、日期格式和模板；未启用日记时使用固定任务笔记。

- 默认展示 3 条，卡片菜单可调整；今天新增的任务优先显示。
- 以前未完成的任务可以「全部移入今天」或「选择结转」，进入「昨日未完成」。父任务与缩进子任务一起移动，原笔记留下指向目标日期的记录，不标成已完成。
- 卡片设置中可切换固定笔记、开启自动结转；自动结转默认关闭。
- 原固定任务笔记中的未完成项也可结转；任务正文仍是普通 Markdown，暂不接 Tasks。

### 默认页签与设置

新安装默认启用「主页、阅读、娱乐」：主页放今日代办、最近笔记与常用入口，阅读放 Reader/RSS，娱乐放电台与常用网站入口。主页不可删除；其他页签可改名或删除。已有布局保留，设置里可补充预设页签。

设置采用「主页、外观、记录、关于」四个分类；记录页统一管理快速记录和今日代办。组件布局仍可以直接在主页布置。

### 0.3.0 更新

- 模块库、直接编辑布局、独立页签与可编辑快捷入口；新安装预设主页、阅读、娱乐。
- 常用入口默认提供动态今日日记、X 和谷歌，可以改名、改图标、排序和删除；升级仅补充一次，不会恢复已删除的默认入口。
- 今日代办写入日记，支持手动或可选自动结转；移入今天后原日记保留日期链接。
- 修复「今日」不创建日记的问题，遵循核心日记的目录、日期格式与模板。
- 移除 Home 书签模块，不改动 Obsidian 原生书签数据。
- 设置重整为主页、外观、记录、关于；关于包含反馈入口、关注与支持二维码。
- 新增 20 张精选壁纸，共 50 张；[摄影作品来源](docs/wallpaper-credits.md)。

关于页二维码从 `radio.qiaomu.ai` 加载。只有打开关于页时才加载这些图片；无需登录，没有遥测。

顶部可选择「时间与问候」或「自定义文本」。自定义内容即时保存，留空恢复时间显示；旧品牌与仓库名称模式迁移为时间显示。
