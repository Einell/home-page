import { requestUrl } from "obsidian";

/** The community list lives in this repository, so accepted submissions reach every Home without a plugin release. */
export const REGISTRY_URL = "https://raw.githubusercontent.com/joeseesun/qiaomu-home/main/registry/extensions.json";
export const SUBMIT_URL = "https://github.com/joeseesun/qiaomu-home/issues/new?template=submit-extension.yml";

export interface RegistryEntry {
  id: string; name: { zh: string; en: string }; description: { zh: string; en: string };
  author: string; repo: string; icon: string;
  /** Listed in Obsidian's official community store, so it can be installed from Obsidian directly. */
  store: boolean;
}

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const pair = (value: unknown, max: number) => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const zh = text(raw.zh, max), en = text(raw.en, max);
  return zh || en ? { zh: zh || en, en: en || zh } : null;
};

/** Drops malformed entries instead of failing the list; ids and repos are the only fields that trigger actions. */
export function parseRegistry(json: unknown): RegistryEntry[] {
  const list = (json as { version?: unknown; extensions?: unknown })?.version === 1 ? (json as { extensions?: unknown }).extensions : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list.flatMap((raw): RegistryEntry[] => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const id = text(item.id, 80), repo = text(item.repo, 200), name = pair(item.name, 60), description = pair(item.description, 200);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || seen.has(id) || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repo) || !name || !description) return [];
    seen.add(id);
    return [{ id, repo, name, description, author: text(item.author, 60), icon: /^[a-z0-9-]{1,40}$/.test(text(item.icon, 40)) ? text(item.icon, 40) : "puzzle", store: item.store === true }];
  }).slice(0, 200);
}

let cached: { at: number; value: Promise<RegistryEntry[]> } | null = null;
export function loadRegistry(force = false): Promise<RegistryEntry[]> {
  if (!force && cached && Date.now() - cached.at < 3600000) return cached.value;
  const value = requestUrl({ url: REGISTRY_URL, throw: false }).then(response => {
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    return parseRegistry(response.json);
  });
  cached = { at: Date.now(), value };
  value.catch(() => { if (cached?.value === value) cached = null; });
  return value;
}
