import { describe, expect, it } from "vitest";
import { TFile, type App } from "obsidian";
import { dailyExcerpt, recentlyModified, reviewCandidates } from "../src/home-native-modules";
import { DEFAULT_SETTINGS, moduleOptions, normalizeSettings } from "../src/settings";

function file(path: string, mtime: number): TFile {
  const entry = new TFile() as TFile & { path: string; stat: { mtime: number } };
  entry.path = path;
  entry.stat = { mtime };
  return entry;
}

function app(files: TFile[]): App {
  return { vault: { getMarkdownFiles: () => files } } as unknown as App;
}

describe("Home native modules", () => {
  it("keeps edited notes distinct from the last-opened list and sorts newest first", () => {
    expect(recentlyModified(app([file("a.md", 2), file("b.md", 8), file("c.md", 5), file("_templates/blank.md", 10)]), 2).map((item) => item.path))
      .toEqual(["b.md", "c.md"]);
  });

  it("limits rediscovery to the exact folder and skips templates", () => {
    const files = [file("Projects/a.md", 1), file("Projects/Sub/b.md", 2), file("Projects2/no.md", 3),
      file("Projects/Templates/blank.md", 4), file("_templates/blank.md", 5)];
    expect(reviewCandidates(app(files), "Projects").map((item) => item.path)).toEqual(["Projects/a.md", "Projects/Sub/b.md"]);
    expect(reviewCandidates(app(files), "Missing")).toEqual([]);
  });

  it("shows a bounded text-only daily preview without frontmatter or code blocks", () => {
    const markdown = "---\ntitle: Secret\n---\n# Today\n- [ ] Finish draft\n```js\nconsole.log('hidden')\n```\n[[Project|Project name]]\nAnother line";
    expect(dailyExcerpt(markdown, 3)).toEqual(["Today", "Finish draft", "Project name"]);
  });

  it("keeps new cards opt-in and persists the review folder after reload", () => {
    for (const id of ["daily-preview", "recently-modified", "review-note"]) {
      expect(moduleOptions(DEFAULT_SETTINGS, id, "home").visible).toBe(false);
    }
    const saved = structuredClone(DEFAULT_SETTINGS);
    saved.reviewFolder = "Projects";
    saved.pages[0].moduleOptions["review-note"] = { visible: true, limit: 3 };
    const restored = normalizeSettings(saved);
    expect(restored.reviewFolder).toBe("Projects");
    expect(moduleOptions(restored, "review-note", "home").visible).toBe(true);
  });
});
