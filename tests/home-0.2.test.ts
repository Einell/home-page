import { describe, expect, it } from "vitest";
import { TFile, type App, type WorkspaceLeaf } from "obsidian";
import { normalizeSettings } from "../src/settings";
import { captureNote, todayPath, openTodayNote } from "../src/today";

describe("Home 0.2", () => {
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

it("creates missing daily folders and a templated diary once, then opens without overwriting", async()=>{
  const files=new Map<string,TFile>(); const folders=new Set<string>(); const contents=new Map<string,string>();
  const template=new TFile();files.set("Template.md",template);contents.set("Template.md","# {{title}}\n{{time:HH:mm}}\n");
  const opened:TFile[]=[];
  const app={commands:{commands:{"daily-notes":{}}},internalPlugins:{getPluginById:()=>({instance:{options:{folder:"Diary/2026",template:"Template",format:"YYYY-MM-DD"}}})},vault:{configDir:".obsidian",adapter:{exists:async(p:string)=>folders.has(p)},getAbstractFileByPath:(p:string)=>files.get(p),createFolder:async(p:string)=>{folders.add(p);},read:async(f:TFile)=>contents.get([...files].find(([,v])=>v===f)![0]),create:async(p:string,c:string)=>{if(files.has(p))throw Error("exists");const f=new TFile();files.set(p,f);contents.set(p,c);return f;}}} as unknown as App;
  const leaf={openFile:async(f:TFile)=>{opened.push(f);}} as unknown as WorkspaceLeaf;
  await Promise.all([openTodayNote(app,leaf),openTodayNote(app,leaf)]);
  expect(folders.has("Diary/2026")).toBe(true);
  expect(contents.get("Diary/2026/2026-09-26.md")).toBe("# 2026-09-26\nHH:mm\n");
  contents.set("Diary/2026/2026-09-26.md","User work");await openTodayNote(app,leaf);
  expect(contents.get("Diary/2026/2026-09-26.md")).toBe("User work");
  expect(new Set(opened).size).toBe(1);
});
