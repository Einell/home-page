import type { App } from "obsidian";
import { HOME_PROTOCOL, HOME_VERSION } from "./protocol/qiaomu-home";

interface Connection { qiaomuHome?: { protocol?: unknown; version?: unknown; sections?: unknown } }
interface Host { plugins?: { plugins?: Record<string, Connection>; manifests?: Record<string, unknown> } }

function plugins(app: App): NonNullable<Host["plugins"]> { return (app as unknown as Host).plugins ?? {}; }

/** No version guess: an absent interface does not establish that a plugin is outdated. */
export function connectionState(app: App, id: string): "unavailable" | "incompatible" | "ready" {
  const provider = plugins(app).plugins?.[id]?.qiaomuHome;
  if (!provider) return "unavailable";
  if (provider.protocol !== HOME_PROTOCOL || provider.version !== HOME_VERSION || typeof provider.sections !== "function") return "incompatible";
  return "ready";
}

/** Compare cheap local references, not provider data. Covers late loading, enable/disable and reload. */
export function connectionSnapshot(app: App): unknown[] {
  const host = plugins(app);
  return [
    ...Object.keys(host.manifests ?? {}).sort(),
    ...Object.entries(host.plugins ?? {}).sort(([a], [b]) => a.localeCompare(b)).flatMap(([id, plugin]) => [
      id, plugin, plugin?.qiaomuHome, plugin?.qiaomuHome?.protocol, plugin?.qiaomuHome?.version, plugin?.qiaomuHome?.sections,
    ]),
  ];
}

export function connectionsChanged(previous: unknown[], next: unknown[]): boolean {
  return previous.length !== next.length || previous.some((value, index) => value !== next[index]);
}
