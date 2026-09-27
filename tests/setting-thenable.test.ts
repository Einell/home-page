import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Obsidian's Setting defines `then(cb) { cb(this); return this }`. Returning a Setting from a promise callback makes
// the promise adopt it forever: an endless microtask loop that freezes Obsidian (goal-progress "choose note", 0.4.1).
describe("Setting is thenable", () => {
  it("is never returned from an expression-bodied arrow", () => {
    const offenders = readdirSync("src").filter(name => name.endsWith(".ts")).flatMap(name =>
      readFileSync(`src/${name}`, "utf8").split("\n").flatMap((line, index) =>
        /=>\s*\(?[A-Za-z_$][\w$]*\.(?:setDesc|setName|setHeading|setClass|setTooltip|setDisabled|setVisibility|setNavigable|clear)\(/.test(line) ? [`${name}:${index + 1}`] : []));
    expect(offenders).toEqual([]);
  });
});
