import { describe, expect, it } from "vitest";
import { dropAfter, edgeScrollSpeed } from "../src/drag-feedback";
describe("sorting placement", () => {
  const rect = { left: 100, top: 200, width: 80, height: 120 };
  it("uses the same midpoint rule for horizontal shortcuts/pages and vertical cards", () => {
    expect(dropAfter("x", rect, { clientX: 110, clientY: 310 })).toBe(false);
    expect(dropAfter("x", rect, { clientX: 170, clientY: 210 })).toBe(true);
    expect(dropAfter("y", rect, { clientX: 170, clientY: 210 })).toBe(false);
    expect(dropAfter("y", rect, { clientX: 110, clientY: 310 })).toBe(true);
  });
  it("only scrolls inside viewport edges, including short panes", () => {
    expect(edgeScrollSpeed(50, 100, 900)).toBe(0);
    expect(edgeScrollSpeed(950, 100, 900)).toBe(0);
    expect(edgeScrollSpeed(500, 100, 900)).toBe(0);
    expect(edgeScrollSpeed(105, 100, 900)).toBeLessThan(0);
    expect(edgeScrollSpeed(895, 100, 900)).toBeGreaterThan(0);
    expect(edgeScrollSpeed(130, 100, 160)).toBe(0);
  });
});
