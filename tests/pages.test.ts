import { describe, expect, it } from "vitest";
import { currentPage, moduleOptions, normalizeSettings } from "../src/settings";
import { addPage, movePage, removePage } from "../src/pages";

describe("Home page layouts", () => {
  it("migrates the old layout without changing card visibility, limits or recommendations", () => {
    const settings = normalizeSettings({ showRecent: false, showRecommendations: false,
      moduleOptions: { "qiaomu-reader": { visible: true, limit: 5 } } });
    expect(settings.tabsEnabled).toBe(false);
    expect(settings.pages).toHaveLength(1);
    expect(moduleOptions(settings, "recent")).toEqual({ visible: false, limit: 3 });
    expect(moduleOptions(settings, "qiaomu-reader")).toEqual({ visible: true, limit: 5 });
    expect(currentPage(settings).showRecommendations).toBe(false);
    expect(normalizeSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });

  it("keeps page content independent and preserves it through toggling and reload", () => {
    const settings = normalizeSettings(null);
    const home = currentPage(settings);
    home.moduleOptions.reader = { visible: true, limit: 5 };
    const reading = addPage(settings, "阅读");
    expect(moduleOptions(settings, "reader")).toEqual({ visible: false, limit: 3 });
    reading.moduleOptions.reader = { visible: true, limit: 2 };
    settings.tabsEnabled = false;
    expect(moduleOptions(settings, "reader").limit).toBe(5);
    settings.tabsEnabled = true;
    const reloaded = normalizeSettings(JSON.parse(JSON.stringify(settings)));
    expect(currentPage(reloaded).name).toBe("阅读");
    expect(moduleOptions(reloaded, "reader").limit).toBe(2);
    expect(moduleOptions(reloaded, "future-plugin").visible).toBe(false);
    expect(moduleOptions(reloaded, "future-plugin", home.id).visible).toBe(true);
  });

  it("preserves active identity when reordering and picks a remaining page when deleting", () => {
    const settings = normalizeSettings(null);
    const reading = addPage(settings, "阅读");
    const work = addPage(settings, "工作");
    movePage(settings, work.id, -1);
    expect(settings.pages.map((page) => page.name)).toEqual(["", "工作", "阅读"]);
    expect(currentPage(settings)).toBe(work);
    removePage(settings, reading.id);
    expect(currentPage(settings)).toBe(work);
    removePage(settings, work.id);
    expect(currentPage(settings).id).toBe("home");
    expect(removePage(settings, "home")).toBe(false);
  });

  it("repairs malformed/duplicate pages and a stale active ID without losing valid layouts", () => {
    const settings = normalizeSettings({ tabsEnabled: true, activePageId: "gone", pages: [null, {},
      { id: "work", name: " Work ", moduleOptions: { reader: { visible: false, limit: 100 } } },
      { id: "work", name: "duplicate" }, { id: "reading", moduleOptions: false }] });
    expect(settings.pages).toHaveLength(2);
    expect(currentPage(settings).name).toBe("Work");
    expect(moduleOptions(settings, "reader")).toEqual({ visible: false, limit: 6 });
    expect(normalizeSettings({ pages: [null], moduleOptions: { reader: { visible: false } } }).pages[0].moduleOptions.reader.visible).toBe(false);
  });
});
