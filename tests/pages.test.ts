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
    const settings = normalizeSettings({ tabsEnabled: false });
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
    const settings = normalizeSettings({ tabsEnabled: false });
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

import { addPresetPage, reorderPage } from '../src/pages';
describe('starter pages and permanent Home identity',()=>{
  it('starts with six ready-to-use presets',()=>{
    const settings=normalizeSettings(null);
    expect(settings.pages.map(page=>page.name)).toEqual(['主页','专注','知识','阅读','娱乐','探索']);
    expect(moduleOptions(settings,'focus-timer','focus').visible).toBe(true);
    expect(moduleOptions(settings,'beginner-plugins','explore').visible).toBe(true);
    expect(moduleOptions(settings,'beginner-plugins','home').visible).toBe(false);
    expect(settings.tabsEnabled).toBe(true);
    expect(moduleOptions(settings,'todo','home')).toEqual({visible:true,limit:3});
    expect(moduleOptions(settings,'qiaomu-reader','reading').visible).toBe(true);
    expect(moduleOptions(settings,'qiaomu-radio','entertainment').visible).toBe(true);
    settings.pages[3].moduleOptions['qiaomu-reader'].limit=1;
    expect(normalizeSettings(null).pages[3].moduleOptions['qiaomu-reader'].limit).toBe(3);
  });
  it('protects Home after rename and reorder, and does not revive deleted preset pages',()=>{
    const settings=normalizeSettings(null);
    settings.pages[0].name='我的起点';
    reorderPage(settings,'home','entertainment',true);
    expect(removePage(settings,'home')).toBe(false);
    expect(removePage(settings,'reading')).toBe(true);
    settings.tabsEnabled=false;
    const loaded=normalizeSettings(JSON.parse(JSON.stringify(settings)));
    expect(currentPage(loaded).id).toBe('home');
    expect(loaded.pages.some(page=>page.id==='reading')).toBe(false);
    expect(removePage(loaded,'home')).toBe(false);
  });
  it('keeps existing custom layouts and adds presets without replacing anything',()=>{
    const settings=normalizeSettings({tabsEnabled:true,pages:[{id:'custom',name:'工作',moduleOptions:{recent:{visible:true,limit:2}},moduleOrder:['recent']}]});
    const before=structuredClone(settings.pages[0]);
    const preset=addPresetPage(settings,'reading');
    expect(settings.pages[0]).toEqual(before);
    expect(removePage(settings,'custom')).toBe(false);
    expect(removePage(settings,preset.id)).toBe(true);
    expect(normalizeSettings(settings).pages).toHaveLength(1);
  });
});
