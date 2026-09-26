import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("published protocol files", () => {
  it("ships the exact file Home itself uses", () => {
    expect(read("protocol/qiaomu-home.ts")).toBe(read("src/protocol/qiaomu-home.ts"));
  });

  it("keeps the JavaScript build in step with the TypeScript constants", () => {
    const js = read("protocol/qiaomu-home.js");
    for (const constant of ['HOME_PROTOCOL = "qiaomu-home"', "HOME_VERSION = 1", 'HOME_CHANGED_EVENT = "qiaomu-home:changed"', "MAX_SECTION_ITEMS = 6"]) {
      expect(js).toContain(constant);
    }
  });
});
