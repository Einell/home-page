import { MAX_SECTION_ITEMS, type HomeAction, type HomeItem, type HomeProvider, type HomeSection } from "./protocol/qiaomu-home";

/** How long Home waits for one provider before showing the page without it. */
export const PROVIDER_TIMEOUT_MS = 1500;

export type SourceResult =
  | { status: "ready"; sections: HomeSection[] }
  | { status: "error" };

function withTimeout<T>(value: T | Promise<T>, ms: number): Promise<T> {
  if (!(value instanceof Promise)) return Promise.resolve(value);
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    value.then((result) => { window.clearTimeout(timer); resolve(result); }, (error: unknown) => { window.clearTimeout(timer); reject(error instanceof Error ? error : new Error(String(error))); });
  });
}

function validAction(value: unknown): value is HomeAction {
  const action = value as Partial<HomeAction> | null;
  return Boolean(action) && typeof action?.id === "string" && typeof action.label === "string" && typeof action.run === "function";
}

function cleanItem(value: unknown): HomeItem | null {
  const item = value as Partial<HomeItem> | null;
  if (!item || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.open !== "function") return null;
  const progress = typeof item.progress === "number" && Number.isFinite(item.progress) ? Math.min(1, Math.max(0, item.progress)) : undefined;
  const image = typeof item.image === "string" && /^(https:|app:|data:image\/|capacitor:)/.test(item.image) ? item.image : undefined;
  return {
    id: item.id,
    title: item.title,
    open: item.open.bind(item),
    ...(typeof item.subtitle === "string" && item.subtitle ? { subtitle: item.subtitle } : {}),
    ...(typeof item.meta === "string" && item.meta ? { meta: item.meta } : {}),
    ...(typeof item.icon === "string" ? { icon: item.icon } : {}),
    ...(image ? { image } : {}),
    ...(progress !== undefined ? { progress } : {}),
    ...(item.active === true ? { active: true } : {}),
    ...(Array.isArray(item.actions) ? { actions: item.actions.filter(validAction).slice(0, 2) } : {}),
  };
}

/** Keeps only well-formed sections and items, capped at MAX_SECTION_ITEMS, so one faulty provider cannot break the page. */
export function cleanSections(value: unknown): HomeSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw: unknown) => {
    const section = raw as Partial<HomeSection> | null;
    if (!section || typeof section.id !== "string" || typeof section.title !== "string" || !Array.isArray(section.items)) return [];
    const items = section.items.map(cleanItem).filter((item): item is HomeItem => item !== null).slice(0, MAX_SECTION_ITEMS);
    if (!items.length && typeof section.empty !== "string") return [];
    return [{
      id: section.id, title: section.title, items,
      ...(typeof section.empty === "string" ? { empty: section.empty } : {}),
      ...(validAction(section.more) ? { more: section.more } : {}),
    }];
  });
}

export async function loadSections(provider: HomeProvider): Promise<SourceResult> {
  try {
    return { status: "ready", sections: cleanSections(await withTimeout(provider.sections(), PROVIDER_TIMEOUT_MS)) };
  } catch (error) {
    console.warn("Qiaomu Home: a provider failed to load", error);
    return { status: "error" };
  }
}

export function loadActions(provider: HomeProvider): HomeAction[] {
  try {
    const actions = provider.actions?.();
    return Array.isArray(actions) ? actions.filter(validAction) : [];
  } catch (error) {
    console.warn("Qiaomu Home: a provider failed to list actions", error);
    return [];
  }
}

export async function searchProvider(provider: HomeProvider, query: string, limit: number): Promise<HomeItem[]> {
  if (typeof provider.search !== "function") return [];
  try {
    const items = await withTimeout(provider.search(query, limit), PROVIDER_TIMEOUT_MS);
    return Array.isArray(items) ? items.map(cleanItem).filter((item): item is HomeItem => item !== null).slice(0, limit) : [];
  } catch (error) {
    console.warn("Qiaomu Home: a provider search failed", error);
    return [];
  }
}
