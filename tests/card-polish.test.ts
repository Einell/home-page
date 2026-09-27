import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { readTodos, reopenTodo, replaceTodo, taskDisplay, todayFirst, underHeading, completeTodo } from "../src/todo-data";
import { completeTaskLine, daysBetween, dueDate, isRecurring, normalizeFocus, rescheduleLine, scheduledDate, startDate, taskBucket } from "../src/productivity-data";
import { excerptLines, inboxItems, pickReview, recentlyModified, removeInboxItem, restoreInboxItem } from "../src/home-native-modules";
import { habitDone, habitSpecs } from "../src/habits";
import { captureLine } from "../src/today";
import { focusFromFrontmatter } from "../src/daily-focus";
import { linkTarget, normalizeShortcutGroups, validIconName } from "../src/shortcuts";
import { normalizeSettings } from "../src/settings";
import { carryCandidates } from "../src/todo-carry";
import type { App } from "obsidian";
import type Plugin from "../src/main";

describe("task text and completion", () => {
  it("shows task text without Tasks or Dataview metadata", () => {
    expect(taskDisplay("Write [[Plan|the plan]] ⏫ 🔁 every week 📅 2026-09-27 ✅ 2026-09-20")).toBe("Write the plan");
    expect(taskDisplay("Call **Ann** [due:: 2026-09-27] (priority:: high)")).toBe("Call Ann");
    expect(taskDisplay("📅 2026-09-27")).toBe("📅 2026-09-27");
  });
  it("undoes a completion, including a recurring task's two lines", () => {
    const source = "- [ ] a\n- [ ] b 🔁 every day 📅 2026-09-27";
    const task = readTodos(source)[1];
    const next = "- [ ] b 🔁 every day 📅 2026-09-28\n- [x] b 🔁 every day 📅 2026-09-27 ✅ 2026-09-27";
    const done = replaceTodo(source, task, next).text;
    expect(done.split("\n")).toHaveLength(3);
    expect(reopenTodo(done, next, task.raw)).toBe(source);
    const simple = completeTodo("- [ ] x\r\n", "", readTodos("- [ ] x\r\n")[0]);
    expect(reopenTodo(simple, "- [x] x", "- [ ] x")).toBe("- [ ] x\r\n");
    expect(() => reopenTodo("- [ ] y", "- [x] x", "- [ ] x")).toThrow();
  });
  it("reads due, scheduled and start dates in both syntaxes", () => {
    expect(dueDate("a (due:: 2026-09-27)")).toBe("2026-09-27");
    expect(scheduledDate("a ⏳ 2026-09-26")).toBe("2026-09-26");
    expect(startDate("a [start:: 2026-10-01]")).toBe("2026-10-01");
  });
  it("puts tasks into today / overdue / upcoming like the Tasks plugin", () => {
    const today = "2026-09-27";
    expect(taskBucket({ due: "2026-09-27", scheduled: null, start: null }, today)).toBe("today");
    expect(taskBucket({ due: null, scheduled: "2026-09-27", start: null }, today)).toBe("today");
    expect(taskBucket({ due: "2026-09-20", scheduled: null, start: null }, today)).toBe("overdue");
    expect(taskBucket({ due: null, scheduled: "2026-09-20", start: null }, today)).toBe("overdue");
    expect(taskBucket({ due: "2026-09-30", scheduled: null, start: null }, today)).toBe("upcoming");
    expect(taskBucket({ due: "2026-09-27", scheduled: null, start: "2026-09-28" }, today)).toBe("upcoming");
    expect(taskBucket({ due: null, scheduled: null, start: null }, today)).toBeNull();
    expect(daysBetween("2026-09-20", today)).toBe(7);
  });
  it("completes and reschedules without the Tasks plugin", () => {
    expect(completeTaskLine("- [ ] a 📅 2026-09-20", "2026-09-27")).toBe("- [x] a 📅 2026-09-20 ✅ 2026-09-27");
    expect(completeTaskLine("- [ ] a [due:: 2026-09-20]", "2026-09-27")).toBe("- [x] a [due:: 2026-09-20] [completion:: 2026-09-27]");
    expect(completeTaskLine("- [ ] plain", "2026-09-27")).toBe("- [x] plain");
    expect(isRecurring("a 🔁 every day")).toBe(true);
    expect(rescheduleLine("- [ ] a 📅 2026-09-20", "2026-09-27")).toBe("- [ ] a 📅 2026-09-27");
    expect(rescheduleLine("- [ ] a ⏳ 2026-09-20", "2026-09-27")).toBe("- [ ] a ⏳ 2026-09-27");
  });
  it("writes and finds today's heading in either language", () => {
    expect(underHeading("## Today\n- [ ] a\n", "今日待办", "- [ ] b")).toBe("## Today\n- [ ] a\n- [ ] b\n");
    const content = "- [ ] early\n## Today\n- [ ] now\n";
    expect(todayFirst(content, readTodos(content)).map(t => t.text)).toEqual(["now", "early"]);
  });
});

