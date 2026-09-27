/** The prompt users hand to their own coding agent to build a Qiaomu Home extension. docs/build-an-extension.md embeds the same text (checked by tests). */
export const EXTENSION_PROMPT_ZH = `你是一名资深 Obsidian 插件工程师。请帮我开发一个能出现在「乔木 Home」首页上的 Obsidian 插件。

## 我想要的组件
{{在这里用一两句话描述你的想法，例如：在首页显示我正在追的 3 部剧和下一集时间}}

## 背景
乔木 Home（插件 id: qiaomu-home）是 Obsidian 的起点页。任何插件只要在插件实例上暴露 \`qiaomuHome\` 提供者，就会出现在 Home 的「添加内容 → 插件联动」里，用户可以把它的卡片加到任意页签。协议说明：https://github.com/joeseesun/qiaomu-home/blob/main/docs/qiaomu-home-protocol.md

## 必须遵守
1. 从 https://github.com/obsidianmd/obsidian-sample-plugin 起步，TypeScript + esbuild。插件 id 用小写短横线，不要以 obsidian 开头。
2. 原样复制协议文件（MIT）：https://raw.githubusercontent.com/joeseesun/qiaomu-home/main/protocol/qiaomu-home.ts 到 src/qiaomu-home.ts，不要修改它。
3. 在插件类上设置 \`qiaomuHome = homeProvider({ sections, actions?, search? })\`：
   - sections() 只读本地状态：不发网络请求、不写文件、不打开视图；1.5 秒内返回；每个 section 最多 6 条。
   - 每个条目的 open() 要“接着上次继续”：打开到上次的位置、那一集、那篇笔记。
   - 有可选的 actions（显示在 Home 新建按钮行）和 search（本地数据搜索，最多 limit 条）。
   - 数据变化时调用 notifyHomeChanged(this.app, this.manifest.id)。
4. 需要网络的数据：在插件自己的定时器或用户操作里拉取并缓存到本地，sections() 只读缓存；用 Obsidian 的 requestUrl；密钥放 app.secretStorage，不写进 data.json 或笔记。
5. 文案同时支持中文和英文（按 getLanguage() 判断），图标使用 Obsidian 自带的 Lucide 名称。
6. 不在 onload 里做重活；onunload 清理定时器与事件；不修改用户笔记，除非用户在卡片上明确点击。

## 交付与自测
1. 运行 npm run build，得到 main.js、manifest.json（和可选的 styles.css）。
2. 复制到测试库的 .obsidian/plugins/<你的插件 id>/，在「设置 → 第三方插件」启用。
3. 打开乔木 Home → 页签右侧的「添加内容」→「插件联动」，找到你的卡片并添加；确认：有数据、空状态文字、点击能继续、重载 Obsidian 后仍在。
4. 把验收结果和截图写进 README。

## 发布到乔木 Home 社区
1. 在 GitHub 公开仓库发布 Release（附 main.js、manifest.json、styles.css）。
2. 到 https://github.com/joeseesun/qiaomu-home/issues/new?template=submit-extension.yml 提交「社区组件」申请，填写插件 id、仓库、简介和截图。审核通过后，它会出现在所有乔木 Home 用户的「社区」分类里。

请先给出实现计划和文件结构，再写完整代码。`;

export const EXTENSION_PROMPT_EN = `You are a senior Obsidian plugin engineer. Help me build an Obsidian plugin whose cards appear on Qiaomu Home.

## The card I want
{{Describe your idea in one or two sentences, e.g. show the three shows I'm following and when the next episode airs}}

## Background
Qiaomu Home (plugin id: qiaomu-home) is a start page for Obsidian. Any plugin that exposes a \`qiaomuHome\` provider on its plugin instance shows up under Add cards → Integrations, and users can place its cards on any page. Protocol: https://github.com/joeseesun/qiaomu-home/blob/main/docs/qiaomu-home-protocol.md

## Rules
1. Start from https://github.com/obsidianmd/obsidian-sample-plugin (TypeScript + esbuild). Use a lowercase, hyphenated id that does not start with "obsidian".
2. Copy the protocol file (MIT) unchanged: https://raw.githubusercontent.com/joeseesun/qiaomu-home/main/protocol/qiaomu-home.ts into src/qiaomu-home.ts.
3. Set \`qiaomuHome = homeProvider({ sections, actions?, search? })\` on the plugin class:
   - sections() reads local state only: no network, no file writes, no opening views; return within 1.5 s; at most 6 items per section.
   - Each item's open() resumes where the user left off.
   - Optional actions appear in Home's create row; optional search covers your local data, at most \`limit\` results.
   - Call notifyHomeChanged(this.app, this.manifest.id) when the data changes.
4. Network data is fetched on your own timer or a user action and cached locally; sections() reads the cache. Use Obsidian's requestUrl. Keep secrets in app.secretStorage, never in data.json or notes.
5. Support Chinese and English text (via getLanguage()), and use Lucide icon names bundled with Obsidian.
6. No heavy work in onload; clean up timers and events in onunload; never change the user's notes unless they click something on the card.

## Deliver and self-test
1. Run npm run build to produce main.js, manifest.json and optional styles.css.
2. Copy them into a test vault at .obsidian/plugins/<your-plugin-id>/ and enable the plugin.
3. Open Qiaomu Home → Add cards → Integrations, add your card and confirm: real data, empty-state text, open resumes, and it survives an Obsidian reload.
4. Record the results and a screenshot in the README.

## Publish to the Qiaomu Home community
1. Publish a GitHub release in a public repository with main.js, manifest.json and styles.css.
2. Submit it at https://github.com/joeseesun/qiaomu-home/issues/new?template=submit-extension.yml with the plugin id, repository, summary and a screenshot. Once accepted it appears in every Qiaomu Home's Community category.

First give an implementation plan and file layout, then the complete code.`;
