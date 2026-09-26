import type { App, Plugin } from "obsidian";
import { isChinese } from "./i18n";

/** Qiaomu plugins Home knows about. Any other plugin that implements the protocol also appears, just without a recommendation card. */
export interface KnownPlugin {
  id: string;
  name: { zh: string; en: string };
  pitch: { zh: string; en: string };
  icon: string;
  /** Command that opens the plugin's main view; used when the installed version predates the Home protocol. */
  openCommand: string;
}

export const KNOWN_PLUGINS: KnownPlugin[] = [
  {
    id: "qiaomu-reader",
    name: { zh: "乔木 Reader", en: "Qiaomu Reader" },
    pitch: { zh: "在 Obsidian 里读 EPUB、PDF、MOBI，划线直接成为笔记", en: "Read EPUB, PDF and MOBI with highlights that become notes" },
    icon: "book-open",
    openCommand: "qiaomu-reader:open-library",
  },
  {
    id: "qiaomu-ai-rss",
    name: { zh: "乔木 RSS", en: "Qiaomu RSS" },
    pitch: { zh: "AI 改写与翻译的信息流，一键摘进日记", en: "AI-rewritten feeds you can clip into your daily note" },
    icon: "rss",
    openCommand: "qiaomu-ai-rss:open-reader",
  },
  {
    id: "qiaomu-radio",
    name: { zh: "乔木电台", en: "Qiaomu Radio" },
    pitch: { zh: "写作时听全球电台，越听越懂你的口味", en: "Live radio from around the world while you write" },
    icon: "radio-tower",
    openCommand: "qiaomu-radio:open-radio",
  },
  {
    id: "qiaomu-agent",
    name: { zh: "乔木 Agent", en: "Qiaomu Agent" },
    pitch: { zh: "用本地 Agent 或模型 API 和你的笔记库对话", en: "Chat with your vault using local agents or model APIs" },
    icon: "tree-deciduous",
    openCommand: "qiaomu-agent:open-agent",
  },
];

export function localized(text: { zh: string; en: string }): string {
  return isChinese() ? text.zh : text.en;
}

/** absent: not installed · disabled: installed but off · enabled: loaded (with or without the Home protocol). */
export type InstallState = "absent" | "disabled" | "enabled";

interface PluginHost {
  plugins?: {
    plugins?: Record<string, Plugin>;
    manifests?: Record<string, { name?: string }>;
    enabledPlugins?: Set<string>;
  };
  commands?: {
    commands?: Record<string, { id: string; name: string; icon?: string }>;
    executeCommandById?(id: string): boolean;
  };
  setting?: { open?(): void; openTabById?(id: string): unknown };
}

function host(app: App): PluginHost {
  return app as unknown as PluginHost;
}

export function installState(app: App, id: string): InstallState {
  const plugins = host(app).plugins;
  if (plugins?.plugins?.[id]) return "enabled";
  return plugins?.manifests?.[id] ? "disabled" : "absent";
}

export function pluginName(app: App, id: string): string {
  const known = KNOWN_PLUGINS.find((plugin) => plugin.id === id);
  return known ? localized(known.name) : host(app).plugins?.manifests?.[id]?.name ?? id;
}

/** Runs a command by id. Returns false when the command does not exist (plugin disabled, core plugin off). */
export function runCommand(app: App, id: string): boolean {
  const commands = host(app).commands;
  if (!commands?.commands?.[id] || typeof commands.executeCommandById !== "function") return false;
  return commands.executeCommandById(id);
}

export function commandExists(app: App, id: string): boolean {
  return Boolean(host(app).commands?.commands?.[id]);
}

export function listCommands(app: App): Array<{ id: string; name: string; icon?: string }> {
  return Object.values(host(app).commands?.commands ?? {});
}

/** Opens the community plugin page in Obsidian's own browser, where the user installs it. Home never installs anything itself. */
export function openPluginPage(id: string): void {
  window.open(`obsidian://show-plugin?id=${encodeURIComponent(id)}`);
}

/** Opens Settings → Community plugins so the user can switch a plugin on. */
export function openCommunityPluginSettings(app: App): void {
  const setting = host(app).setting;
  setting?.open?.();
  setting?.openTabById?.("community-plugins");
}
