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
  showRecent: boolean;
  /** Show the "today" button next to search (when the daily notes command exists). */
  showDaily: boolean;
  captureTarget: "daily" | "inbox";
  captureInboxPath: string;
  showRecommendations: boolean;
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
  showRecent: true,
  showDaily: true,
  captureTarget: "inbox",
  captureInboxPath: "Inbox.md",
  showRecommendations: true,
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
    showRecent: typeof raw.showRecent === "boolean" ? raw.showRecent : defaults.showRecent,
    showDaily: typeof raw.showDaily === "boolean" ? raw.showDaily : defaults.showDaily,
    captureTarget: pick(raw.captureTarget, ["daily", "inbox"], defaults.captureTarget),
    captureInboxPath: text(raw.captureInboxPath, defaults.captureInboxPath),
    showRecommendations: typeof raw.showRecommendations === "boolean" ? raw.showRecommendations : defaults.showRecommendations,
    hiddenRecommendations: strings(raw.hiddenRecommendations),
  };
}

export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
