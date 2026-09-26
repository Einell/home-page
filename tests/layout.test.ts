import { describe, it, expect } from "vitest";
import { normalizeSettings, sectionKey, moduleOptions } from "../src/settings";
import { addPage, duplicatePage, reorderPage } from "../src/pages";
import { moveModule, orderModules, reorderModule, setModule } from "../src/layout";

describe("module library layout", () => {
  it("inherits 0.2 plugin options while allowing each section to change independently", () => {
    const settings = normalizeSettings({ moduleOptions: { reader: { visible: true, limit: 5 } } });
    const books = sectionKey("reader", "books"), highlights = sectionKey("reader", "highlights");
    expect(moduleOptions(settings, books)).toEqual({ visible: true, limit: 5 });
    setModule(settings, "home", books, { visible: false, limit: 2 });
    expect(moduleOptions(settings, books)).toEqual({ visible: false, limit: 2 });
    expect(moduleOptions(settings, highlights)).toEqual({ visible: true, limit: 5 });
    expect(settings.pages[0].moduleOrder).toEqual([]);
  });

  it("reorders in both directions, preserving hidden modules and later discoveries", () => {
    const settings = normalizeSettings({ tabsEnabled: false }), page = settings.pages[0];
    page.moduleOrder = ["a", "hidden", "b", "c"];
    expect(reorderModule(page, "a", "c", ["a", "b", "c"], true)).toBe(true);
    expect(orderModules(page, ["a", "b", "c", "new"])).toEqual(["b", "c", "a", "new"]);
    expect(page.moduleOrder).toContain("hidden");
    reorderModule(page, "a", "b", ["b", "c", "a"]);
    expect(orderModules(page, ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(reorderModule(page, "external", "b", ["a", "b", "c"])).toBe(false);
  });

  it("moves a section with its count to a captured destination without editing the active page", () => {
    const settings = normalizeSettings({ tabsEnabled: false }), first = settings.pages[0];
    const second = addPage(settings, "second"), third = addPage(settings, "third");
    const key = sectionKey("reader", "books");
    setModule(settings, first.id, key, { limit: 4 });
    expect(moveModule(settings, first.id, second.id, key)).toBe(true);
    expect(moduleOptions(settings, key, first.id).visible).toBe(false);
    expect(moduleOptions(settings, key, second.id)).toEqual({ visible: true, limit: 4 });
    expect(moduleOptions(settings, key, third.id).visible).toBe(false);
    setModule(settings, third.id, key, { visible: true, limit: 1 });
    expect(moveModule(settings, second.id, third.id, key)).toBe(false);
    expect(moduleOptions(settings, key, third.id).limit).toBe(1);
    expect(moveModule(settings, first.id, "removed-page", key)).toBe(false);
    expect(setModule(settings, "removed-page", key, { visible: true })).toBe(false);
  });

  it("copies settings deeply and keeps selected identity when dropping a page after another", () => {
    const settings = normalizeSettings({ tabsEnabled: false }), source = settings.pages[0];
    source.moduleOptions.recent = { visible: true, limit: 2 };
    source.moduleOrder = ["recent", "example-module"];
    const copy = duplicatePage(settings, source.id, "copy")!;
    setModule(settings, copy.id, "recent", { limit: 6 });
    copy.moduleOrder.reverse();
    expect(source.moduleOptions.recent.limit).toBe(2);
    expect(source.moduleOrder).toEqual(["recent", "example-module"]);
    reorderPage(settings, source.id, copy.id, true);
    expect(settings.pages.map((page) => page.id)).toEqual([copy.id, source.id]);
    expect(settings.activePageId).toBe(copy.id);
    const reloaded = normalizeSettings(JSON.parse(JSON.stringify(settings)));
    expect(reloaded).toEqual(settings);
  });
});
