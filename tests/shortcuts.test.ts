import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings";
import { addPage, duplicatePage } from "../src/pages";
import { moveShortcutGroup, normalizeShortcutGroups, renameShortcutTargets, reorderShortcut, webTarget, type ShortcutGroup } from "../src/shortcuts";
const fixture = (): ShortcutGroup => ({ id: "group", name: "Work", items: [
  { id: "note", name: "", kind: "file", target: "Projects/笔记.md", icon: "file-text" },
  { id: "folder", name: "Projects", kind: "folder", target: "Projects", icon: "folder" },
  { id: "web", name: "Example", kind: "url", target: "https://example.com/Projects/", icon: "globe" },
] });

describe("custom shortcuts", () => {
  it("only accepts ordinary http(s) links without embedded credentials", () => {
    expect(webTarget(" https://example.com/a?x=1#part ")).toBe("https://example.com/a?x=1#part");
    for (const value of ["javascript:alert(1)", "file:///private/data", "data:text/html,test", "obsidian://open", "https://name:secret@example.com", "example.com"]) expect(webTarget(value)).toBeNull();
  });
  it("migrates older pages and rejects damaged entries without losing healthy ones", () => {
    expect(normalizeSettings(null).pages[0].shortcutGroups).toEqual([]);
    const group = fixture();
    const normalized = normalizeShortcutGroups([null, group, group, { id: "bad", items: [null, { id: "unsafe", kind: "url", target: "javascript:alert(1)" }] }]);
    expect(normalized).toEqual([group, { id: "bad", name: "", items: [] }]);
    const settings = normalizeSettings({ pages: [{ id: "home", shortcutGroups: [group] }] });
    expect(normalizeSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });
  it("updates renamed folders and descendants in copied pages without changing custom names or websites", () => {
    const settings = normalizeSettings(null);
    settings.pages[0].shortcutGroups.push(fixture());
    const copy = duplicatePage(settings, "home", "Copy")!;
    copy.shortcutGroups[0].items[0].name = "Keep my label";
    expect(renameShortcutTargets(settings, "Projects", "Work/Projects")).toBe(true);
    expect(settings.pages[0].shortcutGroups[0].items.map((item) => item.target)).toEqual(["Work/Projects/笔记.md", "Work/Projects", "https://example.com/Projects/"]);
    expect(copy.shortcutGroups[0].items[0].name).toBe("Keep my label");
    expect(settings.pages[0].shortcutGroups[0].items[0].name).toBe("");
    expect(renameShortcutTargets(settings, "Work/Project", "Wrong")).toBe(false);
  });
  it("reorders both directions without corrupting stale or external drag targets", () => {
    const group = fixture();
    reorderShortcut(group, "note", "web", true);
    expect(group.items.map((item) => item.id)).toEqual(["folder", "web", "note"]);
    reorderShortcut(group, "note", "folder");
    expect(group.items.map((item) => item.id)).toEqual(["note", "folder", "web"]);
    expect(reorderShortcut(group, "outside", "folder")).toBe(false);
    expect(reorderShortcut(group, "note", "removed")).toBe(false);
  });
  it("moves a whole group and its page order without changing source files", () => {
    const settings = normalizeSettings(null), source = settings.pages[0];
    source.shortcutGroups.push(fixture()); source.moduleOrder = ["recent", "shortcut:group"];
    const target = addPage(settings, "Reading");
    expect(moveShortcutGroup(settings, source.id, "missing", "group")).toBe(false);
    expect(moveShortcutGroup(settings, source.id, target.id, "group")).toBe(true);
    expect(source.shortcutGroups).toEqual([]);
    expect(source.moduleOrder).toEqual(["recent"]);
    expect(target.shortcutGroups).toEqual([fixture()]);
    expect(target.moduleOptions["shortcut:group"].visible).toBe(true);
  });
});
