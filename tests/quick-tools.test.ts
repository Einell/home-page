import { describe, expect, it } from "vitest";
import { fillTemplate, parseBookmarks, templateFileName } from "../src/quick-tools";

describe("template creation", () => {
  it("requires a single safe file name", () => {
    expect(templateFileName(" My Note.md ")).toBe("My Note.md");
    for (const value of ["../Secret", "", "A/B", "C:\\File", "bad?", "..", "last."]) expect(() => templateFileName(value)).toThrow();
  });
  it("expands supported tokens without executing template scripts", () => {
    expect(fillTemplate("{{title}} {{date}} {{time:HH:mm:ss}} <% code %>", "Note", pattern => pattern))
      .toBe("Note YYYY-MM-DD HH:mm:ss <% code %>");
  });
});

describe("bookmark import", () => {
  it("imports exported anchors, deduplicates and rejects executable URLs", () => {
    const html = '<DL><A HREF="https://example.com">Example</A><A HREF="https://example.com/">Duplicate</A><A HREF="javascript:alert(1)">Bad</A><A HREF="https://u:p@example.com/">Secret</A><A HREF="https://b.com">Another</A></DL>';
    expect(parseBookmarks(html, text => text)).toEqual([{name:"Example",url:"https://example.com/"},{name:"Another",url:"https://b.com/"}]);
  });
  it("limits large imports before creating home tiles", () => {
    expect(parseBookmarks(Array.from({length:75},(_,i)=>`<A HREF="https://example.com/${i}">${i}</A>`).join(""), text => text)).toHaveLength(50);
    expect(() => parseBookmarks(" ".repeat(2_000_001), text => text)).toThrow();
  });
});
