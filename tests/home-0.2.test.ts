import { describe, expect, it } from "vitest";
import { TFile, type App } from "obsidian";
import { flattenBookmarks } from "../src/bookmarks";
import { normalizeSettings } from "../src/settings";
import { captureNote, todayPath } from "../src/today";

describe("Home 0.2", () => {
  it("flattens native bookmark groups and keeps file/search order", () => {
    expect(flattenBookmarks([
      { type: "group", title: "Work", items: [{ type: "file", path: "Notes/Plan.md", subpath: "#Next" }] },
      { type: "search", query: "tag:#idea", title: "Ideas" },
      null,
      { type: "file", path: "Notes/More.md" },
    ])).toEqual([
      { type: "file", title: "Plan", value: "Notes/Plan.md", subpath: "#Next" },
      { type: "search", title: "Ideas", value: "tag:#idea" },
      { type: "file", title: "More", value: "Notes/More.md" },
    ]);
  });

  it("appends repeated captures atomically without opening a note", async () => {
    const files = new Map<string, { file: TFile; content: string }>();
    const app = { vault: {
      adapter: { exists: async () => false },
      getAbstractFileByPath: (path: string) => files.get(path)?.file ?? null,
      create: async (path: string, content: string) => {
        const file = new TFile();
        files.set(path, { file, content });
        return file;
      },
      process: async (file: TFile, transform: (text: string) => string) => {
        const entry = [...files.values()].find((item) => item.file === file);
        if (!entry) throw new Error("missing file");
        entry.content = transform(entry.content);
      },
    } } as unknown as App;
    const settings = normalizeSettings({ captureTarget: "inbox", captureInboxPath: "Inbox.md" });
    await captureNote(app, settings, "first");
    await captureNote(app, settings, "second");
    expect(files.get("Inbox.md")?.content).toBe("- first\n- second\n");
  });

  it("rejects a capture path outside the vault", async () => {
    const settings = normalizeSettings({ captureTarget: "inbox", captureInboxPath: "../outside.md" });
    await expect(captureNote({ vault: { configDir: ".obsidian" } } as App, settings, "text")).rejects.toThrow("Inbox");
  });

  it("uses the daily note folder and template before appending", async () => {
    const template = new TFile();
    let createdPath = "";
    let createdContent = "";
    const app = {
      commands: { commands: { "daily-notes": {} } },
      vault: {
        configDir: ".obsidian",
        adapter: {
          exists: async (path: string) => path === ".obsidian/daily-notes.json" || path === "Journal",
          read: async () => JSON.stringify({ folder: "Journal", format: "YYYY-MM-DD", template: "Templates/Daily" }),
        },
        getAbstractFileByPath: (path: string) => path === "Templates/Daily.md" ? template : null,
        read: async () => "# {{date}}\n",
        create: async (path: string, content: string) => { createdPath = path; createdContent = content; return new TFile(); },
        process: async (_file: TFile, transform: (text: string) => string) => { createdContent = transform(createdContent); },
      },
    } as unknown as App;
    expect(await todayPath(app)).toBe("Journal/2026-09-26.md");
    await captureNote(app, normalizeSettings({ captureTarget: "daily" }), "idea");
    expect(createdPath).toBe("Journal/2026-09-26.md");
    expect(createdContent).toBe("# 2026-09-26\n- idea\n");
  });
});
