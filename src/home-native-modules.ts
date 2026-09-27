import { TFile, type App } from "obsidian";

function isTemplate(file: TFile): boolean {
  return file.path.split("/").some((part) => /^(templates?|_templates?)$/i.test(part));
}

/** Recently edited is deliberately different from Obsidian's last-opened list. */
export function recentlyModified(app: App, limit: number, folder = ""): TFile[] {
  const prefix = folder ? `${folder.replace(/\/$/, "")}/` : "";
  return app.vault.getMarkdownFiles()
    .filter((file) => file instanceof TFile && !isTemplate(file) && (!prefix || file.path.startsWith(prefix)))
    .sort((a, b) => b.stat.mtime - a.stat.mtime || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export function reviewCandidates(app: App, folder: string): TFile[] {
  const prefix = folder ? `${folder.replace(/\/$/, "")}/` : "";
  return app.vault.getMarkdownFiles().filter((file) => file instanceof TFile &&
    (!prefix || file.path.startsWith(prefix)) &&
    !isTemplate(file));
}

/** A short, text-only overview avoids running embeds, scripts or heavy Markdown on Home. */
export function dailyExcerpt(markdown: string, limit: number): string[] {
  const lines = markdown.replace(/^\uFEFF?---\s*\n[\s\S]*?\n---\s*\n?/, "").split(/\r?\n/);
  const result: string[] = [];
  let code = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) { code = !code; continue; }
    if (code || !line.trim() || /^\s*%%/.test(line)) continue;
    const text = line.trim().replace(/^#{1,6}\s+/, "").replace(/^[-*+]\s+/, "")
      .replace(/^\[[ xX]\]\s*/, "").replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2").replace(/[*_`~]/g, "").trim();
    // Empty list items ("- ") and bare quote/number markers carry no content.
    if (text && !/^([-*+>]|\d+[.)])$/.test(text)) result.push(text.slice(0, 180));
    if (result.length === limit) break;
  }
  return result;
}
