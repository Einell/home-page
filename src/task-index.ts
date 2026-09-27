import type { App } from "obsidian";
import { datedTasks, eligibleNote, inFolder, type DatedTask } from "./productivity-data";
export interface IndexedTask extends DatedTask { path: string; name: string }
/** Shared by all Home views; reads on demand, caches parsed tasks, and bounds parallel I/O. */
export class HomeTaskIndex {
  private cache = new Map<string, { mtime: number; size: number; tasks: IndexedTask[] }>();
  private running = new Map<string, Promise<IndexedTask[]>>();
  constructor(private app: App) {}
  clear(): void { this.cache.clear(); }
  read(folder = ""): Promise<IndexedTask[]> {
    const running = this.running.get(folder); if (running) return running;
    const request = this.scan(folder).finally(() => { this.running.delete(folder); });
    this.running.set(folder, request); return request;
  }
  private async scan(folder: string): Promise<IndexedTask[]> {
    const allFiles = this.app.vault.getMarkdownFiles();
    const files = allFiles.filter(file => eligibleNote(file.path) && inFolder(file.path, folder));
    const live = new Set(allFiles.map(file => file.path));
    for (const path of this.cache.keys()) if (!live.has(path)) this.cache.delete(path);
    let cursor = 0;
    const results: IndexedTask[][] = [];
    await Promise.all(Array.from({ length: Math.min(6, files.length) }, async () => {
      while (cursor < files.length) {
        const file = files[cursor++];
        const cached = this.cache.get(file.path);
        if (cached?.mtime === file.stat.mtime && cached.size === file.stat.size) { results.push(cached.tasks); continue; }
        const mtime = file.stat.mtime, size = file.stat.size;
        const markdown = await this.app.vault.cachedRead(file);
        const tasks = datedTasks(markdown).map(task => ({ ...task, path: file.path, name: file.basename }));
        this.cache.set(file.path, { mtime, size, tasks });
        results.push(tasks);
      }
    }));
    return results.flat().sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  }
}
