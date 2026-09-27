import type { HomeSettings } from "./settings";

export type ShortcutKind = "file" | "folder" | "url" | "daily" | "command";
export interface Shortcut { id: string; kind: ShortcutKind; target: string; name: string; icon: string }
export interface ShortcutGroup { id: string; name: string; items: Shortcut[] }
export const SHORTCUT_ICONS = ["file-text", "folder", "globe", "link", "book-open", "star", "heart", "briefcase", "pencil", "code", "graduation-cap", "house", "calendar", "music", "video", "lightbulb"];
export const shortcutModuleId = (id: string): string => `shortcut:${id}`;
/** "favicon" shows the website's own icon; any other value is a Lucide icon id. */
export const FAVICON = "favicon";
export const defaultShortcutIcon = (kind: ShortcutKind): string => kind === "daily" ? "calendar" : kind === "url" ? "globe" : kind === "command" ? "terminal-square" : kind === "folder" ? "folder" : "file-text";
export const validIconName = (value: unknown): value is string => typeof value === "string" && (value === FAVICON || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) && value.length <= 40;
/** Websites, plus obsidian:// links (to another vault, a note, or a plugin's URI action). */
export function linkTarget(value: string): string | null {
  const web = webTarget(value);
  if (web) return web;
  try { const url = new URL(value.trim()); return url.protocol === "obsidian:" ? url.href : null; } catch { return null; }
}
export function webTarget(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function normalizeShortcutGroups(value: unknown): ShortcutGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: ShortcutGroup[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const group = raw as Partial<ShortcutGroup>;
    if (typeof group.id !== "string" || !group.id || groups.some((item) => item.id === group.id)) continue;
    const items: Shortcut[] = [];
    if (Array.isArray(group.items)) for (const entry of group.items) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !entry.id || items.some((item) => item.id === entry.id)) continue;
      if (!["file", "folder", "url", "daily", "command"].includes(entry.kind) || typeof entry.target !== "string" || !entry.target.trim()) continue;
      const target = entry.kind === "daily" ? "today" : entry.kind === "url" ? linkTarget(entry.target) : entry.target;
      if (!target) continue;
      items.push({ id: entry.id, kind: entry.kind, target, name: typeof entry.name === "string" ? entry.name.slice(0, 120) : "", icon: validIconName(entry.icon) ? entry.icon : defaultShortcutIcon(entry.kind) });
    }
    groups.push({ id: group.id, name: typeof group.name === "string" ? group.name.slice(0, 80) : "", items });
  }
  return groups;
}
export function renameShortcutTargets(settings: HomeSettings, oldPath: string, newPath: string): boolean {
  let changed = false;
  for (const page of settings.pages) for (const group of page.shortcutGroups) for (const item of group.items) {
    if (item.kind === "url" || item.kind === "daily" || item.kind === "command") continue;
    if (item.target === oldPath || item.target.startsWith(`${oldPath}/`)) {
      item.target = newPath + item.target.slice(oldPath.length); changed = true;
    }
  }
  return changed;
}
export function reorderShortcut(group: ShortcutGroup, id: string, targetId: string, after = false): boolean {
  const item = group.items.find((entry) => entry.id === id);
  if (!item || id === targetId || !group.items.some((entry) => entry.id === targetId)) return false;
  group.items = group.items.filter((entry) => entry.id !== id);
  group.items.splice(group.items.findIndex((entry) => entry.id === targetId) + (after ? 1 : 0), 0, item);
  return true;
}
export function moveShortcutGroup(settings: HomeSettings, from: string, to: string, id: string): boolean {
  const source = settings.pages.find((page) => page.id === from), destination = settings.pages.find((page) => page.id === to);
  const group = source?.shortcutGroups.find((entry) => entry.id === id);
  if (!source || !destination || source === destination || !group || destination.shortcutGroups.some((entry) => entry.id === id)) return false;
  source.shortcutGroups = source.shortcutGroups.filter((entry) => entry.id !== id);
  destination.shortcutGroups.push(group);
  const key = shortcutModuleId(id);
  source.moduleOrder = source.moduleOrder.filter((entry) => entry !== key);
  delete source.moduleOptions[key];
  destination.moduleOrder.push(key);
  destination.moduleOptions[key] = { visible: true, limit: 3 };
  return true;
}

export function defaultHomeShortcuts(chinese: boolean): ShortcutGroup {
  return { id: "home-shortcuts", name: chinese ? "常用入口" : "Shortcuts", items: [
    {id:"daily", kind:"daily", target:"today", name:chinese?"今日日记":"Daily note", icon:"calendar"},
    {id:"x", kind:"url", target:"https://x.com/", name:"X", icon:"globe"},
    {id:"google", kind:"url", target:"https://www.google.com/", name:chinese?"谷歌":"Google", icon:"globe"},
  ]};
}
