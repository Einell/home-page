import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, moduleOptions, normalizeSettings } from "../src/settings";
import { nextCurated, curatedPhotos, sizedUrl, targetWidth } from "../src/wallpaper/wallpaper";

describe("normalizeSettings", () => {
  it("returns defaults for missing or broken data", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("oops")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid fields and repairs invalid ones independently", () => {
    const settings = normalizeSettings({
      openOnStartup: false, headline: "weird",
      wallpaper: { source: "local", dim: 5, localPath: "a.jpg", current: { id: "x", url: "http://insecure" } },
      actions: ["builtin:canvas", "builtin:canvas", 3], commands: [{ id: "app:reload" }, { label: "no id" }],
    });
    expect(settings.openOnStartup).toBe(false);
    expect(settings.headline).toBe("clock");
    expect(settings.wallpaper.source).toBe("local");
    expect(settings.wallpaper.dim).toBe(0.8);
    expect(settings.wallpaper.current).toBeNull();
    expect(settings.actions).toEqual(["builtin:canvas"]);
    expect(settings.commands).toEqual([{ id: "app:reload", label: "app:reload", icon: "terminal-square" }]);
  });

  it("defaults every card to three items and preserves earlier Recent visibility", () => {
    const defaults = normalizeSettings(null);
    expect(moduleOptions(defaults, "recent")).toEqual({ visible: true, limit: 3 });
    expect(moduleOptions(defaults, "qiaomu-reader")).toEqual({ visible: true, limit: 3 });
    const migrated = normalizeSettings({ showRecent: false, moduleOptions: { "qiaomu-reader": { visible: false, limit: 9 } } });
    expect(moduleOptions(migrated, "recent")).toEqual({ visible: false, limit: 3 });
    expect(moduleOptions(migrated, "qiaomu-reader")).toEqual({ visible: false, limit: 6 });
  });
});

describe("wallpapers", () => {
  it("never repeats the photo on screen", () => {
    const first = curatedPhotos()[0]!;
    for (let i = 0; i < 20; i++) expect(nextCurated(first.id, () => 0).id).not.toBe(first.id);
  });

  it("credits every curated photo with an Unsplash link", () => {
    for (const photo of curatedPhotos()) {
      expect(photo.url).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(photo.page).toContain("utm_source=qiaomu_home");
      expect(photo.author).not.toBe("");
    }
  });

  it("requests a stable width bucket", () => {
    expect(targetWidth(1440, 2)).toBe(2560);
    expect(targetWidth(390, 3)).toBe(1280);
    expect(sizedUrl(curatedPhotos()[0]!, 1920)).toContain("w=1920");
  });
});
