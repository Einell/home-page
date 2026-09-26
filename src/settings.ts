export type WallpaperSource = "curated" | "unsplash" | "local" | "none";
export type WallpaperRotation = "daily" | "open" | "fixed";
export type Headline = "clock" | "brand" | "vault";

/** A photo Home is showing or has cached. `url` is the image; `page` credits the photographer. */
export interface Photo {
  id: string;
  url: string;
  author: string;
  authorUrl: string;
  page: string;
  color?: string;
  /** Unsplash API only: must be pinged once when the photo is shown, per the API guidelines. */
  downloadLocation?: string;
}

export interface CustomCommand {
  id: string;
  label: string;
  icon: string;
}

export interface ModuleOptions { visible: boolean; limit: number }
export const DEFAULT_MODULE_OPTIONS: ModuleOptions = { visible: true, limit: 3 };

export interface HomePage {
  id: string;
  name: string;
  moduleOptions: Record<string, ModuleOptions>;
  /** Existing layouts show newly discovered modules; a new blank page opts in. */
  defaultVisible: boolean;
  showRecommendations: boolean;
}

export interface HomeSettings {
  openOnStartup: boolean;
  replaceNewTab: boolean;
  headline: Headline;
  wallpaper: {
    source: WallpaperSource;
    rotation: WallpaperRotation;
    /** 0–0.8: how much the photo is darkened behind text. */
    dim: number;
    /** SecretStorage id holding the Unsplash Access Key; never the key itself. */
    unsplashSecret: string;
    query: string;
    localPath: string;
    current: Photo | null;
    /** Local day (YYYY-MM-DD) the current photo was chosen, for daily rotation. */
    chosenOn: string;
  };
  /** Ordered ids of create actions: built-ins ("builtin:note"), provider actions ("<pluginId>:<actionId>") and commands ("command:<id>"). */
  actions: string[];
  hiddenActions: string[];
  commands: CustomCommand[];
  tabsEnabled: boolean;
  activePageId: string;
  pages: HomePage[];
  /** Show the "today" button next to search (when the daily notes command exists). */
  showDaily: boolean;
  captureTarget: "daily" | "inbox";
  captureInboxPath: string;
  hiddenRecommendations: string[];
}

export const BUILTIN_ACTIONS = ["builtin:daily", "builtin:canvas", "builtin:base", "builtin:folder", "builtin:import"] as const;

export const DEFAULT_SETTINGS: HomeSettings = {
  openOnStartup: true,
  replaceNewTab: true,
  headline: "clock",
  wallpaper: {
    source: "curated",
    rotation: "daily",
    dim: 0.35,
    unsplashSecret: "",
    query: "nature landscape",
    localPath: "",
    current: null,
    chosenOn: "",
  },
  actions: [...BUILTIN_ACTIONS],
  hiddenActions: [],
  commands: [],
  tabsEnabled: false,
  activePageId: "home",
  pages: [{ id: "home", name: "", moduleOptions: {}, defaultVisible: true, showRecommendations: true }],
  showDaily: true,
  captureTarget: "inbox",
  captureInboxPath: "Inbox.md",
  hiddenRecommendations: [],
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function photo(value: unknown): Photo | null {
  const raw = value as Partial<Photo> | null | undefined;
  if (!raw || typeof raw.id !== "string" || typeof raw.url !== "string" || !/^https:\/\//.test(raw.url)) return null;
  return {
    id: raw.id, url: raw.url, author: text(raw.author), authorUrl: text(raw.authorUrl), page: text(raw.page),
    ...(typeof raw.color === "string" ? { color: raw.color } : {}),
    ...(typeof raw.downloadLocation === "string" ? { downloadLocation: raw.downloadLocation } : {}),
  };
}

export function currentPage(settings: HomeSettings, pageId?: string): HomePage {
  const id = pageId ?? (settings.tabsEnabled ? settings.activePageId : settings.pages[0].id);
  return settings.pages.find((page) => page.id === id) ?? settings.pages[0];
}

export function moduleOptions(settings: HomeSettings, id: string, pageId?: string): ModuleOptions {
  const page = currentPage(settings, pageId);
  return Object.hasOwn(page.moduleOptions, id) ? page.moduleOptions[id] : { ...DEFAULT_MODULE_OPTIONS, visible: page.defaultVisible };
}

/** Migrate the single-page layout only when there are no usable saved pages. */
function normalizePages(raw: Record<string, unknown>, modules: Record<string, ModuleOptions>): HomePage[] {
  const pages: HomePage[] = [];
  if (Array.isArray(raw.pages)) for (const entry of raw.pages) {
    if (!entry || typeof entry !== "object") continue;
    const page = entry as Record<string, unknown>;
    if (typeof page.id !== "string" || !page.id || pages.some((saved) => saved.id === page.id)) continue;
    pages.push({ id: page.id, name: text(page.name).trim().slice(0, 80),
      moduleOptions: normalizeModules(page.moduleOptions), defaultVisible: page.defaultVisible !== false,
      showRecommendations: page.showRecommendations === true });
  }
  return pages.length ? pages : [{ id: "home", name: "", moduleOptions: modules, defaultVisible: true,
    showRecommendations: typeof raw.showRecommendations === "boolean" ? raw.showRecommendations : true }];
}

function normalizeModules(value: unknown): Record<string, ModuleOptions> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, ModuleOptions> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!id || id === "__proto__" || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as Partial<ModuleOptions>;
    result[id] = {
      visible: typeof candidate.visible === "boolean" ? candidate.visible : true,
      limit: typeof candidate.limit === "number" && Number.isFinite(candidate.limit)
        ? Math.min(6, Math.max(1, Math.floor(candidate.limit))) : 3,
    };
  }
  return result;
}

