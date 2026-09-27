import { describe, expect, it } from "vitest";
import { datedTasks, dueDate, focusRemaining, inFolder, normalizeFocus, taskProgress, validDay } from "../src/productivity-data";
import { DEFAULT_SETTINGS, moduleOptions, normalizeSettings } from "../src/settings";
import { PRODUCTIVITY_MODULES } from "../src/productivity-catalog";

describe("task dates and progress", () => {
  it("accepts real due dates only, without confusing start/scheduled dates", () => {
    expect(dueDate("Write 📅 2026-09-27")).toBe("2026-09-27");
    expect(dueDate("Read [due:: 2026-09-28]")).toBe("2026-09-28");
    expect(dueDate("Read ⏳ 2026-09-28")).toBeNull();
    expect(dueDate("Read 📅 2026-02-30")).toBeNull();
    expect(validDay("2024-02-29")).toBe(true);
    expect(validDay("2026-02-29")).toBe(false);
  });
  it("excludes YAML, completed tasks and fenced examples from due lists", () => {
    const text = "---\n- [ ] YAML 📅 2026-09-27\n---\n- [x] Done 📅 2026-09-27\n~~~md\n- [ ] Example 📅 2026-09-27\n~~~\n- [ ] Real [due:: 2026-09-27]\n- [ ] No date";
    expect(datedTasks(text).map(task => task.due)).toEqual(["2026-09-27", null]);
    expect(taskProgress(text)).toEqual({ done: 1, total: 3 });
  });
  it("distinguishes an exact folder from similarly named siblings", () => {
    expect(inFolder("Projects/A.md", "Projects/")).toBe(true);
    expect(inFolder("Projects2/A.md", "Projects")).toBe(false);
  });
});

describe("focus and configuration recovery", () => {
  it("recovers a running timer from wall time, clamps completion and retains pauses", () => {
    const session = normalizeFocus({ endAt: 5000, remainingMs: 4000, durationMinutes: 25 });
    expect(focusRemaining(session, 3000)).toBe(2000);
    expect(focusRemaining(session, 8000)).toBe(0);
    expect(focusRemaining({ ...session, endAt: 0, remainingMs: 2000 }, 8000)).toBe(2000);
    expect(normalizeFocus({ durationMinutes: NaN, remainingMs: Infinity }).remainingMs).toBe(25 * 60000);
  });
  it("keeps all new workflows opt-in on migrated layouts and preserves per-page sources", () => {
    const settings = normalizeSettings({ pages: [{ id: "home", name: "Home", defaultVisible: true, moduleOptions: { "project-next": { visible: true, limit: 5, folder: "Projects" }, "note-preview": { visible: true, path: "Weekly.md", limit: 3 }, "saved-search": { visible: true, query: 'tag:#work', limit: 3 }, "multi-search": { visible: true, sites: ["bing"], limit: 3 } } }] });
    expect(moduleOptions(settings, "project-next").folder).toBe("Projects");
    expect(moduleOptions(settings, "note-preview").path).toBe("Weekly.md");
    expect(moduleOptions(settings, "saved-search").query).toBe('tag:#work');
    expect(moduleOptions(settings, "multi-search").sites).toEqual(["bing"]);
    for (const id of Object.keys(PRODUCTIVITY_MODULES)) expect(moduleOptions(DEFAULT_SETTINGS, id).visible).toBe(false);
    expect(moduleOptions(settings, "focus-timer").visible).toBe(false);
  });
});
