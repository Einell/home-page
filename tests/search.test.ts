import { describe, expect, it } from "vitest";
import { noteNameFromQuery, rankNotes, type NoteCandidate } from "../src/search";

const file = (path: string, aliases: string[] = []): NoteCandidate => {
  const name = path.split("/").pop()!;
  const dot = name.lastIndexOf(".");
  return { path, basename: name.slice(0, dot), extension: name.slice(dot + 1), aliases, mtime: 0 };
};

describe("rankNotes", () => {
  const files = [file("Projects/Home plan.md"), file("Archive/home.md"), file("Daily/2026-09-26.md", ["今天"]), file("img/photo.png"), file("x/data.json")];

  it("ranks an exact name first", () => {
    expect(rankNotes("home", files, [], 5)[0]!.path).toBe("Archive/home.md");
  });

  it("matches aliases and reports them", () => {
    const [hit] = rankNotes("今天", files, [], 5);
    expect(hit!.path).toBe("Daily/2026-09-26.md");
    expect(hit!.alias).toBe("今天");
  });

  it("skips files Home cannot open and returns nothing for blank queries", () => {
    expect(rankNotes("data", files, [], 5)).toEqual([]);
    expect(rankNotes("   ", files, [], 5)).toEqual([]);
  });

  it("boosts recently opened files among equal matches", () => {
    const twins = [file("a/Notes.md"), file("b/Notes.md")];
    expect(rankNotes("notes", twins, ["b/Notes.md"], 2)[0]!.path).toBe("b/Notes.md");
  });

  it("respects the limit", () => {
    expect(rankNotes("o", files, [], 2)).toHaveLength(2);
  });
});

describe("noteNameFromQuery", () => {
  it("removes characters that are not allowed in file names", () => {
    expect(noteNameFromQuery("a/b: c?  [d]#")).toBe("a b c d");
  });
});