describe("note excerpts, Inbox and review", () => {
  it("keeps source line numbers and task state after frontmatter", () => {
    const lines = excerptLines("---\na: 1\n---\n# Title\n- [ ] open\n- [x] done\n", 10);
    expect(lines).toEqual([{ text: "Title", line: 3 }, { text: "open", line: 4, task: "open" }, { text: "done", line: 5, task: "done" }]);
  });
  it("lists Inbox items with continuation lines and removes / restores them", () => {
    const note = "intro\n- first\n  more\n- second\n```\n- code\n```\n";
    const items = inboxItems(note);
    expect(items.map(item => item.text)).toEqual(["first", "second"]);
    const removed = removeInboxItem(note, items[0]);
    expect(removed).toBe("intro\n- second\n```\n- code\n```\n");
    expect(restoreInboxItem(removed, items[0])).toBe(note);
    // Found again after the note shifted.
    expect(removeInboxItem("new\n" + note, items[1])).toBe("new\nintro\n- first\n  more\n```\n- code\n```\n");
  });
  it("prefers old notes, rests reviewed ones and avoids the current pick", () => {
    const day = 86400000, now = 1000 * day;
    const files = [{ path: "old.md", stat: { mtime: now - 900 * day } }, { path: "new.md", stat: { mtime: now - day } }, { path: "seen.md", stat: { mtime: now - 900 * day } }];
    const seen = { "seen.md": "2026-09-20" };
    expect(pickReview(files, seen, "2026-09-27", { now, random: () => 0.5 })?.path).toBe("old.md");
    expect(pickReview(files, seen, "2026-09-27", { now, random: () => 0.999 })?.path).toBe("new.md");
    expect(pickReview(files, seen, "2026-09-27", { now, avoid: "old.md", random: () => 0 })?.path).toBe("new.md");
    expect(pickReview([files[2]], seen, "2026-09-27", { now })?.path).toBe("seen.md");
    expect(pickReview([], {}, "2026-09-27")).toBeUndefined();
  });
  it("keeps the newest notes without sorting the vault and honours exclusions", () => {
    const file = (path: string, mtime: number) => Object.assign(new TFile(), { path, stat: { mtime } });
    const app = { vault: { getMarkdownFiles: () => [file("a.md", 1), file("Daily/2026.md", 9), file("b.md", 5), file("c.md", 3), file("d.md", 7)] } } as unknown as App;
    expect(recentlyModified(app, 3).map(f => f.path)).toEqual(["Daily/2026.md", "d.md", "b.md"]);
    expect(recentlyModified(app, 3, "", path => path.startsWith("Daily/")).map(f => f.path)).toEqual(["d.md", "b.md", "c.md"]);
  });
});

describe("habits, capture and focus", () => {
  it("parses counted habits and judges a day done", () => {
    expect(habitSpecs("运动, 喝水:8，阅读：2, 喝水:3")).toEqual([{ name: "运动", target: 1 }, { name: "喝水", target: 8 }, { name: "阅读", target: 2 }]);
    expect(habitDone(true, 1)).toBe(true);
    expect(habitDone(5, 8)).toBe(false);
    expect(habitDone(8, 8)).toBe(true);
    expect(habitDone("yes", 1)).toBe(false);
  });
  it("formats captures and keeps extra lines under the first", () => {
    expect(captureLine("idea", "plain")).toBe("- idea");
    expect(captureLine("idea", "time", "09:30")).toBe("- 09:30 idea");
    expect(captureLine("call\n\n back ", "task")).toBe("- [ ] call\n  back");
  });
  it("reads focus properties and refuses values it should not overwrite", () => {
    expect(focusFromFrontmatter({ focus: ["a", "b"], focus_done: ["b"] })).toEqual([{ text: "a", done: false }, { text: "b", done: true }]);
    expect(focusFromFrontmatter({ focus: "one" })).toEqual([{ text: "one", done: false }]);
    expect(focusFromFrontmatter({})).toEqual([]);
    expect(focusFromFrontmatter({ focus: 3 })).toBeNull();
  });
  it("normalizes focus sessions from older saves", () => {
    expect(normalizeFocus({ durationMinutes: 45, remainingMs: 1000, endAt: 0 })).toEqual({ durationMinutes: 45, focusMinutes: 45, remainingMs: 1000, endAt: 0, kind: "focus", label: "" });
    expect(normalizeFocus({ kind: "break", durationMinutes: 5, focusMinutes: 25, label: "Write" }).kind).toBe("break");
  });
});

