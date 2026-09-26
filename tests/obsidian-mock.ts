// Minimal stand-ins for the Obsidian APIs the pure modules touch.
export function getLanguage(): string { return "zh"; }
export function prepareFuzzySearch(query: string) {
  const q = query.toLowerCase();
  return (text: string) => {
    const t = text.toLowerCase();
    let i = 0, score = 0, last = -1;
    for (const ch of q) {
      const at = t.indexOf(ch, i);
      if (at < 0) return null;
      score -= at - last - 1;
      last = at; i = at + 1;
    }
    return { score, matches: [] };
  };
}
export async function requestUrl(): Promise<never> { throw new Error("network disabled in tests"); }
export class TFile {}
export function moment() { return { format: (pattern: string) => pattern.replace("YYYY", "2026").replace("MM", "09").replace("DD", "26") }; }
export function normalizePath(path: string): string { return path.replace(/\/+/g, "/").replace(/^\/|\/$/g, ""); }
export class MarkdownView {}
