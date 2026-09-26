import { todoTarget, ensureTodoFile, pendingCarry, carrySelected, type CarryGroup } from "./todo-carry";
import { underHeading, todayFirst } from "./todo-data";
import { commandExists } from "./ecosystem";
import { editorFor, update } from "./todo-files";
import { Modal, Notice, Setting, SuggestModal, TFile, setIcon } from 'obsidian';
import type QiaomuHomePlugin from './main';
import { isChinese } from './i18n';
import { appendTodo, completeTodo, readTodos } from './todo-data';
const drafts = new WeakMap<QiaomuHomePlugin, Map<string, string>>();
const L = (zh: string, en: string) => isChinese() ? zh : en;
class TodoPicker extends SuggestModal<TFile> {
  constructor(private plugin: QiaomuHomePlugin) { super(plugin.app); this.setPlaceholder(L('选择任务笔记', 'Choose task note')); }
  getSuggestions(query: string): TFile[] { return this.app.vault.getMarkdownFiles().filter(f => f.path.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 50); }
  renderSuggestion(file: TFile, el: HTMLElement): void { el.setText(file.path); }
  onChooseSuggestion(file: TFile): void {
    this.plugin.settings.todoPath = file.path;
    this.plugin.settings.todoDaily = false;
    void this.plugin.saveSettings().catch(() => new Notice(L('保存失败，请重试', 'Could not save. Try again.')));
  }
}
class TodoOptions extends Modal {
  constructor(private plugin: QiaomuHomePlugin) { super(plugin.app); }
  onOpen(): void {
    this.setTitle(L('待办设置', 'Todo settings'));
    new Setting(this.contentEl).setName(L('写入今日日记', 'Write to daily note')).setDesc(L('沿用日记目录、日期格式和模板。未启用日记时使用固定笔记。', 'Uses Daily notes folder, format and template; falls back to a fixed note when disabled.'))
      .addToggle(toggle => toggle.setValue(this.plugin.settings.todoDaily).onChange(value => { this.plugin.settings.todoDaily=value; void this.plugin.saveSettings().catch(()=>new Notice(L("保存失败","Save failed"))); }));
    new Setting(this.contentEl).setName(L('固定任务笔记', 'Fixed task note')).setDesc(this.plugin.settings.todoPath)
      .addButton(button => button.setButtonText(L('选择', 'Choose')).onClick(()=>{this.close();new TodoPicker(this.plugin).open();}));
    new Setting(this.contentEl).setName(L('打开主页时自动结转', 'Carry forward on opening Home')).setDesc(L('将以前未完成的任务移入今天，原日记保留跳转记录。默认关闭。', 'Moves pending tasks into today and leaves links in older notes. Off by default.'))
      .addToggle(toggle => toggle.setValue(this.plugin.settings.todoAutoCarry).onChange(value => { this.plugin.settings.todoAutoCarry=value; void this.plugin.saveSettings().catch(()=>new Notice(L("保存失败","Save failed"))); }));
  }
  onClose(): void { this.contentEl.empty(); }
}
class CarryPicker extends Modal {
  constructor(app: QiaomuHomePlugin['app'], private groups: CarryGroup[], private run: (groups:CarryGroup[])=>Promise<void>) {super(app);}
  onOpen(): void {
    this.setTitle(L('选择结转的任务', 'Choose tasks to carry forward'));
    const selected = new Set<string>();
    this.groups.forEach((group,i)=> {
      this.contentEl.createEl('h3',{text:group.file.basename});
      group.tasks.forEach((task,j)=>{ new Setting(this.contentEl).setName(task.text).addToggle(toggle=>toggle.onChange(value=>{const id=`${i}:${j}`;if(value)selected.add(id);else selected.delete(id);})); });
    });
    new Setting(this.contentEl).addButton(button=>button.setButtonText(L('移入今天','Move to today')).setCta().onClick(async()=>{
      const groups=this.groups.map((group,i)=>({...group,tasks:group.tasks.filter((_,j)=>selected.has(`${i}:${j}`))})).filter(group=>group.tasks.length);
      if(!groups.length)return;
      button.setDisabled(true);
      try {await this.run(groups);this.close();} catch {button.setDisabled(false);}
    }));
  }
  onClose(): void {this.contentEl.empty();}
}
export function renderTodo(parent: HTMLElement, plugin: QiaomuHomePlugin, limit: number): void {
  const app = plugin.app;
  let path = plugin.settings.todoPath;
  if (!drafts.has(plugin)) drafts.set(plugin, new Map());
  const draft = drafts.get(plugin)!;
  const card = parent.createDiv({ cls: 'qh-card qh-todo' }); card.dataset.module = 'todo';
  const head = card.createDiv({ cls: 'qh-card-head' });
  setIcon(head.createSpan({ cls: 'qh-card-icon' }), 'list-todo');
  head.createSpan({ cls: 'qh-card-title', text: L('待办', 'Todo') });
  const destination = card.createEl('button', { cls: 'qh-todo-source', text: path });
  destination.addEventListener('click', () => { const file=app.vault.getAbstractFileByPath(path); if(file instanceof TFile)void app.workspace.getLeaf('tab').openFile(file); });
  const options=head.createEl('button',{cls:'qh-icon-button'});setIcon(options,'sliders-horizontal');options.createSpan({cls:'qh-sr-only',text:L('待办设置','Todo settings')});options.addEventListener('click',()=>new TodoOptions(plugin).open());
  const form = card.createEl('form', { cls: 'qh-todo-form' });
  const label = form.createEl('label', { cls: 'qh-sr-only', text: L('添加待办', 'Add task') });
  const input = label.createEl('input'); label.removeClass('qh-sr-only'); label.addClass('qh-todo-input-label');
  const draftKey = plugin.settings.todoDaily ? 'daily' : path;
  input.value = draft.get(draftKey) ?? '';
  input.addEventListener('input', () => draft.set(draftKey, input.value));
  input.placeholder = L('添加待办，回车保存', 'Add a task, press Enter');
  const submit = form.createEl('button', { type: 'submit' }); setIcon(submit, 'plus'); submit.createSpan({ cls: 'qh-sr-only', text: L('添加', 'Add') });
  const list = card.createDiv({ cls: 'qh-todo-list' });
  const carry = card.createDiv({cls:'qh-todo-carry'});
  const error = card.createDiv({ cls: 'qh-todo-error', attr: { role: 'status' } });
  const more = card.createEl('button', { cls: 'qh-todo-source', text: L('打开任务笔记', 'Open task note') });
  more.addEventListener('click', () => { const file = app.vault.getAbstractFileByPath(path); if (file instanceof TFile) void app.workspace.getLeaf('tab').openFile(file); });
  let generation = 0, busy = false, moving = false, autoTried = false;
  const move = async (groups:CarryGroup[]) => {
    if(moving)return;
    moving=true;error.empty();
    carry.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);
    try { await carrySelected(plugin,path,groups); }
    catch(e) {
      error.setText(L('结转未全部完成，任务已保留。请等待笔记保存后点击重试；若笔记已改动，请先核对来源和今日笔记。','Transfer incomplete; tasks retained. Wait for notes to save and retry. If edited, check source and today first.'));
      const retry=error.createEl('button',{text:L('重试','Retry')});
      retry.addEventListener('click',()=>{void move([]).catch(()=>{});});
      throw e;
    } finally {moving=false;await refresh();}
  };
  const refresh = async () => {
    const turn = ++generation;
    path = await todoTarget(plugin);
    const daily=plugin.settings.todoDaily && commandExists(app,'daily-notes');
    destination.setText(L('写入：','Write to: ')+(daily?L('今日日记','Today’s note'):path));
    const file = app.vault.getAbstractFileByPath(path);
    const snapshot = file instanceof TFile ? editorFor(app, file)?.getValue() ?? await app.vault.cachedRead(file) : '';
    if (turn !== generation) return;
    more.setText(L('打开任务笔记', 'Open task note'));
    list.empty(); more.hidden = !(file instanceof TFile);
    const tasks = todayFirst(snapshot,readTodos(snapshot));
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
    if(!moving) {
      const groups=await pendingCarry(plugin,path);
      if(turn!==generation)return;
      carry.empty();
      const count=groups.reduce((sum,g)=>sum+g.tasks.length,0);
      if(count) {
        carry.createSpan({text:L(`有 ${count} 条未完成`,`${count} pending from earlier notes`)});
        const all=carry.createEl('button',{text:L('全部移入今天','Move all to today')});all.addEventListener('click',()=>{void move(groups).catch(()=>{});});
        const choose=carry.createEl('button',{text:L('选择结转','Choose tasks')});choose.addEventListener('click',()=>new CarryPicker(app,groups,move).open());
        if(card.isConnected&&plugin.settings.todoAutoCarry&&!autoTried){autoTried=true;void move(groups).catch(()=>{});}
      }
    }
    if (tasks.length > limit) more.setText(L(`查看全部 ${tasks.length} 条`, `View all ${tasks.length} tasks`));
  };
  form.addEventListener('submit', event => {
    event.preventDefault(); if (busy || !input.value.trim()) return;
    const text = input.value; busy = true; submit.disabled = true; input.disabled = true; error.empty();
    void (async () => {
      path = await todoTarget(plugin);
      const file = await ensureTodoFile(plugin,path);
      const daily=plugin.settings.todoDaily && commandExists(app,'daily-notes');
      await update(app, file, content => daily ? underHeading(content,'今日待办',appendTodo('',text).trimEnd()) : appendTodo(content,text));
      input.value = ''; if (draft.get(draftKey) === text) draft.delete(draftKey); await refresh();
    })().catch(() => error.setText(L('保存失败，内容已保留，请检查任务笔记。', 'Could not save. Your input is retained. Check the task note.')))
      .finally(() => { busy = false; submit.disabled = false; input.disabled = false; if (input.isConnected) input.focus(); });
  });
  card.addEventListener('qh-todo-refresh', () => { void refresh().catch(() => error.setText(L('无法读取任务笔记', 'Could not read task note'))); });
  void refresh().catch(() => error.setText(L('无法读取任务笔记', 'Could not read task note')));
}
