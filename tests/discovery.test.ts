import { describe, expect, it } from "vitest";
import { DISCOVERY_MODULES, discoveryUrl } from "../src/discovery";
import { DEFAULT_SETTINGS, moduleOptions } from "../src/settings";

describe("Home discovery cards", () => {
  it("encodes one user query independently for each allowed site", () => {
    const [google, bing] = DISCOVERY_MODULES["multi-search"].sites;
    expect(discoveryUrl(google, "  AI & 笔记  ")).toBe("https://www.google.com/search?q=AI%20%26%20%E7%AC%94%E8%AE%B0");
    expect(discoveryUrl(bing, "AI & 笔记")).toBe("https://www.bing.com/search?q=AI%20%26%20%E7%AC%94%E8%AE%B0");
    expect(discoveryUrl(DISCOVERY_MODULES["watch-finder"].sites[1], "机器学习 入门"))
      .toBe("https://search.bilibili.com/all?keyword=%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%20%E5%85%A5%E9%97%A8");
    expect(discoveryUrl(DISCOVERY_MODULES["paper-finder"].sites[0], "graph RAG"))
      .toBe("https://arxiv.org/search/?query=graph%20RAG&searchtype=all");
  });

  it("opens the source homepage before a query and keeps the cards opt-in", () => {
    for (const [id, module] of Object.entries(DISCOVERY_MODULES)) {
      expect(discoveryUrl(module.sites[0], "  ")).toBe(module.sites[0].home);
      expect(moduleOptions(DEFAULT_SETTINGS, id, "home").visible).toBe(false);
    }
  });

  it("keeps saved daily focus and countdown local across settings normalization", async () => {
    const { normalizeSettings } = await import("../src/settings");
    const saved = structuredClone(DEFAULT_SETTINGS);
    saved.dailyFocus = { day: "2026-09-27", text: "Finish Home", done: true };
    saved.countdown = { label: "Launch", date: "2026-10-01" };
    const restored = normalizeSettings(saved);
    expect(restored.dailyFocus).toEqual(saved.dailyFocus);
    expect(restored.countdown).toEqual(saved.countdown);
  });
});

describe("user search templates", () => {
  it("encodes queries without allowing executable schemes or embedded credentials", async () => {
    const { parseSearchTemplates, customSearchSites } = await import("../src/discovery");
    const sites = customSearchSites(parseSearchTemplates("Docs | https://example.com/search?q={query}"));
    expect(discoveryUrl(sites[0], "AI & 中文")).toBe("https://example.com/search?q=AI%20%26%20%E4%B8%AD%E6%96%87");
    expect(() => parseSearchTemplates("Bad | javascript:alert('{query}')")).toThrow();
    expect(() => parseSearchTemplates("Bad | https://user:secret@example.com/?q={query}")).toThrow();
    expect(() => parseSearchTemplates("Host | https://{query}/search")).toThrow();
    expect(() => parseSearchTemplates("Missing placeholder | https://example.com/")).toThrow();
  });
});
