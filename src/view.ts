import { Events, ItemView, Keymap, Menu, Notice, Platform, TFile, debounce, setIcon, type App, type WorkspaceLeaf } from "obsidian";
import { builtinActions, createNamedNote, newNote, type CreateAction } from "./actions";
import { askAgent, canAsk } from "./agent-bridge";
import { loadBookmarks } from "./bookmarks";
import {
  KNOWN_PLUGINS, commandExists, installState, localized, openCommunityPluginSettings, openPluginPage, pluginName, runCommand,
} from "./ecosystem";
import { greeting, relativeTime, t } from "./i18n";
import type QiaomuHomePlugin from "./main";
import type { HomeSettings } from "./settings";
import { HOME_CHANGED_EVENT, findHomeProviders, type HomeAction, type HomeItem, type HomeProvider, type HomeSection } from "./protocol/qiaomu-home";
import { SEARCHABLE, noteNameFromQuery, rankNotes, type NoteCandidate } from "./search";
import { loadActions, loadSections, searchProvider, type SourceResult } from "./sources";
import { captureNote, todaySummary } from "./today";

export const HOME_VIEW_TYPE = "qiaomu-home";

const NOTE_RESULTS = 6;
const PROVIDER_RESULTS = 4;
const RECENT_NOTES = 5;

/** One selectable row in the search dropdown. */
interface ResultRow {
  el: HTMLElement;
  run(newTab: boolean): void;
}

function sourceOrder(id: string): number {
  const index = KNOWN_PLUGINS.findIndex((plugin) => plugin.id === id);
  return index === -1 ? KNOWN_PLUGINS.length : index;
}

function sortedProviders(providers: Array<[string, HomeProvider]>): Array<[string, HomeProvider]> {
  return [...providers].sort(([a], [b]) => sourceOrder(a) - sourceOrder(b) || a.localeCompare(b));
}

/** Every action Home can offer, in the user's saved order; new actions from providers join at the end. */
export function collectActions(app: App, settings: HomeSettings): CreateAction[] {
  const all: CreateAction[] = [...builtinActions(app)];
  for (const [id, provider] of sortedProviders(findHomeProviders(app))) {
    for (const action of loadActions(provider)) {
      all.push({ key: `${id}:${action.id}`, label: action.label, icon: action.icon, run: () => action.run() });
    }
  }
  for (const command of settings.commands) {
    if (!commandExists(app, command.id)) continue;
    all.push({ key: `command:${command.id}`, label: command.label, icon: command.icon, run: () => { if (!runCommand(app, command.id)) new Notice(t("error.command")); } });
  }
  const order = new Map(settings.actions.map((key, index) => [key, index]));
  return all.sort((a, b) => (order.get(a.key) ?? Infinity) - (order.get(b.key) ?? Infinity));
}

/** Screen-reader name for an icon-only control, without creating a hover tooltip. */
function hiddenLabel(el: HTMLElement, text: string): void {
  el.createSpan({ cls: "qh-sr-only", text });
}

export class HomeView extends ItemView {
  private pageEl!: HTMLElement;
  private photoEl!: HTMLElement;
  private creditEl!: HTMLElement;
  private wallButton!: HTMLElement;
  private createEl!: HTMLElement;
  private headEl!: HTMLElement;
  private timeEl: HTMLElement | null = null;
  private subEl: HTMLElement | null = null;
  private inputEl!: HTMLInputElement;
  private clearEl!: HTMLElement;
  private resultsEl!: HTMLElement;
  private gridEl!: HTMLElement;

  private rows: ResultRow[] = [];
  private activeRow = 0;
  private searchGeneration = 0;
  private sectionsGeneration = 0;
  private photoGeneration = 0;
  private lastMinute = "";
  private readonly refreshSoon = debounce(() => this.refreshContent(), 150, true);

  constructor(leaf: WorkspaceLeaf, private plugin: QiaomuHomePlugin) {
    super(leaf);
    this.navigation = false;
  }

  getViewType(): string { return HOME_VIEW_TYPE; }
  getDisplayText(): string { return t("view.title"); }
  getIcon(): string { return "house"; }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("qh-root");
    const backdrop = root.createDiv({ cls: "qh-backdrop" });
    this.photoEl = backdrop.createDiv({ cls: "qh-photo" });
    backdrop.createDiv({ cls: "qh-shade" });

