import { TFile, moment, normalizePath } from 'obsidian';
import type QiaomuHomePlugin from './main';
import { todayPath, dailyOptions, ensureParent, initialDailyContent } from './today';
import { commandExists } from './ecosystem';
import { editorFor, update } from './todo-files';
import { carryTasks, carrySource, carryBlock, underHeading, type CarryTask } from './todo-data';
import { isChinese } from './i18n';
export const todayHeading = (): string => isChinese() ? '今日待办' : 'Today';
export const carryHeading = (): string => isChinese() ? '昨日未完成' : 'Carried over';
export interface CarryGroup { file: TFile; snapshot: string; tasks: CarryTask[] }
export async function todoTarget(plugin: QiaomuHomePlugin): Promise<string> {
  return plugin.settings.todoDaily && commandExists(plugin.app, 'daily-notes') ? todayPath(plugin.app) : plugin.settings.todoPath;
}
export async function ensureTodoFile(plugin: QiaomuHomePlugin, path: string): Promise<TFile> {
  const {app} = plugin;
  let file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    const daily = plugin.settings.todoDaily && commandExists(app, 'daily-notes') && path === await todayPath(app);
    if (!daily && path !== 'Home Todo.md') throw new Error('Missing task note');
    await ensureParent(app,path);
    try { file = await app.vault.create(path, daily ? await initialDailyContent(app,path) : ''); }
    catch(e) { file = app.vault.getAbstractFileByPath(path); if (!file) throw e; }
  }
  if (!(file instanceof TFile)) throw new Error('Invalid task note');
  return file;
}
export async function readTaskFile(plugin: QiaomuHomePlugin, file: TFile): Promise<string> {
  return editorFor(plugin.app,file)?.getValue() ?? plugin.app.vault.read(file);
}
/** Past daily notes inside the carry window (newest first), found by name instead of scanning the vault. */
export async function carryCandidates(plugin: QiaomuHomePlugin, target: string): Promise<TFile[]> {
  const options = await dailyOptions(plugin.app), folder = options.folder?.trim().replace(/\/$/,'') ?? '', format = options.format || 'YYYY-MM-DD';
  const day = moment as unknown as () => { subtract(n: number, unit: string): { format(pattern: string): string } };
  const files: TFile[] = [];
  const seen = new Set<string>([target]);
  for (let offset = 1; offset <= plugin.settings.todoCarryDays; offset++) {
    const path = normalizePath(`${folder ? `${folder}/` : ''}${day().subtract(offset, 'days').format(format)}.md`);
    if (seen.has(path)) continue;
    seen.add(path);
    const file = plugin.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) files.push(file);
  }
  const fixed = plugin.app.vault.getAbstractFileByPath(plugin.settings.todoPath);
  if (fixed instanceof TFile && !seen.has(fixed.path)) files.push(fixed);
  return files;
}
export async function pendingCarry(plugin: QiaomuHomePlugin, target: string): Promise<CarryGroup[]> {
  if (!plugin.settings.todoDaily || !commandExists(plugin.app,'daily-notes')) return [];
  const groups: CarryGroup[] = [];
  for (const file of await carryCandidates(plugin, target)) {
    const snapshot = editorFor(plugin.app,file)?.getValue() ?? await plugin.app.vault.cachedRead(file), tasks = carryTasks(snapshot);
    if (tasks.length) groups.push({file,snapshot,tasks});
  }
  return groups;
}
interface Journal { source: string; target: string; sourceBefore: string; sourceAfter: string; targetBefore: string; targetAfter: string }
const queues = new WeakMap<QiaomuHomePlugin, Promise<void>>();
function journalPath(plugin: QiaomuHomePlugin): string { return `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}/todo-transfer.json`; }
async function recover(plugin: QiaomuHomePlugin): Promise<void> {
  const adapter = plugin.app.vault.adapter, path = journalPath(plugin);
  if (!await adapter.exists(path)) return;
  const value: unknown = JSON.parse(await adapter.read(path));
  if (!value || typeof value !== 'object' || !['source','target','sourceBefore','sourceAfter','targetBefore','targetAfter'].every(k=>typeof (value as Record<string,unknown>)[k]==='string')) throw new Error('Invalid transfer journal');
  const j = value as Journal;
  const source = plugin.app.vault.getAbstractFileByPath(j.source), target = plugin.app.vault.getAbstractFileByPath(j.target);
  if (!(source instanceof TFile) || !(target instanceof TFile) || source === target) throw new Error('Transfer file missing');
  // Verify both before making a new write. Persist target first; never remove the sole task copy.
  const before = await readTaskFile(plugin,source), dest = await readTaskFile(plugin,target);
  if (![j.sourceBefore,j.sourceAfter].includes(before) || ![j.targetBefore,j.targetAfter].includes(dest)) throw new Error('Transfer conflict');
  await update(plugin.app,target,current=> { if (current===j.targetAfter) return current; if(current!==j.targetBefore) throw new Error('Transfer conflict'); return j.targetAfter; });
  // Editor buffers may not have reached disk yet. Keep the journal until both durable copies match.
  await update(plugin.app,source,current=> { if(current===j.sourceAfter) return current; if(current!==j.sourceBefore) throw new Error('Transfer conflict'); return j.sourceAfter; });
  for(let attempt=0;attempt<20;attempt++) {
    if (await plugin.app.vault.read(target) === j.targetAfter && await plugin.app.vault.read(source) === j.sourceAfter) {await adapter.remove(path);return;}
    await new Promise(resolve=>window.setTimeout(resolve,100));
  }
}
export function carrySelected(plugin: QiaomuHomePlugin, targetPath: string, groups: CarryGroup[]): Promise<void> {
  const run = (queues.get(plugin) ?? Promise.resolve()).catch(()=>{}).then(async()=> {
    const resuming = await plugin.app.vault.adapter.exists(journalPath(plugin));
    await recover(plugin);
    if (await plugin.app.vault.adapter.exists(journalPath(plugin))) throw new Error('Waiting for editor save. Retry shortly.');
    if (resuming) return;
    if (targetPath !== await todoTarget(plugin)) throw new Error('Day changed. Refresh Home.');
    const target = groups.length ? await ensureTodoFile(plugin,targetPath) : null;
    for (const group of groups) {
      if (!target || !group.tasks.length) continue;
      const sourceBefore = await readTaskFile(plugin,group.file);
      if (sourceBefore !== group.snapshot) throw new Error('Task changed. Refresh and retry.');
      const targetBefore = await readTaskFile(plugin,target);
      const j: Journal = {source:group.file.path,target:target.path,sourceBefore,targetBefore,
        sourceAfter:carrySource(sourceBefore,group.tasks,target.path),
        targetAfter:underHeading(targetBefore,carryHeading(),group.tasks.map(carryBlock).join('\n'))};
      await plugin.app.vault.adapter.write(journalPath(plugin),JSON.stringify(j));
      await recover(plugin);
      if (await plugin.app.vault.adapter.exists(journalPath(plugin))) throw new Error('Waiting for editor save. Retry shortly.');
    }
  });
  queues.set(plugin,run); return run;
}
