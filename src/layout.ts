import { moduleOptions, moduleSource, type HomePage, type HomeSettings } from "./settings";

export function orderModules(page: HomePage, ids: string[]): string[] {
  const rank = new Map(page.moduleOrder.map((id, index) => [id, index]));
  return [...new Set(ids)].sort((a, b) =>
    (rank.get(a) ?? rank.get(moduleSource(a) ?? "") ?? Infinity) -
    (rank.get(b) ?? rank.get(moduleSource(b) ?? "") ?? Infinity));
}

export function setModule(settings: HomeSettings, pageId: string, id: string, change: { visible?: boolean; limit?: number }): boolean {
  const page = settings.pages.find((item) => item.id === pageId);
  if (!page) return false;
  const next = { ...moduleOptions(settings, id, pageId), ...change };
  next.limit = Number.isFinite(next.limit) ? Math.max(1, Math.min(6, Math.floor(next.limit))) : 3;
  page.moduleOptions[id] = next;
  return true;
}

export function reorderModule(page: HomePage, id: string, before: string, visible: string[], after = false): boolean {
  if (id === before || !visible.includes(id) || !visible.includes(before)) return false;
  const order = orderModules(page, [...visible, ...page.moduleOrder]).filter((key) => key !== id);
  order.splice(order.indexOf(before) + (after ? 1 : 0), 0, id);
  page.moduleOrder = order;
  return true;
}

/** Capture the source page, so a late dialog cannot edit whichever page happens to be active. */
export function moveModule(settings: HomeSettings, fromId: string, toId: string, id: string): boolean {
  if (fromId === toId || !settings.pages.some((page) => page.id === fromId) || !settings.pages.some((page) => page.id === toId)) return false;
  const source = moduleOptions(settings, id, fromId);
  if (!source.visible || moduleOptions(settings, id, toId).visible) return false;
  setModule(settings, toId, id, { ...source, visible: true });
  setModule(settings, fromId, id, { visible: false });
  return true;
}
