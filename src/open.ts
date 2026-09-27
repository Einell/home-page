import { Keymap, TFile, type App, type PaneType, type WorkspaceLeaf } from "obsidian";

export const HOME_VIEW_TYPE = "qiaomu-home";

/** The Home tab an element belongs to, so a click on a card can navigate that same tab. */
export function homeLeafOf(app: App, from: HTMLElement | null | undefined): WorkspaceLeaf | null {
  if (!from) return null;
  return app.workspace.getLeavesOfType(HOME_VIEW_TYPE).find((leaf) => leaf.view.containerEl.contains(from)) ?? null;
}

/**
 * One rule for every card: a plain click opens in Home's own tab (like a browser start page),
 * ⌘/Ctrl-click or middle-click opens a new tab; the "open in new tab" setting flips the default.
 */
export function leafFor(app: App, from: HTMLElement | null | undefined, event?: MouseEvent | KeyboardEvent | null, newTab = false): WorkspaceLeaf {
  const middle = event instanceof MouseEvent && event.button === 1;
  const modifier: PaneType | boolean = middle ? "tab" : event ? Keymap.isModEvent(event) : false;
  if (modifier) return app.workspace.getLeaf(modifier === true ? "tab" : modifier);
  if (!newTab) { const home = homeLeafOf(app, from); if (home) return home; }
  return app.workspace.getLeaf("tab");
}

export interface HomeOpener { app: App; settings: { openInNewTab: boolean } }

export async function openFromHome(plugin: HomeOpener, from: HTMLElement | null | undefined, file: TFile, event?: MouseEvent | KeyboardEvent | null, line?: number): Promise<void> {
  const leaf = leafFor(plugin.app, from, event, plugin.settings.openInNewTab);
  await leaf.openFile(file, { active: true, ...(line === undefined ? {} : { eState: { line } }) });
}

export async function openPathFromHome(plugin: HomeOpener, from: HTMLElement | null | undefined, path: string, event?: MouseEvent | KeyboardEvent | null, line?: number): Promise<void> {
  const file = plugin.app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) await openFromHome(plugin, from, file, event, line);
}

/** Wires click, middle-click and Enter on an element to open a note. */
export function bindOpen(el: HTMLElement, run: (event: MouseEvent | KeyboardEvent) => void): void {
  el.addEventListener("click", (event) => run(event));
  el.addEventListener("auxclick", (event) => { if (event.button === 1) { event.preventDefault(); run(event); } });
}
