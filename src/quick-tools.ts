import { L } from "./i18n";
import { webTarget } from "./shortcuts";
export function templateFileName(value: string): string {
  const name = value.trim().replace(/\.md$/i, "");
  if (!name || name.length > 120 || /[\\/:*?"<>|]/.test(name) || [...name].some(char => char.charCodeAt(0) < 32) || /^\.{1,2}$/.test(name) || /[. ]$/.test(name)) throw new Error(L("请输入有效的笔记名称（不含路径或特殊字符）", "Enter a valid note name (no path or special characters)"));
  return `${name}.md`;
}
export function fillTemplate(source: string, title: string, format: (pattern: string) => string): string {
  return source.replace(/{{(date(?::[^}]+)?|time(?::[^}]+)?|title)}}/gi, (_, token: string) => {
    if (token.toLowerCase() === "title") return title;
    const [kind, ...parts] = token.split(":");
    return format(parts.join(":") || (kind.toLowerCase() === "time" ? "HH:mm" : "YYYY-MM-DD"));
  });
}
export function parseBookmarks(html: string, decode: (value: string) => string): Array<{ name: string; url: string }> {
  if (html.length > 2_000_000) throw new Error(L("书签文件太大，请使用小于 2 MB 的 HTML 文件", "The bookmark file is too large; use an HTML file under 2 MB"));
  const results: Array<{ name: string; url: string }> = [], seen = new Set<string>();
  const pattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const url = webTarget(decode(match[2]));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    results.push({ name: decode(match[3].replace(/<[^>]*>/g, "")).trim().slice(0, 120) || new URL(url).hostname, url });
    if (results.length === 50) break;
  }
  return results;
}

export function decodeBookmarkText(value: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (raw, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? raw;
    const point = entity.toLowerCase().startsWith("#x") ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : raw;
  });
}
