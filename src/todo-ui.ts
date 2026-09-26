import { MarkdownView, Notice, SuggestModal, TFile, setIcon, type App } from 'obsidian';
import type QiaomuHomePlugin from './main';
import { isChinese } from './i18n';
import { appendTodo, completeTodo, readTodos } from './todo-data';
const drafts = new WeakMap<QiaomuHomePlugin, Map<string, string>>();
const L = (zh: string, en: string) => isChinese() ? zh : en;
function editorFor(app: App, file: TFile) {
  return app.workspace.getLeavesOfType('markdown').map(l => l.view).find((v): v is MarkdownView => v instanceof MarkdownView && v.file === file)?.editor;
}
async function update(app: App, file: TFile, transform: (text: string) => string): Promise<void> {
  const editor = editorFor(app, file);
  if (editor) {
    const before = editor.getValue(), after = transform(before);
    let start = 0;
    while (start < before.length && before[start] === after[start]) start++;
    let end = before.length, tail = after.length;
    while (end > start && tail > start && before[end - 1] === after[tail - 1]) { end--; tail--; }
    editor.replaceRange(after.slice(start, tail), editor.offsetToPos(start), editor.offsetToPos(end));
  } else await app.vault.process(file, transform);
}
class TodoPicker extends SuggestModal<TFile> {
  constructor(private plugin: QiaomuHomePlugin) { super(plugin.app); this.setPlaceholder(L('选择任务笔记', 'Choose task note')); }
  getSuggestions(query: string): TFile[] { return this.app.vault.getMarkdownFiles().filter(f => f.path.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 50); }
  renderSuggestion(file: TFile, el: HTMLElement): void { el.setText(file.path); }
  onChooseSuggestion(file: TFile): void {
    this.plugin.settings.todoPath = file.path;
    void this.plugin.saveSettings().catch(() => new Notice(L('保存失败，请重试', 'Could not save. Try again.')));
  }
}
export function renderTodo(parent: HTMLElement, plugin: QiaomuHomePlugin, limit: number): void {
  const app = plugin.app, path = plugin.settings.todoPath;
  if (!drafts.has(plugin)) drafts.set(plugin, new Map());
  const draft = drafts.get(plugin)!;
  const card = parent.createDiv({ cls: 'qh-card qh-todo' }); card.dataset.module = 'todo';
  const head = card.createDiv({ cls: 'qh-card-head' });
  setIcon(head.createSpan({ cls: 'qh-card-icon' }), 'list-todo');
  head.createSpan({ cls: 'qh-card-title', text: L('待办', 'Todo') });
  const destination = card.createEl('button', { cls: 'qh-todo-source', text: path });
  destination.addEventListener('click', () => new TodoPicker(plugin).open());
  const form = card.createEl('form', { cls: 'qh-todo-form' });
  const label = form.createEl('label', { cls: 'qh-sr-only', text: L('添加待办', 'Add task') });
  const input = label.createEl('input'); label.removeClass('qh-sr-only'); label.addClass('qh-todo-input-label');
  input.value = draft.get(path) ?? '';
  input.addEventListener('input', () => draft.set(path, input.value));
  input.placeholder = L('添加待办，回车保存', 'Add a task, press Enter');
  const submit = form.createEl('button', { type: 'submit' }); setIcon(submit, 'plus'); submit.createSpan({ cls: 'qh-sr-only', text: L('添加', 'Add') });
  const list = card.createDiv({ cls: 'qh-todo-list' });
  const error = card.createDiv({ cls: 'qh-todo-error', attr: { role: 'status' } });
  const more = card.createEl('button', { cls: 'qh-todo-source', text: L('打开任务笔记', 'Open task note') });
  more.addEventListener('click', () => { const file = app.vault.getAbstractFileByPath(path); if (file instanceof TFile) void app.workspace.getLeaf('tab').openFile(file); });
  let generation = 0, busy = false;
  const refresh = async () => {
    const turn = ++generation;
    const file = app.vault.getAbstractFileByPath(path);
    const snapshot = file instanceof TFile ? editorFor(app, file)?.getValue() ?? await app.vault.cachedRead(file) : '';
    if (turn !== generation) return;
    more.setText(L('打开任务笔记', 'Open task note'));
    list.empty(); more.hidden = !(file instanceof TFile);
    const tasks = readTodos(snapshot);
    if (!tasks.length) list.createDiv({ cls: 'qh-card-empty', text: L('暂无待办', 'No pending tasks') });
    for (const item of tasks.slice(0, limit)) {
      const row = list.createEl('label', { cls: 'qh-todo-row' });
      const checkbox = row.createEl('input', { type: 'checkbox' }); row.createSpan({ text: item.text });
      checkbox.addEventListener('change', () => {
        if (!(file instanceof TFile)) return;
        checkbox.disabled = true;
        void update(app, file, current => completeTodo(current, snapshot, item)).then(refresh).catch(() => {
          checkbox.checked = false; checkbox.disabled = false;
          error.setText(L('笔记已变化或写入失败，请重新打开主页后重试。', 'Note changed or write failed. Reopen Home and try again.'));
        });
      });
    }
    if (tasks.length > limit) more.setText(L(`查看全部 ${tasks.length} 条`, `View all ${tasks.length} tasks`));
  };
  form.addEventListener('submit', event => {
    event.preventDefault(); if (busy || !input.value.trim()) return;
    const text = input.value; busy = true; submit.disabled = true; input.disabled = true; error.empty();
    void (async () => {
      let file = app.vault.getAbstractFileByPath(path);
      if (!file) {
        if (path !== 'Home Todo.md') throw new Error('Missing target');
        try { file = await app.vault.create(path, ''); } catch (e) { file = app.vault.getAbstractFileByPath(path); if (!file) throw e; }
      }
      if (!(file instanceof TFile)) throw new Error('Invalid target');
      await update(app, file, content => appendTodo(content, text));
      input.value = ''; if (draft.get(path) === text) draft.delete(path); await refresh();
    })().catch(() => error.setText(L('保存失败，内容已保留，请检查任务笔记。', 'Could not save. Your input is retained. Check the task note.')))
      .finally(() => { busy = false; submit.disabled = false; input.disabled = false; if (input.isConnected) input.focus(); });
  });
  card.addEventListener('qh-todo-refresh', () => { void refresh().catch(() => error.setText(L('无法读取任务笔记', 'Could not read task note'))); });
  void refresh().catch(() => error.setText(L('无法读取任务笔记', 'Could not read task note')));
}
