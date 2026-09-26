import { Plugin, type WorkspaceLeaf } from "obsidian";
import { t } from "./i18n";
import { DEFAULT_SETTINGS, normalizeSettings, type HomeSettings } from "./settings";
import { HomeSettingTab } from "./settings-tab";
import { HOME_VIEW_TYPE, HomeView } from "./view";
import { WallpaperService } from "./wallpaper/service";

/** How long to wait after a layout change before claiming an empty tab, so a plugin that is opening its own view wins. */
const CLAIM_DELAY_MS = 40;

export default class QiaomuHomePlugin extends Plugin {
  settings: HomeSettings = structuredClone(DEFAULT_SETTINGS);
  wallpaper!: WallpaperService;
  private homeSettingTab!: HomeSettingTab;
  private claimTimer: number | null = null;
  private claiming = new WeakSet<WorkspaceLeaf>();

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.wallpaper = new WallpaperService(this);
    this.registerView(HOME_VIEW_TYPE, (leaf) => new HomeView(leaf, this));

    this.addRibbonIcon("house", t("ribbon.open"), () => void this.openHome());
    this.addCommand({ id: "open", name: t("cmd.open"), callback: () => void this.openHome() });
    this.addCommand({ id: "focus-search", name: t("cmd.focusSearch"), callback: () => void this.openHome().then((view) => view?.focusSearch()) });
    this.addCommand({
      id: "next-wallpaper", name: t("cmd.nextWallpaper"),
      checkCallback: (checking) => {
        if (!this.wallpaper.canRotate()) return false;
        if (!checking) void this.wallpaper.next();
        return true;
      },
    });
    this.homeSettingTab = new HomeSettingTab(this.app, this);
    this.addSettingTab(this.homeSettingTab);

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.openOnStartup) void this.openHome({ startup: true });
      this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleClaim()));
      this.scheduleClaim();
    });
  }

  onunload(): void {
    if (this.claimTimer !== null) window.clearTimeout(this.claimTimer);
  }

  eachView(callback: (view: HomeView) => void): void {
    for (const leaf of this.app.workspace.getLeavesOfType(HOME_VIEW_TYPE)) {
      if (leaf.view instanceof HomeView) callback(leaf.view);
    }
  }

  async saveSettings(options: { rerender?: boolean } = {}): Promise<void> {
    await this.saveData(this.settings);
    if (options.rerender !== false) this.eachView((view) => view.render());
  }

  /** Opens this plugin's page in Obsidian settings. */
  openSettings(pageId?: string): void {
    this.homeSettingTab.editPage(pageId);
    const setting = (this.app as unknown as { setting?: { open?(): void; openTabById?(id: string): unknown } }).setting;
    setting?.open?.();
    setting?.openTabById?.(this.manifest.id);
  }

  /** Opens Home: focuses the Home tab already in front, reuses an empty tab, or opens a new tab. */
  async openHome(options: { startup?: boolean } = {}): Promise<HomeView | null> {
    const workspace = this.app.workspace;
    const current = workspace.getMostRecentLeaf();
    let leaf: WorkspaceLeaf | null = current?.view.getViewType() === HOME_VIEW_TYPE ? current : null;
    if (!leaf && options.startup) leaf = workspace.getLeavesOfType(HOME_VIEW_TYPE).find((candidate) => candidate.getRoot() === workspace.rootSplit) ?? null;
    if (!leaf && current?.view.getViewType() === "empty") leaf = current;
    if (!leaf) leaf = workspace.getLeaf("tab");
    if (leaf.view.getViewType() !== HOME_VIEW_TYPE) await leaf.setViewState({ type: HOME_VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
    workspace.setActiveLeaf(leaf, { focus: true });
    return leaf.view instanceof HomeView ? leaf.view : null;
  }

  private scheduleClaim(): void {
    if (!this.settings.replaceNewTab || this.claimTimer !== null) return;
    this.claimTimer = window.setTimeout(() => {
      this.claimTimer = null;
      this.claimEmptyTabs();
    }, CLAIM_DELAY_MS);
  }

  /** Turns every empty tab in the main area (and pop-out windows) into Home. Sidebars are left alone. */
  private claimEmptyTabs(): void {
    if (!this.settings.replaceNewTab) return;
    const workspace = this.app.workspace;
    const recent = workspace.getMostRecentLeaf();
    workspace.iterateAllLeaves((leaf) => {
      if (leaf.view.getViewType() !== "empty" || this.claiming.has(leaf)) return;
      const root = leaf.getRoot();
      if (root === workspace.leftSplit || root === workspace.rightSplit) return;
      this.claiming.add(leaf);
      void leaf.setViewState({ type: HOME_VIEW_TYPE, active: leaf === recent })
        .catch((error: unknown) => console.error("Qiaomu Home: could not open in a new tab", error))
        .finally(() => this.claiming.delete(leaf));
    });
  }
}
