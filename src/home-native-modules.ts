import { TFile, type App } from "obsidian";

function isTemplate(file: TFile): boolean {
  return file.path.split("/").some((part) => /^(templates?|_templates?)$/i.test(part));
}

/** Paths a card can leave out: daily notes and the notes Home itself writes to (Inbox, task note). */
export interface NoteFilter { folder?: string; exclude?: (path: string) => boolean }

/** Recently edited is deliberately different from Obsidian's last-opened list. Keeps only the top `limit` without sorting the whole vault. */
export function recentlyModified(app: App, limit: number, folder = "", exclude?: (path: string) => boolean): TFile[] {
  const prefix = folder ? `${folder.replace(/\/$/, "")}/` : "";
  const top: TFile[] = [];
  const newer = (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime || a.path.localeCompare(b.path);
  for (const file of app.vault.getMarkdownFiles()) {
    if (!(file instanceof TFile) || isTemplate(file) || (prefix && !file.path.startsWith(prefix)) || exclude?.(file.path)) continue;
    if (top.length === limit && newer(file, top[top.length - 1]) >= 0) continue;
    let at = top.length;
    while (at > 0 && newer(file, top[at - 1]) < 0) at--;
    top.splice(at, 0, file);
    if (top.length > limit) top.pop();
  }
  return top;
}

export function reviewCandidates(app: App, folder: string, exclude?: (path: string) => boolean): TFile[] {
  const prefix = folder ? `${folder.replace(/\/$/, "")}/` : "";
  return app.vault.getMarkdownFiles().filter((file) => file instanceof TFile &&
    (!prefix || file.path.startsWith(prefix)) &&
    !isTemplate(file) && !exclude?.(file.path));
}

/**
 * Picks a note to review: skips notes reviewed in the last `cooldownDays`, and favours notes untouched for longer
 * (weight grows with the square root of age, so old notes win more often without always winning).
 */
export function pickReview<T extends { path: string; stat: { mtime: number } }>(candidates: T[], seen: Record<string, string>, today: string,
  options: { cooldownDays?: number; avoid?: string; now?: number; random?: () => number } = {}): T | undefined {
  const cooldown = options.cooldownDays ?? 30, now = options.now ?? Date.now(), random = options.random ?? Math.random;
  const recent = (path: string) => {
    const day = seen[path];
    return Boolean(day) && (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86400000 < cooldown;
  };
  let pool = candidates.filter((file) => file.path !== options.avoid && !recent(file.path));
  if (!pool.length) pool = candidates.filter((file) => file.path !== options.avoid);
  if (!pool.length) pool = candidates;
  if (!pool.length) return undefined;
  const weights = pool.map((file) => Math.sqrt(Math.max(1, (now - file.stat.mtime) / 86400000)));
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll < 0) return pool[i]; }
  return pool[pool.length - 1];
}

export interface ExcerptLine { text: string; line: number; task?: "open" | "done" }

/** A short, text-only overview avoids running embeds, scripts or heavy Markdown on Home. Keeps source lines and task state. */
export function excerptLines(markdown: string, limit: number): ExcerptLine[] {
  const match = /^\uFEFF?---\s*\n[\s\S]*?\n---\s*\n?/.exec(markdown);
  const offset = match ? match[0].split("\n").length - 1 : 0;
  const lines = markdown.slice(match ? match[0].length : 0).split(/\r?\n/);
  const result: ExcerptLine[] = [];
  let code = false;
  for (const [index, line] of lines.entries()) {
    if (result.length === limit) break;
    if (/^\s*(```|~~~)/.test(line)) { code = !code; continue; }
    if (code || !line.trim() || /^\s*%%/.test(line)) continue;
    const task = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]/.exec(line);
    const text = line.trim().replace(/^#{1,6}\s+/, "").replace(/^([-*+]|\d+[.)])\s+/, "")
      .replace(/^\[[ xX]\]\s*/, "").replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2").replace(/[*_`~]/g, "").trim();
    // Empty list items ("- ") and bare quote/number markers carry no content.
    if (text && !/^([-*+>]|\d+[.)])$/.test(text)) result.push({ text: text.slice(0, 180), line: index + offset, ...(task ? { task: task[1] === " " ? "open" as const : "done" as const } : {}) });
  }
  return result;
}

export function dailyExcerpt(markdown: string, limit: number): string[] {
  return excerptLines(markdown, limit).map((line) => line.text);
}

export interface InboxItem { line: number; end: number; raw: string; text: string }

/** Top-level list items (with their indented continuation lines) outside frontmatter and code; newest last, as written. */
export function inboxItems(markdown: string): InboxItem[] {
  const rows = markdown.split("\n");
  const items: InboxItem[] = [];
  let fence = "", yaml = rows[0]?.trim() === "---";
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (yaml) { if (i > 0 && /^(---|\.\.\.)\s*$/.test(raw)) yaml = false; continue; }
    const boundary = /^\s{0,3}(`{3,}|~{3,})/.exec(raw);
    if (boundary) { if (!fence) fence = boundary[1]; else if (boundary[1][0] === fence[0] && boundary[1].length >= fence.length) fence = ""; continue; }
    if (fence) continue;
    const item = /^[-*+]\s+(?:\[[ xX]\]\s+)?(.+?)\r?$/.exec(raw);
    if (!item) continue;
    let end = i + 1;
    while (end < rows.length && /^\s+\S/.test(rows[end])) end++;
    items.push({ line: i, end, raw: rows.slice(i, end).join("\n"), text: item[1] });
  }
  return items;
}

/** Removes one item block, verifying it is still where it was read. */
export function removeInboxItem(markdown: string, item: InboxItem): string {
  const rows = markdown.split("\n");
  if (rows.slice(item.line, item.end).join("\n") !== item.raw) {
    const again = inboxItems(markdown).filter((entry) => entry.raw === item.raw);
    if (again.length !== 1) throw new Error("Item changed");
    item = again[0];
  }
  rows.splice(item.line, item.end - item.line);
  return rows.join("\n");
}

/** Puts a removed block back at its old position (or at the end if the note shrank). */
export function restoreInboxItem(markdown: string, item: InboxItem): string {
  const rows = markdown.split("\n");
  rows.splice(Math.min(item.line, rows.length), 0, ...item.raw.split("\n"));
  return rows.join("\n");
}
