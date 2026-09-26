import { Notice, TFile, normalizePath, type App, type WorkspaceLeaf } from "obsidian";
import { commandExists, runCommand } from "./ecosystem";
import { t } from "./i18n";

export interface CreateAction {
  /** "builtin:*", "<pluginId>:<actionId>" or "command:<id>". */
  key: string;
  label: string;
  icon: string;
  run(leaf: WorkspaceLeaf): void | Promise<void>;
}

/** Built-ins map to Obsidian's own commands so they follow the user's new-file location, naming and core-plugin settings. */
const BUILTINS: Array<{ key: string; icon: string; label: () => string; command: string }> = [
  { key: "builtin:daily", icon: "calendar-days", label: () => t("new.daily"), command: "daily-notes" },
  { key: "builtin:canvas", icon: "layout-dashboard", label: () => t("new.canvas"), command: "canvas:new-file" },
  { key: "builtin:base", icon: "database", label: () => t("new.base"), command: "bases:new-file" },
  { key: "builtin:folder", icon: "folder-plus", label: () => t("new.folder"), command: "file-explorer:new-folder" },
];

export function builtinActions(app: App): CreateAction[] {
  const actions: CreateAction[] = BUILTINS.filter((item) => commandExists(app, item.command)).map((item) => ({
    key: item.key, icon: item.icon, label: item.label(),
    run: () => { if (!runCommand(app, item.command)) new Notice(t("error.command")); },
  }));
  actions.push({ key: "builtin:import", icon: "file-up", label: t("new.import"), run: (leaf) => pickAndImport(app, leaf) });
  return actions;
}

/** New untitled note in the current (Home) tab, exactly like Obsidian's own "new note in current tab". */
export async function newNote(app: App, leaf: WorkspaceLeaf): Promise<void> {
  app.workspace.setActiveLeaf(leaf, { focus: true });
  if (runCommand(app, "file-explorer:new-file-in-current-tab")) return;
  await createNamedNote(app, leaf, t("new.untitled"));
}

async function availablePath(app: App, folder: string, name: string, extension: string): Promise<string> {
  const base = normalizePath(folder ? `${folder}/${name}` : name);
  for (let n = 0; n < 1000; n++) {
    const path = `${base}${n ? ` ${n}` : ""}.${extension}`;
    if (!app.vault.getAbstractFileByPath(path)) return path;
  }
  throw new Error("no free file name");
}

/** Creates "<name>.md" in the user's default new-note folder and opens it in the given tab. */
export async function createNamedNote(app: App, leaf: WorkspaceLeaf, name: string): Promise<void> {
  try {
    const folder = app.fileManager.getNewFileParent("").path;
    const path = await availablePath(app, folder === "/" ? "" : folder, name || t("new.untitled"), "md");
    const file = await app.vault.create(path, "");
    await leaf.openFile(file, { active: true, state: { mode: "source" } });
  } catch (error) {
    new Notice(t("error.create", { message: error instanceof Error ? error.message : String(error) }));
  }
}

/** Lets the user pick files from disk, copies them to the attachment folder and opens the first one. */
function pickAndImport(app: App, leaf: WorkspaceLeaf): void {
  // Created in the tab's own window so the file dialog works in pop-out windows too; never attached to the page.
  const input = leaf.view.containerEl.createEl("input", { type: "file" });
  input.detach();
  input.multiple = true;
  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    if (files.length) void importFiles(app, leaf, files);
  }, { once: true });
  input.click();
}

export async function importFiles(app: App, leaf: WorkspaceLeaf, files: File[]): Promise<void> {
  const created: TFile[] = [];
  for (const file of files) {
    try {
      const path = await app.fileManager.getAvailablePathForAttachment(file.name, "");
      created.push(await app.vault.createBinary(path, await file.arrayBuffer()));
    } catch (error) {
      new Notice(t("error.import", { message: error instanceof Error ? error.message : String(error) }));
    }
  }
  if (!created.length) return;
  if (created.length > 1) new Notice(t("notice.imported", { n: created.length }));
  await leaf.openFile(created[0], { active: true });
}