/** Validates saved data field by field; unknown or broken values fall back to defaults without touching the rest. */
export function normalizeSettings(saved: unknown): HomeSettings {
  const raw = (saved && typeof saved === "object" ? saved : {}) as Record<string, unknown>;
  const wall = (raw.wallpaper && typeof raw.wallpaper === "object" ? raw.wallpaper : {}) as Record<string, unknown>;
  const defaults = DEFAULT_SETTINGS;
  const dim = typeof wall.dim === "number" && Number.isFinite(wall.dim) ? Math.min(0.8, Math.max(0, wall.dim)) : defaults.wallpaper.dim;
  const actions = Array.isArray(raw.actions) ? strings(raw.actions) : [...defaults.actions];
  const commands = Array.isArray(raw.commands)
    ? raw.commands.flatMap((item: unknown) => {
      const command = item as Partial<CustomCommand> | null;
      return command && typeof command.id === "string" && command.id
        ? [{ id: command.id, label: text(command.label, command.id), icon: text(command.icon, "terminal-square") }]
        : [];
    })
    : [];
  const modules = normalizeModules(raw.moduleOptions);
  if (!modules.recent && raw.showRecent === false) modules.recent = { visible: false, limit: 3 };
  const pages = normalizePages(raw, modules);
  return {
    openOnStartup: typeof raw.openOnStartup === "boolean" ? raw.openOnStartup : defaults.openOnStartup,
    replaceNewTab: typeof raw.replaceNewTab === "boolean" ? raw.replaceNewTab : defaults.replaceNewTab,
    headline: pick(raw.headline, ["clock", "brand", "vault"], defaults.headline),
    wallpaper: {
      source: pick(wall.source, ["curated", "unsplash", "local", "none"], defaults.wallpaper.source),
      rotation: pick(wall.rotation, ["daily", "open", "fixed"], defaults.wallpaper.rotation),
      dim,
      unsplashSecret: text(wall.unsplashSecret),
      query: text(wall.query, defaults.wallpaper.query),
      localPath: text(wall.localPath),
      current: photo(wall.current),
      chosenOn: text(wall.chosenOn),
    },
    actions: [...new Set(actions)],
    hiddenActions: strings(raw.hiddenActions),
    commands,
    tabsEnabled: raw.tabsEnabled === true,
    activePageId: pages.some((page) => page.id === raw.activePageId) ? raw.activePageId as string : pages[0].id,
    pages,
    showDaily: typeof raw.showDaily === "boolean" ? raw.showDaily : defaults.showDaily,
    captureTarget: pick(raw.captureTarget, ["daily", "inbox"], defaults.captureTarget),
    captureInboxPath: text(raw.captureInboxPath, defaults.captureInboxPath),
    hiddenRecommendations: strings(raw.hiddenRecommendations),
  };
}

export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
