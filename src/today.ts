import { TFile, moment, normalizePath, type App, type WorkspaceLeaf } from "obsidian";
import { commandExists } from "./ecosystem";
import { update } from "./todo-files";
import { t } from "./i18n";
import type { HomeSettings } from "./settings";

const now = moment as unknown as () => { format(pattern: string): string };

interface DailyOptions { folder?: string; format?: string; template?: string }

export async function dailyOptions(app: App): Promise<DailyOptions> {
  const runtime = (app as App & {internalPlugins?: {getPluginById?(id:string): {instance?: {options?: unknown}} | null}}).internalPlugins?.getPluginById?.("daily-notes")?.instance?.options;
  const path = `${app.vault.configDir}/daily-notes.json`;
  try {
    const value: unknown = runtime ?? (await app.vault.adapter.exists(path) ? JSON.parse(await app.vault.adapter.read(path)) : {});
    if (!value || typeof value !== "object") throw new Error("Invalid Daily notes settings");
    const options = value as DailyOptions;
    if ((options.folder !== undefined && typeof options.folder !== "string") ||
      (options.format !== undefined && typeof options.format !== "string")) throw new Error("Invalid Daily notes settings");
    return options;
  } catch { throw new Error("Could not read Daily notes settings"); }
}

export async function todayPath(app: App): Promise<string> {
  const options = await dailyOptions(app);
  const format = typeof options.format === "string" && options.format ? options.format : "YYYY-MM-DD";
  const folder = typeof options.folder === "string" ? options.folder.trim() : "";
  if (folder.startsWith("/") || folder.split("/").includes("..")) throw new Error("Invalid Daily notes folder");
  const path = normalizePath(`${folder ? `${folder}/` : ""}${now().format(format)}.md`);
  if (path.includes("\\") || path.split("/").includes("..") || path === app.vault.configDir || path.startsWith(`${app.vault.configDir}/`)) throw new Error("Invalid Daily notes path");
  return path;
}

export async function ensureParent(app: App, path: string): Promise<void> {
  const parts = path.split("/").slice(0, -1);
  for (let i = 1; i <= parts.length; i++) {
    const folder = parts.slice(0, i).join("/");
    if (!await app.vault.adapter.exists(folder)) {
      try { await app.vault.createFolder(folder); }
      catch (error) { if (!await app.vault.adapter.exists(folder)) throw error; }
    }
  }
}

export async function initialDailyContent(app: App, path: string): Promise<string> {
  const templatePath = (await dailyOptions(app)).template;
  if (typeof templatePath !== "string" || !templatePath.trim()) return "";
  const template = app.vault.getAbstractFileByPath(normalizePath(templatePath.endsWith(".md") ? templatePath : `${templatePath}.md`));
  if (!(template instanceof TFile)) return "";
  const content = await app.vault.read(template);
  return content.replace(/{{(date(?::[^}]+)?|time(?::[^}]+)?|title)}}/gi, (_, token: string) => {
    if (token.toLowerCase() === "title") return path.split("/").pop()?.replace(/\.md$/, "") ?? "";
    const [kind, ...parts] = token.split(":");
    const format = parts.join(":");
    return now().format(format || (kind.toLowerCase() === "time" ? "HH:mm" : "YYYY-MM-DD"));
  });
}

function inboxPath(app: App, settings: HomeSettings): string {
  const input = settings.captureInboxPath.trim();
  if (!input || input.startsWith("/") || input.includes("\\") || input.split("/").includes("..") ||
    input === app.vault.configDir || input.startsWith(`${app.vault.configDir}/`) || !input.toLowerCase().endsWith(".md")) {
    throw new Error(t("capture.badPath"));
  }
  return normalizePath(input);
}

/** One captured entry as Markdown: a list item (optionally a task or time-stamped); extra lines are indented under it. */
export function captureLine(text: string, format: "plain" | "time" | "task" = "plain", time = now().format("HH:mm")): string {
  const [first, ...rest] = text.trim().split(/\r?\n/);
  const head = format === "task" ? `- [ ] ${first.trim()}` : format === "time" ? `- ${time} ${first.trim()}` : `- ${first.trim()}`;
  return [head, ...rest.filter(line => line.trim()).map(line => `  ${line.trim()}`)].join("\n");
}

/** Capture stays on Home and appends to the selected Markdown file (through the editor when it is open). */
export async function captureNote(app: App, settings: HomeSettings, text: string): Promise<string> {
  const note = text.trim();
  if (!note) throw new Error("Empty capture");
  if (settings.captureTarget === "daily" && !commandExists(app, "daily-notes")) throw new Error(t("capture.noDaily"));
  const path = settings.captureTarget === "daily" ? await todayPath(app) : inboxPath(app, settings);
  await appendLine(app, path, captureLine(note, settings.captureFormat), settings.captureTarget === "daily");
  return path;
}

/** Recognises daily notes by the Daily notes folder and name format; always false when Daily notes is off. */
export async function dailyMatcher(app: App): Promise<(path: string) => boolean> {
  if (!commandExists(app, "daily-notes")) return () => false;
  const options = await dailyOptions(app).catch(() => null);
  if (!options) return () => false;
  const folder = (options.folder ?? "").trim().replace(/\/$/, ""), format = options.format || "YYYY-MM-DD";
  const parse = moment as unknown as (value: string, format: string, strict: boolean) => { isValid(): boolean };
  return (path) => {
    if (!path.endsWith(".md") || (folder && !path.startsWith(`${folder}/`))) return false;
    const name = path.slice(folder ? folder.length + 1 : 0, -3);
    return parse(name, format, true).isValid();
  };
}

/** Appends one Markdown line to today's daily note, creating it from the daily template when needed. */
export async function appendToDaily(app: App, line: string): Promise<string> {
  if (!commandExists(app, "daily-notes")) throw new Error(t("capture.noDaily"));
  const path = await todayPath(app);
  await appendLine(app, path, line, true);
  return path;
}

async function appendLine(app: App, path: string, line: string, daily: boolean): Promise<void> {
  await ensureParent(app, path);
  let file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    const initial = daily ? await initialDailyContent(app, path) : "";
    try { file = await app.vault.create(path, initial); }
    catch (error) {
      file = app.vault.getAbstractFileByPath(path);
      if (!file) throw error;
    }
  }
  if (!(file instanceof TFile)) throw new Error(t("capture.badFile"));
  await update(app, file, (content) => `${content}${content && !content.endsWith("\n") ? "\n" : ""}${line}\n`);
}

/** Today's daily note, created from the daily template when missing. Never overwrites an existing note. */
export async function ensureTodayNote(app: App): Promise<TFile> {
  if (!commandExists(app, "daily-notes")) throw new Error(t("capture.noDaily"));
  const path = await todayPath(app);
  await ensureParent(app, path);
  let file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    const initial = await initialDailyContent(app, path);
    try { file = await app.vault.create(path, initial); }
    catch (error) { file = app.vault.getAbstractFileByPath(path); if (!file) throw error; }
  }
  if (!(file instanceof TFile)) throw new Error(t("capture.badFile"));
  return file;
}

/** Resolve the date at click time and never overwrite an existing diary. */
export async function openTodayNote(app: App, leaf: WorkspaceLeaf): Promise<void> {
  await leaf.openFile(await ensureTodayNote(app), {active:true});
}
