# Qiaomu Home 扩展组件与 Raycast 调研验收

日期：2026-09-27。工作区版本：0.3.1，基于 `d9cbc12` 的未提交改动；宿主：Obsidian 1.13.7。该记录区分候选、可用模块、来源跳转与真正服务集成。

## 交付边界

- [组件候选矩阵](component-opportunities.md)记录 38 项 Obsidian/新标签页需求，其中 3 项（今日日记预览、最近修改、范围随机回顾）已在第一阶段实现。
- [Raycast 扩展评估](raycast-catalog-audit.md)保存官方仓库 3,322 个扩展目录名的完整快照，做全目录名称筛选，并深入审阅 41 个代表性扩展 manifest，补充 18 项迁移候选。3,322 是目录枚举数，不是逐项源码审计或全部可迁移数。
- 本轮另实现 10 张默认隐藏、由模块库按需添加的 Home 卡片：收件箱预览、今日重点、倒计时、多站搜索、找电子书、找视频与电影、Spotify 搜索、学 AI、找论文、查词。连同上一阶段 3 张，共 13 张新卡片。
- 多站搜索把同一关键词打开到选定搜索站；视频卡片含 YouTube、B 站、IMDb；图书卡片含 Open Library、Project Gutenberg；论文卡片含 arXiv、Crossref；查词卡片含剑桥、维基词典。网络查询在用户点击来源时发生，不在后台抓取。
- Spotify 卡片目前仅能打开 Spotify 搜索。播放/暂停、当前曲目、用户库等尚未接入；电子书下载与电影播放亦交由来源站，Home 没有实现下载器或播放器。

## 需求与界面适配

首页只承载一眼可读的状态或一两步可完成的动作，所有新增卡片默认关闭，避免挤占今日日记与今日待办。跨站搜索、查词、找书、找论文都属于“输入后选择来源”的小卡片；结果详情继续在原站。Raycast 的浏览器标签管理、系统剪贴板、窗口控制和第三方账户任务管理不应硬塞进 Obsidian Home；RSS、Reader、Radio、Agent 的深度功能应由原插件承担，Home 只做入口或摘要。

## 验证

- `npm run check`：16 个测试文件、66 项测试通过；TypeScript 与 esbuild 构建通过。ESLint 无错误，有 1 条既存的设置搜索 API 提示（`src/settings-tab.ts:59`）。
- 网址构造单测覆盖中文与特殊字符编码、B 站和 arXiv 路径；所有新来源卡片默认隐藏。arXiv、Crossref、剑桥词典、维基词典、B 站的示例检索 URL 已获 HTTP 200（以当日请求为准，不保证未来或每个地区可访问）。
- 隔离 Obsidian 库 `/tmp/qiaomu-home-component-qa` 曾实际添加多站搜索、找书、今日重点；今日重点写入测试库 `data.json` 后保持。这个隔离库的 UI 验证发生在新增找论文/查词和最后一次界面微调之前，因此不算这两张卡片的交互验收。
- 真实库 `/Users/joe/Documents/rockfish` 已复制构建的 `main.js`、`styles.css`、`manifest.json` 到 `.obsidian/plugins/qiaomu-home/`；最终 `main.js` SHA-256 为 `754cea8339cc00daa3aed57c52c470c801ac6ce66d77b5c61b493149f2fdf7f1`，`data.json` SHA-256 保持 `6973a59e85ad49d29f4ddc0d9c070095fe9434b0b00e6a9d3432c958057ccbb0`。通过 Obsidian **Force Reload** 后，主页恢复，模块库中可见 10 张新卡片及 B 站、arXiv、Crossref、剑桥、维基词典来源。默认配置未替用户新增卡片。

## 尚未完成

56 项候选中多数仍是研究/路线图，没有逐项开发。未实现的高价值方向包括跨文件到期任务、项目下一步、专注计时、可保存站点模板、Reader/Radio/Agent 深度联动和 Spotify 正式授权控制。未验证移动端、所有搜索网站的真实点击跳转、地区限制、Spotify 账户状态、超大库性能、跨午夜日期刷新。源码改动尚未提交、推送或发布到社区插件市场；rockfish 的安装只供本机测试。
