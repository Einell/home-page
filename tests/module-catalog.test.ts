import type { App } from "obsidian";
import { describe, expect, it } from "vitest";
import { pluginModules } from "../src/module-catalog";
import { homeProvider } from "../src/protocol/qiaomu-home";

describe("module catalog", () => {
  it("discovers separate sections and distinguishes installed, disabled and missing sources", async () => {
    const app = { plugins: {
      plugins: {
        example: { qiaomuHome: homeProvider({ sections: () => [
          { id: "books", title: "Books", items: [{ id: "one", title: "One", open() {} }] },
          { id: "notes", title: "Notes", items: [], empty: "No notes" },
        ] }) },
        "qiaomu-reader": {},
      },
      manifests: { example: { name: "Example" }, "qiaomu-ai-rss": { name: "RSS" } },
    } } as unknown as App;
    const modules = await pluginModules(app, ["removed-third-party"]);
    expect(modules.filter((item) => item.sourceId === "example").map((item) => [item.id, item.status]))
      .toEqual([["section:example:books", "ready"], ["section:example:notes", "ready"]]);
    expect(modules.find((item) => item.id === "qiaomu-reader")?.status).toBe("unavailable");
    expect(modules.find((item) => item.id === "qiaomu-ai-rss")?.status).toBe("disabled");
    expect(modules.find((item) => item.id === "removed-third-party")?.status).toBe("absent");
  });
});
