import { describe, expect, it, vi } from "vitest";
import { cleanSections, loadSections, PROVIDER_TIMEOUT_MS } from "../src/sources";
import { homeProvider, MAX_SECTION_ITEMS } from "../src/protocol/qiaomu-home";

const item = (id: string, extra: object = {}) => ({ id, title: id, open: () => undefined, ...extra });

describe("cleanSections", () => {
  it("drops malformed sections and items and caps item count", () => {
    const sections = cleanSections([
      { id: "a", title: "A", items: [...Array.from({ length: 10 }, (_, i) => item(`i${i}`)), { id: "bad" }] },
      { id: "b", title: "B", items: [] },
      { id: "c", title: "C", items: [], empty: "Nothing yet" },
      { title: "no id", items: [] },
      "junk",
    ]);
    expect(sections.map((section) => section.id)).toEqual(["a", "c"]);
    expect(sections[0]!.items).toHaveLength(MAX_SECTION_ITEMS);
  });

  it("clamps progress and rejects unsafe image URLs", () => {
    const [section] = cleanSections([{ id: "a", title: "A", items: [item("x", { progress: 3, image: "javascript:alert(1)" }), item("y", { image: "https://example.com/a.jpg", progress: -1 })] }]);
    expect(section!.items[0]!.progress).toBe(1);
    expect(section!.items[0]!.image).toBeUndefined();
    expect(section!.items[1]!.image).toBe("https://example.com/a.jpg");
    expect(section!.items[1]!.progress).toBe(0);
  });

  it("keeps at most two valid secondary actions", () => {
    const run = () => undefined;
    const [section] = cleanSections([{ id: "a", title: "A", items: [item("x", { actions: [{ id: "1", label: "1", icon: "play", run }, { id: "bad" }, { id: "2", label: "2", icon: "x", run }, { id: "3", label: "3", icon: "x", run }] })] }]);
    expect(section!.items[0]!.actions!.map((action) => action.id)).toEqual(["1", "2"]);
  });
});

describe("loadSections", () => {
  it("isolates a provider that throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await loadSections(homeProvider({ sections: () => { throw new Error("boom"); } }));
    expect(result.status).toBe("error");
    warn.mockRestore();
  });

  it("gives up on a provider that never answers", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const pending = loadSections(homeProvider({ sections: () => new Promise(() => undefined) }));
    vi.advanceTimersByTime(PROVIDER_TIMEOUT_MS + 1);
    expect((await pending).status).toBe("error");
    warn.mockRestore();
    vi.useRealTimers();
  });
});
