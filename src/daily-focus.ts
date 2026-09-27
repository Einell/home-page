import { TFile, moment, normalizePath, type App } from "obsidian";
import { commandExists } from "./ecosystem";
import type QiaomuHomePlugin from "./main";
import { localDay, type FocusItem } from "./settings";
import { dailyOptions, ensureTodayNote, todayPath } from "./today";

export const FOCUS_KEY = "focus";
export const FOCUS_DONE_KEY = "focus_done";
export const MAX_FOCUS = 3;

/** Reads focus items from frontmatter; null when the properties hold something Home should not overwrite. */
export function focusFromFrontmatter(frontmatter: Record<string, unknown> | undefined): FocusItem[] | null {
  const value = frontmatter?.[FOCUS_KEY], doneValue = frontmatter?.[FOCUS_DONE_KEY];
  if (value === undefined || value === null) return [];
  const texts = typeof value === "string" ? [value] : Array.isArray(value) && value.every(item => typeof item === "string") ? value : null;
  const done = doneValue === undefined || doneValue === null ? [] : typeof doneValue === "string" ? [doneValue]
    : Array.isArray(doneValue) && doneValue.every(item => typeof item === "string") ? doneValue : null;
  if (!texts || !done) return null;
  return texts.map(text => text.trim()).filter(Boolean).slice(0, MAX_FOCUS).map(text => ({ text, done: done.includes(text) }));
}

export interface FocusState { items: FocusItem[]; stored: "note" | "settings"; invalid: boolean; yesterday: FocusItem[] }

function dailyEnabled(app: App): boolean { return commandExists(app, "daily-notes"); }

async function dayFile(app: App, offset: number): Promise<TFile | null> {
  if (offset === 0) { const file = app.vault.getAbstractFileByPath(await todayPath(app)); return file instanceof TFile ? file : null; }
  const config = await dailyOptions(app);
  const name = (moment as unknown as () => { subtract(n: number, unit: string): { format(pattern: string): string } })().subtract(offset, "days").format(config.format || "YYYY-MM-DD");
  const folder = (config.folder ?? "").trim().replace(/\/$/, "");
  const file = app.vault.getAbstractFileByPath(normalizePath(`${folder ? `${folder}/` : ""}${name}.md`));
  return file instanceof TFile ? file : null;
}

export async function readFocus(plugin: QiaomuHomePlugin): Promise<FocusState> {
  const saved = plugin.settings.dailyFocus.day === localDay() ? plugin.settings.dailyFocus.items : [];
  if (!dailyEnabled(plugin.app)) return { items: saved, stored: "settings", invalid: false, yesterday: [] };
  const today = await dayFile(plugin.app, 0);
  const parsed = today ? focusFromFrontmatter(plugin.app.metadataCache.getFileCache(today)?.frontmatter) : [];
  const yesterdayFile = await dayFile(plugin.app, 1).catch(() => null);
  const yesterday = (yesterdayFile ? focusFromFrontmatter(plugin.app.metadataCache.getFileCache(yesterdayFile)?.frontmatter) ?? [] : []).filter(item => !item.done);
  // Earlier versions kept today's focus in settings; show it until the first edit moves it into the note.
  return { items: parsed === null ? [] : parsed.length ? parsed : saved, stored: "note", invalid: parsed === null, yesterday };
}

export async function writeFocus(plugin: QiaomuHomePlugin, items: FocusItem[]): Promise<void> {
  const clean = items.filter(item => item.text.trim()).slice(0, MAX_FOCUS);
  if (!dailyEnabled(plugin.app)) {
    plugin.settings.dailyFocus = { day: localDay(), items: clean };
    await plugin.saveSettings({ rerender: false });
    return;
  }
  const file = await ensureTodayNote(plugin.app);
  await plugin.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    if (focusFromFrontmatter(frontmatter) === null) throw new Error("Focus property changed");
    if (clean.length) frontmatter[FOCUS_KEY] = clean.map(item => item.text); else delete frontmatter[FOCUS_KEY];
    const done = clean.filter(item => item.done).map(item => item.text);
    if (done.length) frontmatter[FOCUS_DONE_KEY] = done; else delete frontmatter[FOCUS_DONE_KEY];
  });
  if (plugin.settings.dailyFocus.items.length) {
    plugin.settings.dailyFocus = { day: "", items: [] };
    await plugin.saveSettings({ rerender: false });
  }
}

/** First unfinished focus item, for the focus-timer log. */
export async function currentFocusText(plugin: QiaomuHomePlugin): Promise<string> {
  try { return (await readFocus(plugin)).items.find(item => !item.done)?.text ?? ""; } catch { return ""; }
}
