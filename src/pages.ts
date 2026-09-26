import { type HomePage, type HomeSettings } from "./settings";

export function addPage(settings: HomeSettings, name: string): HomePage {
  const page: HomePage = { id: crypto.randomUUID(), name: name.trim().slice(0, 80),
    moduleOptions: {}, defaultVisible: false, showRecommendations: false };
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

