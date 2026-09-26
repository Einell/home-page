import type { App } from "obsidian";

export interface HomeBookmark {
  type: "file" | "search";
  title: string;
  value: string;
  subpath?: string;
}

interface RawBookmark {
  type?: unknown;
  title?: unknown;
  path?: unknown;
  query?: unknown;
  subpath?: unknown;
  items?: unknown;
}

export function flattenBookmarks(items: unknown, limit = 8): HomeBookmark[] {
  if (!Array.isArray(items)) return [];
  const result: HomeBookmark[] = [];
  const visit = (entries: unknown[], depth: number) => {
    if (depth > 8) return;
    for (const entry of entries) {
      if (result.length >= limit) break;
      if (!entry || typeof entry !== "object") continue;
      const item = entry as RawBookmark;
      if (item.type === "group" && Array.isArray(item.items)) { visit(item.items, depth + 1); continue; }
      if (item.type === "file" && typeof item.path === "string" && item.path) {
        result.push({ type: "file", title: typeof item.title === "string" && item.title ? item.title : item.path.split("/").pop()?.replace(/\.md$/, "") ?? item.path,
          value: item.path, ...(typeof item.subpath === "string" ? { subpath: item.subpath } : {}) });
      } else if (item.type === "search" && typeof item.query === "string" && item.query) {
        result.push({ type: "search", title: typeof item.title === "string" && item.title ? item.title : item.query, value: item.query });
      }
    }
  };
  visit(items, 0);
  return result;
}

export async function loadBookmarks(app: App): Promise<HomeBookmark[]> {
  const core = app as App & { internalPlugins?: { getPluginById?(id: string): { enabled?: boolean; instance?: unknown } | null } };
  const plugin = core.internalPlugins?.getPluginById?.("bookmarks");
  if (plugin?.enabled === false) return [];
  const path = `${app.vault.configDir}/bookmarks.json`;
  if (!await app.vault.adapter.exists(path)) return [];
  try {
    const data: unknown = JSON.parse(await app.vault.adapter.read(path));
    return flattenBookmarks((data as { items?: unknown } | null)?.items);
  } catch { return []; }
}
