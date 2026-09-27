import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { HomeTaskIndex } from "../src/task-index";

function fixture() {
  const files = [
    { path: "Projects/A.md", basename: "A", stat: { mtime: 1, size: 10 } },
    { path: "Projects2/B.md", basename: "B", stat: { mtime: 1, size: 10 } },
    { path: "Templates/Ignore.md", basename: "Ignore", stat: { mtime: 1, size: 10 } },
  ];
  const cachedRead = vi.fn(async () => "- [ ] Task 📅 2026-09-27");
  const app = { vault: { getMarkdownFiles: () => files, cachedRead } } as unknown as App;
  return { files, cachedRead, index: new HomeTaskIndex(app) };
}

describe("shared task index", () => {
  it("limits first reads to the chosen folder and shares in-flight work", async () => {
    const { index, cachedRead } = fixture();
    const [a, b] = await Promise.all([index.read("Projects"), index.read("Projects")]);
    expect(a).toEqual(b); expect(a.map(item => item.path)).toEqual(["Projects/A.md"]);
    expect(cachedRead).toHaveBeenCalledTimes(1);
  });
  it("reuses unchanged files but updates modified and removed tasks", async () => {
    const { index, files, cachedRead } = fixture();
    await index.read(); await index.read(); expect(cachedRead).toHaveBeenCalledTimes(2);
    files[0].stat.mtime++;
    cachedRead.mockResolvedValue("- [x] Completed");
    expect((await index.read()).map(item => item.path)).toEqual(["Projects2/B.md"]);
    files.splice(1, 1); expect(await index.read()).toEqual([]);
  });
  it("allows retry after a failed vault read", async () => {
    const { index, cachedRead } = fixture();
    cachedRead.mockRejectedValueOnce(new Error("Read failed"));
    await expect(index.read("Projects")).rejects.toThrow("Read failed");
    expect(await index.read("Projects")).toHaveLength(1);
  });
});
