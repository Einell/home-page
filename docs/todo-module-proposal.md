# 待办模块方案（待确认，尚未实现）

## 首页体验

模块名「待办」。顶部一个快速输入框，回车添加；下面默认展示 3 条未完成任务，支持勾选、打开来源和查看全部。写入位置用一个可点击的小标签展示，例如「今日日记」，设置只在需要时展开。

默认写入今天的日记，遵循已有日记文件夹、日期格式和模板，在「待办」标题下追加标准 Markdown：

```markdown
## 待办
- [ ] 给客户发方案
```

没有启用日记时，让用户选择一个任务笔记，可建议 Inbox/Tasks.md，确认后创建。Home 不另存一份任务数据库。

## 跨天和安全写入

- 范围限定为选定日记文件夹或任务笔记，异步读取并随文件变化更新；不在首页加载时同步扫描整个库。
- 昨天未完成的任务仍显示为「待续」，勾选时回写原笔记。不把它们每天复制一遍；没有明确截止日期的任务不称为逾期。
- 更新前重新核对原行和上下文；重复文本、移动行或冲突时停止并打开来源，不能按旧行号盲写。
- 保留缩进、子任务、标签、块 ID 和第三方属性。打开且有未保存内容时走编辑器，其他文件用 Vault.process。

## 与任务插件协作

### 第一阶段：无依赖的基础功能

快速添加、勾选、来源跳转、选择写入笔记、跨天待续。数据就是笔记里的 `- [ ]`，关闭 Home 后仍可照常管理。

### 第二阶段：Tasks 适配

Tasks 公开 API 提供创建、编辑、完成切换，但目前没有任务搜索接口。高级编辑调用公开弹窗；完成动作调用 executeToggleTaskDoneCommand，保留循环任务产生的多行结果、完成日期及状态规则。创建时遵循用户的全局过滤设置，不硬编码 #task。

缺少支持的 API 时提示打开原任务处理复杂语义，不使用内部缓存冒充公开接口。基础范围读取由 Home 自己完成；全库复杂筛选单独设计。

### 后续：Dataview

可作为读取索引的适配层；同一条任务仍只存于原笔记。先不增加通知、独立项目管理和第二套同步机制。

## 参考

- [Tasks API 文档](https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Advanced/Tasks%20Api.md)
- [Tasks 全局过滤](https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Getting%20Started/Global%20Filter.md)
- [Dataview TASK 查询](https://blacksmithgu.github.io/obsidian-dataview/queries/query-types/)