    this.pageEl = root.createDiv({ cls: "qh-page" });
    this.headEl = this.pageEl.createDiv({ cls: "qh-head" });
    this.buildSearch(this.pageEl.createDiv({ cls: "qh-bar" }));
    this.gridEl = this.pageEl.createDiv({ cls: "qh-grid" });
    this.buildCorner(root.createDiv({ cls: "qh-corner" }));

    this.registerEvent((this.app.workspace as Events).on(HOME_CHANGED_EVENT, () => this.refreshSoon()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => { if (leaf === this.leaf) this.refreshSoon(); }));
    this.registerEvent(this.app.vault.on("rename", () => this.refreshSoon()));
    this.registerEvent(this.app.vault.on("delete", () => this.refreshSoon()));
    this.registerDomEvent(root.ownerDocument, "pointerdown", (event) => {
      const target = event.target as Node | null;
      if (target && (this.resultsEl.contains(target) || target === this.inputEl)) return;
      this.closeResults();
    });
    this.registerInterval(window.setInterval(() => this.tick(), 1000));

    this.renderHead();
    this.refreshContent();
    this.focusSearchSoon();
    // Pick today's photo (or a fresh one) before painting, so the page does not flash the previous wallpaper.
    await this.plugin.wallpaper.prepareForView();
    await this.renderPhoto();
  }

  async onClose(): Promise<void> {
    this.searchGeneration++;
    this.sectionsGeneration++;
    this.photoGeneration++;
    this.contentEl.empty();
  }

  /** Re-renders everything that depends on settings. Called by the plugin after settings change. */
  render(): void {
    this.renderHead();
    this.refreshContent();
    void this.renderPhoto();
  }

  focusSearch(): void {
    this.inputEl.focus();
    this.inputEl.select();
  }

  private focusSearchSoon(): void {
    // On phones focusing would pop the keyboard over the page; there the user taps the field.
    if (Platform.isMobile) return;
    window.setTimeout(() => { if (this.app.workspace.getMostRecentLeaf() === this.leaf) this.focusSearch(); }, 50);
  }

  // Header -----------------------------------------------------------------

  private renderHead(): void {
    this.headEl.empty();
    this.timeEl = this.subEl = null;
    this.lastMinute = "";
    const headline = this.plugin.settings.headline;
    if (headline === "clock") {
      this.timeEl = this.headEl.createDiv({ cls: "qh-time" });
      this.subEl = this.headEl.createDiv({ cls: "qh-sub" });
      this.tick();
      return;
    }
    const brand = this.headEl.createDiv({ cls: "qh-brand" });
    setIcon(brand.createSpan({ cls: "qh-brand-mark" }), headline === "brand" ? "trees" : "vault");
    brand.createSpan({ cls: "qh-brand-name", text: headline === "brand" ? t("brand") : this.app.vault.getName() });
  }

  private tick(): void {
    if (!this.timeEl || !this.subEl) return;
    const now = new Date();
    const minute = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    if (minute === this.lastMinute) return;
    this.lastMinute = minute;
    this.timeEl.setText(minute);
    const date = now.toLocaleDateString([], { month: "long", day: "numeric", weekday: "long" });
    this.subEl.setText(`${greeting(now.getHours())} · ${date}`);
  }

  // Wallpaper --------------------------------------------------------------

  async renderPhoto(): Promise<void> {
    const generation = ++this.photoGeneration;
    const shown = await this.plugin.wallpaper.resolve(this.contentEl.ownerDocument.defaultView ?? window);
    if (generation !== this.photoGeneration) return;
    const root = this.contentEl;
    root.style.setProperty("--qh-dim", String(this.plugin.settings.wallpaper.dim));
    this.creditEl.empty();
    this.wallButton.toggleClass("is-off", !shown);
    if (!shown) {
      root.removeClass("qh-has-photo");
      this.photoEl.style.removeProperty("background-image");
      return;
    }
    root.addClass("qh-has-photo");
    if (shown.color) root.style.setProperty("--qh-photo-color", shown.color);
    const img = new Image();
    img.onload = () => {
      if (generation !== this.photoGeneration) return;
      this.photoEl.style.backgroundImage = `url("${shown.url.replace(/"/g, "%22")}")`;
      this.photoEl.addClass("is-loaded");
    };
    img.src = shown.url;
    if (shown.photo) {
      const link = this.creditEl.createEl("a", { cls: "qh-credit-link", text: t("wallpaper.credit", { name: shown.photo.author }), href: shown.photo.page });
      link.target = "_blank";
      link.rel = "noopener";
    }
  }

  /** Top-right corner: photo credit, change wallpaper (right-click for more), Home settings. */
  private buildCorner(corner: HTMLElement): void {
    this.creditEl = corner.createDiv({ cls: "qh-credit" });
    this.wallButton = corner.createEl("button", { cls: "qh-corner-button" });
    setIcon(this.wallButton, "image");
    hiddenLabel(this.wallButton, t("wallpaper.next"));
    this.wallButton.addEventListener("click", (event) => {
      if (this.plugin.wallpaper.canRotate()) this.nextWallpaper();
      else this.wallpaperMenu(event);
    });
    this.wallButton.addEventListener("contextmenu", (event) => { event.preventDefault(); this.wallpaperMenu(event); });
    const gear = corner.createEl("button", { cls: "qh-corner-button" });
    setIcon(gear, "settings-2");
    hiddenLabel(gear, t("settings.open"));
    gear.addEventListener("click", () => this.plugin.openSettings());
  }

  private nextWallpaper(): void {
    this.photoEl.removeClass("is-loaded");
    this.wallButton.addClass("is-spinning");
    void this.plugin.wallpaper.next().finally(() => this.wallButton.removeClass("is-spinning"));
  }

  private wallpaperMenu(event: MouseEvent): void {
    const wall = this.plugin.settings.wallpaper;
    const menu = new Menu();
    if (this.plugin.wallpaper.canRotate()) menu.addItem((item) => item.setTitle(t("wallpaper.next")).setIcon("shuffle").onClick(() => this.nextWallpaper()));
    const page = wall.source !== "local" && wall.source !== "none" ? wall.current?.page : undefined;
    if (page) menu.addItem((item) => item.setTitle(t("wallpaper.view")).setIcon("external-link").onClick(() => { window.open(page); }));
    menu.addSeparator();
    const sources: Array<[typeof wall.source, string]> = [["curated", t("wallpaper.curated")], ["none", t("wallpaper.none")]];
    if (wall.unsplashSecret) sources.splice(1, 0, ["unsplash", t("wallpaper.unsplash")]);
    if (wall.localPath) sources.splice(-1, 0, ["local", t("wallpaper.local")]);
    for (const [source, label] of sources) {
      menu.addItem((item) => item.setTitle(label).setChecked(wall.source === source).onClick(async () => {
        wall.source = source;
        await this.plugin.saveSettings({ rerender: false });
        await this.plugin.wallpaper.prepareForView();
        this.plugin.eachView((view) => void view.renderPhoto());
      }));
    }
    menu.addSeparator();
    menu.addItem((item) => item.setTitle(t("wallpaper.settings")).setIcon("settings-2").onClick(() => this.plugin.openSettings()));
    menu.showAtMouseEvent(event);
  }

  // Search -----------------------------------------------------------------

  private buildSearch(bar: HTMLElement): void {
    const form = bar.createEl("form", { cls: "qh-search" });
    form.setAttr("role", "search");
    const label = form.createEl("label", { cls: "qh-search-icon" });
    setIcon(label, "search");
    hiddenLabel(label, t("search.label"));
    this.inputEl = form.createEl("input", { cls: "qh-search-input", type: "search", placeholder: t("search.placeholder") });
    this.inputEl.id = `qh-search-${Math.random().toString(36).slice(2)}`;
    label.htmlFor = this.inputEl.id;
    this.inputEl.setAttrs({ autocomplete: "off", spellcheck: "false", enterkeyhint: "search", "aria-autocomplete": "list" });
    this.clearEl = form.createEl("button", { cls: "qh-icon-button qh-search-clear", type: "button" });
    setIcon(this.clearEl, "x");
    hiddenLabel(this.clearEl, t("search.clear"));
    this.clearEl.hide();
    this.clearEl.addEventListener("click", () => { this.inputEl.value = ""; this.onQuery(); this.inputEl.focus(); });
    form.addEventListener("submit", (event) => event.preventDefault());
    this.inputEl.addEventListener("input", () => this.onQuery());
    this.inputEl.addEventListener("focus", () => { if (this.inputEl.value.trim()) this.onQuery(); });
    this.inputEl.addEventListener("keydown", (event) => this.onSearchKey(event));

    this.createEl = bar.createDiv({ cls: "qh-create" });

    this.resultsEl = form.createDiv({ cls: "qh-results" });
    this.resultsEl.id = `${this.inputEl.id}-results`;
    this.resultsEl.setAttr("role", "listbox");
    this.inputEl.setAttr("aria-controls", this.resultsEl.id);
    this.resultsEl.hide();
  }

  private onSearchKey(event: KeyboardEvent): void {
    if (event.isComposing) return;
    const query = this.inputEl.value.trim();
    if (event.key === "Escape") {
      if (this.inputEl.value) { event.preventDefault(); this.inputEl.value = ""; this.onQuery(); }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!this.rows.length) return;
      event.preventDefault();
      this.setActiveRow((this.activeRow + (event.key === "ArrowDown" ? 1 : -1) + this.rows.length) % this.rows.length);
      return;
    }
    if (event.key !== "Enter" || !query) return;
    event.preventDefault();
    if (event.shiftKey && !Keymap.isModifier(event, "Mod")) {
      void this.capture(query);
      return;
    }
    if (Keymap.isModifier(event, "Mod") && canAsk(this.app)) {
      this.closeResults();
      void askAgent(this.app, query);
      return;
    }
    this.rows[this.activeRow]?.run(false);
  }

  private async capture(query: string): Promise<void> {
    const target = this.plugin.settings.captureTarget === "daily" ? t("capture.daily") : t("capture.inbox");
    try {
      await captureNote(this.app, this.plugin.settings, query);
      if (this.inputEl.value.trim() === query) { this.inputEl.value = ""; this.onQuery(); }
      new Notice(t("capture.saved", { target }));
      this.refreshSoon();
    } catch (error) {
      new Notice(t("capture.failed", { message: error instanceof Error ? error.message : String(error) }));
    }
  }

  private onQuery(): void {
    const query = this.inputEl.value.trim();
    this.clearEl.toggle(this.inputEl.value.length > 0);
    const generation = ++this.searchGeneration;
    if (!query) { this.closeResults(); return; }
    this.renderResults(query, generation);
  }

  private closeResults(): void {
    this.resultsEl.hide();
    this.resultsEl.empty();
    this.rows = [];
    this.inputEl.setAttr("aria-expanded", "false");
  }

  private candidates(): NoteCandidate[] {
    return this.app.vault.getFiles().map((file) => {
      const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases as unknown;
      return {
        path: file.path, basename: file.basename, extension: file.extension.toLowerCase(), mtime: file.stat.mtime,
        aliases: Array.isArray(aliases) ? aliases.filter((alias): alias is string => typeof alias === "string") : typeof aliases === "string" ? [aliases] : [],
      };
    });
  }

  private renderResults(query: string, generation: number): void {
    const list = this.resultsEl;
    list.empty();
    this.rows = [];
    list.show();
    this.inputEl.setAttr("aria-expanded", "true");

    const notes = rankNotes(query, this.candidates(), this.app.workspace.getLastOpenFiles(), NOTE_RESULTS);
    const notesGroup = list.createDiv({ cls: "qh-result-group" });
    notesGroup.createDiv({ cls: "qh-result-heading", text: t("search.notes") });
    if (!notes.length) notesGroup.createDiv({ cls: "qh-result-empty", text: t("search.none") });
    for (const note of notes) {
      this.addRow(notesGroup, {
        icon: note.extension === "md" ? "file-text" : note.extension === "canvas" ? "layout-dashboard" : note.extension === "base" ? "database" : "file",
        title: note.title, detail: note.alias ? `${note.alias} · ${note.folder}` : note.folder,
        run: (newTab) => this.openPath(note.path, newTab),
      });
    }

    // Provider groups keep their slot in the list so late answers do not reorder what the user is looking at.
    for (const [id, provider] of sortedProviders(findHomeProviders(this.app))) {
      if (typeof provider.search !== "function") continue;
      const group = list.createDiv({ cls: "qh-result-group" });
      group.hide();
      void searchProvider(provider, query, PROVIDER_RESULTS).then((items) => {
        if (generation !== this.searchGeneration || !items.length) return;
        group.createDiv({ cls: "qh-result-heading", text: pluginName(this.app, id) });
        const active = this.rows[this.activeRow];
        for (const item of items) this.addRow(group, { icon: item.icon ?? "circle", title: item.title, detail: item.subtitle ?? item.meta ?? "", run: () => void item.open() });
        group.show();
        // Keep keyboard order equal to what is on screen, and keep the highlight on the same row.
        this.rows.sort((a, b) => a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        if (active) this.setActiveRow(this.rows.indexOf(active));
      });
    }

    const commands = list.createDiv({ cls: "qh-result-group qh-result-commands" });
    this.addRow(commands, { icon: "pencil-line", title: t("search.capture", { q: query,
      target: this.plugin.settings.captureTarget === "daily" ? t("capture.daily") : t("capture.inbox") }),
      hint: t("search.hint.capture"), run: () => void this.capture(query) });
    if (!notes.some((note) => note.title.toLowerCase() === query.toLowerCase())) {
      const name = noteNameFromQuery(query);
      if (name) this.addRow(commands, { icon: "file-plus", title: t("search.create", { q: name }), run: () => void createNamedNote(this.app, this.leaf, name) });
    }
    if (canAsk(this.app)) {
      this.addRow(commands, { icon: "sparkles", title: t("search.ask", { q: query }), hint: t("search.hint.ask"), run: () => void askAgent(this.app, query) });
    }
    if (commandExists(this.app, "global-search:open")) {
      this.addRow(commands, { icon: "text-search", title: t("search.fullText", { q: query }), run: () => this.openGlobalSearch(query) });
    }
    this.setActiveRow(0);
  }

  private addRow(group: HTMLElement, row: { icon: string; title: string; detail?: string; hint?: string; run(newTab: boolean): void }): void {
    const el = group.createDiv({ cls: "qh-result" });
    el.setAttr("role", "option");
    setIcon(el.createSpan({ cls: "qh-result-icon" }), row.icon);
    const text = el.createDiv({ cls: "qh-result-text" });
    text.createDiv({ cls: "qh-result-title", text: row.title });
    if (row.detail) text.createDiv({ cls: "qh-result-detail", text: row.detail });
    if (row.hint && !Platform.isMobile) el.createSpan({ cls: "qh-result-hint", text: row.hint });
    const entry: ResultRow = { el, run: (newTab) => { this.closeResults(); row.run(newTab); } };
    this.rows.push(entry);
    el.addEventListener("pointerenter", () => this.setActiveRow(this.rows.indexOf(entry)));
    el.addEventListener("click", (event) => entry.run(Keymap.isModEvent(event) !== false));
    el.addEventListener("auxclick", (event) => { if (event.button === 1) entry.run(true); });
  }

  private setActiveRow(index: number): void {
    this.rows[this.activeRow]?.el.removeClass("is-active");
    this.activeRow = Math.max(0, Math.min(index, this.rows.length - 1));
    const row = this.rows[this.activeRow];
    if (!row) return;
    row.el.addClass("is-active");
    row.el.scrollIntoView({ block: "nearest" });
  }

  private openPath(path: string, newTab: boolean): void {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const leaf = newTab ? this.app.workspace.getLeaf("tab") : this.leaf;
    void leaf.openFile(file, { active: true });
  }

  private openGlobalSearch(query: string): void {
    const search = (this.app as unknown as { internalPlugins?: { getPluginById?(id: string): { instance?: { openGlobalSearch?(q: string): void } } | null } })
      .internalPlugins?.getPluginById?.("global-search")?.instance;
    if (typeof search?.openGlobalSearch === "function") search.openGlobalSearch(query);
    else runCommand(this.app, "global-search:open");
  }

  // Create row -------------------------------------------------------------

  /** Today's note and "new note" sit next to search; everything else lives in the ▾ menu. */
  private renderCreate(): void {
    const group = this.createEl;
    group.empty();
    const settings = this.plugin.settings;
    const actions = collectActions(this.app, settings);
    const daily = settings.showDaily ? actions.find((action) => action.key === "builtin:daily") : undefined;
    if (daily) {
      const today = group.createEl("button", { cls: "qh-pill-button qh-today" });
      setIcon(today.createSpan({ cls: "qh-pill-icon" }), "calendar-days");
      today.createSpan({ cls: "qh-pill-text", text: t("new.today") });
      today.addEventListener("click", () => this.runAction(daily));
    }
    const split = group.createDiv({ cls: "qh-split" });
    const main = split.createEl("button", { cls: "qh-pill-button qh-new" });
    setIcon(main.createSpan({ cls: "qh-pill-icon" }), "plus");
    main.createSpan({ cls: "qh-pill-text", text: t("new.note") });
    main.addEventListener("click", () => void newNote(this.app, this.leaf));
    const hidden = new Set(settings.hiddenActions);
    const more = actions.filter((action) => action !== daily && !hidden.has(action.key));
    const chevron = split.createEl("button", { cls: "qh-pill-button qh-new-more" });
    setIcon(chevron, "chevron-down");
    hiddenLabel(chevron, t("new.more"));
    chevron.addEventListener("click", (event) => {
      const menu = new Menu();
      for (const action of more) menu.addItem((item) => item.setTitle(action.label).setIcon(action.icon).onClick(() => this.runAction(action)));
      if (more.length) menu.addSeparator();
      menu.addItem((item) => item.setTitle(t("menu.customize")).setIcon("settings-2").onClick(() => this.plugin.openSettings()));
      const rect = chevron.getBoundingClientRect();
      menu.showAtPosition({ x: rect.right, y: rect.bottom + 6, left: true });
      event.preventDefault();
    });
  }

  private runAction(action: CreateAction): void {
    this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
    void Promise.resolve(action.run(this.leaf)).catch((error: unknown) => console.error("Qiaomu Home: action failed", error));
  }

  // Continue area ----------------------------------------------------------

  private refreshContent(): void {
    if (!this.gridEl) return;
    this.renderCreate();
    const generation = ++this.sectionsGeneration;
    const providers = sortedProviders(findHomeProviders(this.app));
    const withProvider = new Set(providers.map(([id]) => id));
    const grid = this.gridEl;
    // Build the new grid off-screen and swap it in once, so refreshes do not flicker.
    // The first render swaps immediately so local cards show without waiting for slower sources.
    const next = this.contentEl.createDiv({ cls: "qh-grid" });
    next.detach();
    const first = !grid.hasChildNodes();

    const todaySlot = next.createDiv({ cls: "qh-slot" });
    const bookmarksSlot = next.createDiv({ cls: "qh-slot" });
    void this.renderNative(todaySlot, bookmarksSlot, generation);
    if (this.plugin.settings.showRecent) this.renderRecent(next);
    const slots = providers.map(([id]) => ({ id, slot: next.createDiv({ cls: "qh-slot" }) }));
    for (const plugin of KNOWN_PLUGINS) {
      if (withProvider.has(plugin.id) || installState(this.app, plugin.id) !== "enabled") continue;
      this.renderLegacy(next, plugin.id);
    }
    this.renderRecommendations(next);

    if (first) { grid.replaceWith(next); this.gridEl = next; }
    void Promise.all(providers.map(async ([id, provider], index) => {
      const result = await loadSections(provider);
      if (generation !== this.sectionsGeneration) return;
      this.fillSlot(slots[index].slot, id, result);
    })).then(() => {
      if (generation !== this.sectionsGeneration || first) return;
      grid.replaceWith(next);
      this.gridEl = next;
    });
  }

  private async renderNative(todaySlot: HTMLElement, bookmarksSlot: HTMLElement, generation: number): Promise<void> {
    if (commandExists(this.app, "daily-notes")) {
      try {
        const { file, characters } = await todaySummary(this.app);
        if (generation !== this.sectionsGeneration) return;
        const card = todaySlot.createDiv({ cls: "qh-card qh-card-compact" });
        const head = card.createDiv({ cls: "qh-card-head" });
        setIcon(head.createSpan({ cls: "qh-card-icon" }), "calendar-days");
        head.createSpan({ cls: "qh-card-title", text: t("section.today") });
        const open = () => { if (file) this.openPath(file.path, false); else runCommand(this.app, "daily-notes"); };
        const row = card.createEl("button", { cls: "qh-today-row" });
        row.createSpan({ text: file ? t("section.today.count", { n: characters }) : t("section.today.empty") });
        setIcon(row.createSpan(), "arrow-up-right");
        row.addEventListener("click", open);
      } catch (error) { console.error("Qiaomu Home: today card failed", error); }
    }
    const bookmarks = await loadBookmarks(this.app);
    if (generation !== this.sectionsGeneration || !bookmarks.length) return;
    const card = bookmarksSlot.createDiv({ cls: "qh-card" });
    const head = card.createDiv({ cls: "qh-card-head" });
    setIcon(head.createSpan({ cls: "qh-card-icon" }), "bookmark");
    head.createSpan({ cls: "qh-card-title", text: t("section.bookmarks") });
    const list = card.createDiv({ cls: "qh-bookmarks" });
    for (const bookmark of bookmarks) {
      const button = list.createEl("button", { cls: "qh-bookmark" });
      setIcon(button.createSpan(), bookmark.type === "search" ? "search" : "file-text");
      button.createSpan({ text: bookmark.title });
      button.addEventListener("click", () => {
        if (bookmark.type === "search") this.openGlobalSearch(bookmark.value);
        else if (bookmark.subpath) void this.app.workspace.openLinkText(`${bookmark.value}${bookmark.subpath}`, "", false);
        else this.openPath(bookmark.value, false);
      });
    }
  }

  private fillSlot(slot: HTMLElement, id: string, result: SourceResult): void {
    if (result.status === "error") {
      const card = slot.createDiv({ cls: "qh-card qh-card-muted" });
      card.createDiv({ cls: "qh-card-empty", text: t("error.source", { name: pluginName(this.app, id) }) });
      return;
    }
    for (const section of result.sections) this.renderSection(slot, id, section);
  }

  private renderSection(parent: HTMLElement, sourceId: string, section: HomeSection): void {
    const card = parent.createDiv({ cls: "qh-card" });
    card.dataset.source = sourceId;
    const head = card.createDiv({ cls: "qh-card-head" });
    const known = KNOWN_PLUGINS.find((plugin) => plugin.id === sourceId);
    setIcon(head.createSpan({ cls: "qh-card-icon" }), known?.icon ?? "puzzle");
    head.createSpan({ cls: "qh-card-title", text: section.title });
    if (section.more) this.actionButton(head, section.more, "qh-card-more", true);
    if (!section.items.length) {
      card.createDiv({ cls: "qh-card-empty", text: section.empty ?? "" });
      return;
    }
    const list = card.createDiv({ cls: "qh-list" });
    for (const item of section.items) this.renderItem(list, item);
  }

  private renderItem(list: HTMLElement, item: HomeItem): void {
    const row = list.createDiv({ cls: "qh-item" });
    row.tabIndex = 0;
    row.setAttr("role", "button");
    if (item.active) row.addClass("is-active");
    const thumb = row.createDiv({ cls: "qh-thumb" });
    const showIcon = () => { thumb.empty(); thumb.addClass("is-icon"); setIcon(thumb, item.icon ?? "circle"); };
    if (item.image) {
      const img = thumb.createEl("img", { attr: { alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" } });
      img.addEventListener("error", showIcon, { once: true });
      img.src = item.image;
    } else showIcon();
    const body = row.createDiv({ cls: "qh-item-body" });
    body.createDiv({ cls: "qh-item-title", text: item.title });
    const line = [item.subtitle, item.meta].filter(Boolean).join(" · ");
    if (line) body.createDiv({ cls: "qh-item-sub", text: line });
    if (item.progress !== undefined) {
      const bar = body.createDiv({ cls: "qh-progress" });
      bar.createDiv({ cls: "qh-progress-fill" }).style.width = `${Math.round(item.progress * 100)}%`;
    }
    for (const action of item.actions ?? []) this.actionButton(row, action, "qh-item-action", false);
    const open = () => void Promise.resolve(item.open()).catch((error: unknown) => console.error("Qiaomu Home: open failed", error));
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  }

  private actionButton(parent: HTMLElement, action: HomeAction, cls: string, withText: boolean): void {
    const button = parent.createEl("button", { cls: `qh-icon-button ${cls}` });
    setIcon(button.createSpan({ cls: "qh-button-icon" }), action.icon || "arrow-right");
    if (withText) button.createSpan({ cls: "qh-button-text", text: action.label });
    else hiddenLabel(button, action.label);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void Promise.resolve(action.run()).catch((error: unknown) => console.error("Qiaomu Home: action failed", error));
    });
    button.addEventListener("keydown", (event) => event.stopPropagation());
  }

  private renderRecent(parent: HTMLElement): void {
    const card = parent.createDiv({ cls: "qh-card" });
    const head = card.createDiv({ cls: "qh-card-head" });
    setIcon(head.createSpan({ cls: "qh-card-icon" }), "history");
    head.createSpan({ cls: "qh-card-title", text: t("section.recent") });
    const files = this.app.workspace.getLastOpenFiles()
      .map((path) => this.app.vault.getAbstractFileByPath(path))
      .filter((file): file is TFile => file instanceof TFile && SEARCHABLE.has(file.extension.toLowerCase()))
      .slice(0, RECENT_NOTES);
    if (!files.length) { card.createDiv({ cls: "qh-card-empty", text: t("section.recent.empty") }); return; }
    const list = card.createDiv({ cls: "qh-list" });
    for (const file of files) {
      this.renderItem(list, {
        id: file.path, title: file.basename, icon: file.extension === "md" ? "file-text" : "file",
        subtitle: file.parent && !file.parent.isRoot() ? file.parent.path : "", meta: relativeTime(file.stat.mtime),
        open: () => this.openPath(file.path, false),
      });
    }
  }

  /** An enabled Qiaomu plugin whose installed version predates the Home protocol: offer to open it. */
  private renderLegacy(parent: HTMLElement, id: string): void {
    const known = KNOWN_PLUGINS.find((plugin) => plugin.id === id);
    if (!known || !commandExists(this.app, known.openCommand)) return;
    const card = parent.createDiv({ cls: "qh-card qh-card-compact" });
    const head = card.createDiv({ cls: "qh-card-head" });
    setIcon(head.createSpan({ cls: "qh-card-icon" }), known.icon);
    head.createSpan({ cls: "qh-card-title", text: localized(known.name) });
    this.actionButton(head, { id: "open", label: t("legacy.open"), icon: "arrow-up-right", run: () => { runCommand(this.app, known.openCommand); } }, "qh-card-more", true);
    card.createDiv({ cls: "qh-card-empty", text: t("legacy.update") });
  }

  private renderRecommendations(parent: HTMLElement): void {
    const settings = this.plugin.settings;
    if (!settings.showRecommendations) return;
    const missing = KNOWN_PLUGINS
      .map((plugin) => ({ plugin, state: installState(this.app, plugin.id) }))
      .filter(({ plugin, state }) => state !== "enabled" && !settings.hiddenRecommendations.includes(plugin.id));
    if (!missing.length) return;
    const card = parent.createDiv({ cls: "qh-card qh-card-recommend" });
    const head = card.createDiv({ cls: "qh-card-head" });
    setIcon(head.createSpan({ cls: "qh-card-icon" }), "sparkles");
    head.createSpan({ cls: "qh-card-title", text: t("section.recommend") });
    const list = card.createDiv({ cls: "qh-list" });
    for (const { plugin, state } of missing) {
      const row = list.createDiv({ cls: "qh-item qh-item-static" });
      setIcon(row.createDiv({ cls: "qh-thumb is-icon" }), plugin.icon);
      const body = row.createDiv({ cls: "qh-item-body" });
      body.createDiv({ cls: "qh-item-title", text: localized(plugin.name) });
      body.createDiv({ cls: "qh-item-sub", text: state === "disabled" ? t("recommend.installed") : localized(plugin.pitch) });
      const primary = row.createEl("button", { cls: "qh-pill", text: state === "disabled" ? t("recommend.enable") : t("recommend.install") });
      primary.addEventListener("click", () => state === "disabled" ? openCommunityPluginSettings(this.app) : openPluginPage(plugin.id));
      const hide = row.createEl("button", { cls: "qh-icon-button qh-item-action" });
      setIcon(hide, "x");
      hiddenLabel(hide, t("recommend.hide"));
      hide.addEventListener("click", () => {
        settings.hiddenRecommendations = [...settings.hiddenRecommendations, plugin.id];
        void this.plugin.saveSettings();
      });
    }
  }
}
