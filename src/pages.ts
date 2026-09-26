import { type HomePage, type HomeSettings } from "./settings";

export function addPage(settings: HomeSettings, name: string): HomePage {
  const page: HomePage = { id: crypto.randomUUID(), name: name.trim().slice(0, 80),
    moduleOptions: {}, moduleOrder: [], defaultVisible: false, showRecommendations: false };
  settings.pages.push(page);
  settings.activePageId = page.id;
  settings.tabsEnabled = true;
  return page;
}

export function removePage(settings: HomeSettings, id: string): boolean {
  const index = settings.pages.findIndex((page) => page.id === id);
  if (index < 0 || settings.pages.length === 1) return false;
  settings.pages.splice(index, 1);
  if (settings.activePageId === id) settings.activePageId = settings.pages[Math.max(0, index - 1)].id;
  return true;
}

export function movePage(settings: HomeSettings, id: string, delta: number): void {
  const index = settings.pages.findIndex((page) => page.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= settings.pages.length) return;
  const [page] = settings.pages.splice(index, 1);
  settings.pages.splice(target, 0, page);
}


export function duplicatePage(settings: HomeSettings, id: string, name: string): HomePage | null {
  const source = settings.pages.find((page) => page.id === id);
  if (!source) return null;
  const page: HomePage = { ...structuredClone(source), id: crypto.randomUUID(), name: name.trim().slice(0, 80) };
  settings.pages.splice(settings.pages.indexOf(source) + 1, 0, page);
  settings.activePageId = page.id;
  settings.tabsEnabled = true;
  return page;
}

export function reorderPage(settings: HomeSettings, id: string, before: string, after = false): boolean {
  if (id === before || !settings.pages.some((page) => page.id === before)) return false;
  const page = settings.pages.find((item) => item.id === id);
  if (!page) return false;
  settings.pages = settings.pages.filter((item) => item.id !== id);
  settings.pages.splice(settings.pages.findIndex((item) => item.id === before) + (after ? 1 : 0), 0, page);
  return true;
}
