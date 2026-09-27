import { PRODUCTIVITY_MODULES } from "./productivity-catalog";
import type { App } from "obsidian";
import type { RegistryEntry } from "./registry";
import { DISCOVERY_MODULES, type DiscoveryModuleId } from "./discovery";
import { EXTRA_MODULES } from "./extra-catalog";
import { INTEGRATIONS } from "./integration-catalog";
import { KNOWN_PLUGINS, installState, localized, pluginName } from "./ecosystem";
import { isChinese, t } from "./i18n";
import { findHomeProviders, type HomeSection } from "./protocol/qiaomu-home";
import { sectionKey } from "./settings";
import { loadSections } from "./sources";

export type ModuleStatus = "ready" | "disabled" | "absent" | "unavailable";
export interface HomeModule {
  id: string;
  title: string;
  source: string;
  sourceId?: string;
  icon: string;
  description: string;
  status: ModuleStatus;
  section?: HomeSection;
  preview?: string[];
  /** Community plugin a built-in integration card relies on. */
  requires?: string;
  /** Entry from the community registry; not a card itself but a plugin that provides cards. */
  community?: RegistryEntry;
}

export function builtinModules(): HomeModule[] {
  return [
    ...Object.entries(PRODUCTIVITY_MODULES).map(([id, item]): HomeModule => ({ id, title: isChinese() ? item.zh : item.en, source: "Home", icon: item.icon, status: "ready", description: isChinese() ? item.description : item.descriptionEn })),
    ...Object.entries(EXTRA_MODULES).map(([id, item]): HomeModule => ({ id, title: isChinese() ? item.zh : item.en, source: "Home", icon: item.icon, status: "ready", description: isChinese() ? item.description : item.descriptionEn })),
    ...Object.entries(INTEGRATIONS).map(([id, item]): HomeModule => ({ id, title: isChinese() ? item.zh : item.en, source: item.pluginName, icon: item.icon, status: "ready",
      description: isChinese() ? item.description : item.descriptionEn, requires: item.plugin })),
    { id: "inbox-preview", title: isChinese() ? "收件箱" : "Inbox", source: "Home", icon: "inbox", status: "ready", description: isChinese() ? "看看刚收进 Inbox 的内容。" : "See recent captures in your Inbox." },
    { id: "daily-focus", title: isChinese() ? "今日重点" : "Today's focus", source: "Home", icon: "target", status: "ready", description: isChinese() ? "只保留今天最重要的一件事。" : "Keep one priority for today." },
    { id: "countdown", title: isChinese() ? "倒计时" : "Countdown", source: "Home", icon: "calendar-clock", status: "ready", description: isChinese() ? "一个重要日期，打开首页就能看到。" : "See the time left until one important date." },
    ...(Object.entries(DISCOVERY_MODULES) as [DiscoveryModuleId, typeof DISCOVERY_MODULES[DiscoveryModuleId]][]).map(([id, module]): HomeModule => ({
      id, title: isChinese() ? module.zh : module.en, source: "Home", icon: module.icon, status: "ready",
      description: isChinese() ? module.descriptionZh : module.descriptionEn,
      preview: module.sites.slice(0, 3).map((site) => isChinese() ? site.zh : site.en),
    })),
    { id: "daily-preview", title: isChinese() ? "今日日记" : "Today's note", source: "Obsidian", icon: "calendar-days", status: "ready", description: isChinese() ? "在首页查看今日记录，打开原笔记继续编辑。" : "See today's note and open it to edit." },
    { id: "recently-modified", title: isChinese() ? "最近修改" : "Recently modified", source: "Obsidian", icon: "file-clock", status: "ready", description: isChinese() ? "接着处理最近写过的笔记。" : "Continue notes you recently edited." },
    { id: "review-note", title: isChinese() ? "回顾一篇" : "Review a note", source: "Obsidian", icon: "shuffle", status: "ready", description: isChinese() ? "从选定文件夹随机找一篇旧笔记。" : "Rediscover a note from a chosen folder." },
    { id:"beginner-plugins", title:isChinese()?"新手必装":"Starter plugins", source:"Home", icon:"compass", status:"ready", preview:["Calendar", "Advanced Tables", "Omnisearch"], description:isChinese()?"20 个常用插件，按用途了解，再按需安装。":"Discover 20 useful plugins and choose what fits." },
    { id: "todo", title: isChinese() ? "今日待办" : "Today’s tasks", source: "Home", icon: "list-todo", status: "ready", description: isChinese() ? "快速添加和勾选，保存在任务笔记中。" : "Add and complete tasks in a Markdown note." },
    { id: "recent", title: t("section.recent"), source: "Obsidian", icon: "history", status: "ready", description: t("library.recent") },
  ];
}

export async function pluginModules(app: App, savedSources: string[] = []): Promise<HomeModule[]> {
  const providers = new Map(findHomeProviders(app));
  const ids = [...new Set([...KNOWN_PLUGINS.map((plugin) => plugin.id), ...providers.keys(), ...savedSources])];
  const groups = await Promise.all(ids.map(async (id): Promise<HomeModule[]> => {
    const known = KNOWN_PLUGINS.find((plugin) => plugin.id === id);
    const labels: Record<string, [string, string]> = {
      "qiaomu-reader": ["继续阅读", "Continue reading"], "qiaomu-ai-rss": ["未读文章", "Unread articles"],
      "qiaomu-radio": ["最近电台", "Recent stations"], "qiaomu-agent": ["最近对话", "Recent conversations"],
    };
    const base = { id, sourceId: id, title: labels[id]?.[isChinese() ? 0 : 1] ?? pluginName(app, id),
      source: pluginName(app, id), icon: known?.icon ?? "puzzle", description: known ? localized(known.pitch) : t("library.plugin") };
    const provider = providers.get(id);
    if (!provider) {
      const state = installState(app, id);
      return [{ ...base, status: state === "enabled" ? "unavailable" : state }];
    }
    const result = await loadSections(provider);
    if (result.status === "error") return [{ ...base, status: "unavailable" }];
    if (!result.sections.length) return [{ ...base, status: "ready" }];
    return result.sections.map((section) => ({ ...base, id: sectionKey(id, section.id), title: section.title, section, status: "ready" }));
  }));
  return groups.flat();
}