describe("shortcuts and settings", () => {
  it("accepts commands, obsidian links and any Lucide icon", () => {
    expect(linkTarget("obsidian://open?vault=a")).toBe("obsidian://open?vault=a");
    expect(linkTarget("javascript:alert(1)")).toBeNull();
    expect(validIconName("rocket")).toBe(true);
    expect(validIconName("favicon")).toBe(true);
    expect(validIconName("<svg>")).toBe(false);
    const [group] = normalizeShortcutGroups([{ id: "g", name: "", items: [
      { id: "c", kind: "command", target: "app:open-settings", name: "", icon: "settings" },
      { id: "u", kind: "url", target: "obsidian://open?vault=a", name: "", icon: "favicon" },
      { id: "x", kind: "url", target: "file:///etc/passwd", name: "", icon: "globe" },
    ] }]);
    expect(group.items.map(item => item.id)).toEqual(["c", "u"]);
  });
  it("gives website shortcuts site icons, turning old globe icons over once", () => {
    const saved = { homeShortcutsSeeded: true, pages: [{ id: "home", name: "", moduleOptions: {}, moduleOrder: [], shortcutGroups: [{ id: "g", name: "", items: [
      { id: "a", kind: "url", target: "https://x.com/", name: "", icon: "globe" }, { id: "b", kind: "url", target: "https://a.com/", name: "", icon: "star" }] }] }] };
    const once = normalizeSettings(saved);
    expect(once.pages[0].shortcutGroups[0].items.map(item => item.icon)).toEqual(["favicon", "star"]);
    once.pages[0].shortcutGroups[0].items[0].icon = "globe";
    expect(normalizeSettings(JSON.parse(JSON.stringify(once))).pages[0].shortcutGroups[0].items[0].icon).toBe("globe");
  });
  it("validates the new settings", () => {
    const settings = normalizeSettings({ todoCarryDays: 99, captureFormat: "time", recentPinned: ["a.md", "a.md"], reviewSeen: { "a.md": "2026-09-27", "b.md": "bad", __proto__: "x" }, openInNewTab: true });
    expect(settings.todoCarryDays).toBe(7);
    expect(settings.captureFormat).toBe("time");
    expect(settings.recentPinned).toEqual(["a.md"]);
    expect(settings.reviewSeen).toEqual({ "a.md": "2026-09-27" });
    expect(settings.openInNewTab).toBe(true);
    expect(settings.reviewExcludeDaily).toBe(true);
    expect(settings.focusSound).toBe(true);
  });
});

describe("carry window", () => {
  it("checks only recent daily notes by name, plus the fixed task note", async () => {
    const files = new Map(["Daily/2026-09-25.md", "Daily/2026-09-23.md", "Daily/2026-09-17.md", "Todo.md"].map(path => [path, Object.assign(new TFile(), { path })]));
    const plugin = {
      settings: { todoCarryDays: 3, todoPath: "Todo.md" },
      app: {
        commands: { commands: { "daily-notes": {} } },
        vault: { configDir: ".obsidian", adapter: { exists: async () => true, read: async () => JSON.stringify({ folder: "Daily", format: "YYYY-MM-DD" }) },
          getAbstractFileByPath: (path: string) => files.get(path) ?? null },
      },
    } as unknown as Plugin;
    const found = await carryCandidates(plugin, "Daily/2026-09-26.md");
    expect(found.map(file => file.path)).toEqual(["Daily/2026-09-25.md", "Daily/2026-09-23.md", "Todo.md"]);
  });
});
