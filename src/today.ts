import { TFile, moment, normalizePath, type App } from "obsidian";
import { commandExists } from "./ecosystem";
import { t } from "./i18n";
import type { HomeSettings } from "./settings";

const now = moment as unknown as () => { format(pattern: string): string };

interface DailyOptions { folder?: string; format?: string; template?: string }

export async function dailyOptions(app: App): Promise<DailyOptions> {
  const path = `${app.vault.configDir}/daily-notes.json`;
  if (!await app.vault.adapter.exists(path)) return {};
  try {
    const value: unknown = JSON.parse(await app.vault.adapter.read(path));
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
  return normalizePath(`${folder ? `${folder}/` : ""}${now().format(format)}.md`);
}

export async function ensureParent(app: App, path: string): Promise<void> {
  const parts = path.split("/").slice(0, -1);
  for (let i = 1; i <= parts.length; i++) {
    const folder = parts.slice(0, i).join("/");
    if (!await app.vault.adapter.exists(folder)) await app.vault.createFolder(folder);
  }
}

export async function initialDailyContent(app: App, path: string): Promise<string> {
  const templatePath = (await dailyOptions(app)).template;
  if (typeof templatePath !== "string" || !templatePath.trim()) return "";
  const template = app.vault.getAbstractFileByPath(normalizePath(templatePath.endsWith(".md") ? templatePath : `${templatePath}.md`));
  if (!(template instanceof TFile)) return "";
  const content = await app.vault.read(template);
  return content.replace(/{{(date(?::[^}]+)?|time(?::[^}]+)?|title)}}/gi, (_, token: string) => {
    if (token === "title") return path.split("/").pop()?.replace(/\.md$/, "") ?? "";
    const [kind, format] = token.split(":");
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

/** Capture stays on Home and appends atomically to the selected Markdown file. */
export async function captureNote(app: App, settings: HomeSettings, text: string): Promise<string> {
  const note = text.trim();
  if (!note) throw new Error("Empty capture");
  if (settings.captureTarget === "daily" && !commandExists(app, "daily-notes")) throw new Error(t("capture.noDaily"));
  const path = settings.captureTarget === "daily" ? await todayPath(app) : inboxPath(app, settings);
  await ensureParent(app, path);
  let file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    const initial = settings.captureTarget === "daily" ? await initialDailyContent(app, path) : "";
    try { file = await app.vault.create(path, initial); }
    catch (error) {
      file = app.vault.getAbstractFileByPath(path);
      if (!file) throw error;
    }
  }
  if (!(file instanceof TFile)) throw new Error(t("capture.badFile"));
  await app.vault.process(file, (content) => `${content}${content && !content.endsWith("\n") ? "\n" : ""}- ${note}\n`);
  return path;
}
