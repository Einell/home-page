import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// 0.5.0 regression: a private `open(...)` helper on HomeView replaced Obsidian's View.open(),
// so Home tabs never ran onOpen and stayed blank. Lifecycle names must stay Obsidian's.
describe("HomeView lifecycle", () => {
  it("does not define methods that shadow Obsidian's View lifecycle", () => {
    const source = readFileSync("src/view.ts", "utf8");
    for (const name of ["open", "close", "load", "unload", "onload", "onunload", "setState", "getState"]) {
      expect(source).not.toMatch(new RegExp(`^\\s+(?:private |protected |public )?(?:async )?${name}\\(`, "m"));
    }
  });
});
