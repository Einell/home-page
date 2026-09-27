import { readTodos, type TodoItem } from "./todo-data";

export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dueDate(text: string): string | null {
  const match = /(?:📅\s*|\[due::\s*)(\d{4}-\d{2}-\d{2})(?=\s|\]|$)/u.exec(text);
  return match && validDay(match[1]) ? match[1] : null;
}
export interface DatedTask extends TodoItem { due: string | null }
export function datedTasks(markdown: string): DatedTask[] {
  return readTodos(markdown).map(item => ({ ...item, due: dueDate(item.text) }));
}
export function inFolder(path: string, folder = ""): boolean {
  const base = folder.replace(/^\/+|\/+$/g, "");
  return !base || path.startsWith(`${base}/`);
}
export function eligibleNote(path: string): boolean {
  return !path.split("/").some(part => /^(templates?|_templates?)$/i.test(part));
}
export function taskProgress(markdown: string): { done: number; total: number } {
  const pending = readTodos(markdown).length;
  // Reuse the same fence/frontmatter exclusions for completed tasks.
  const done = readTodos(markdown.replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[ \]/gm, "$1[-]")
    .replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[[xX]\]/gm, "$1[ ]")).length;
  return { done, total: done + pending };
}
export interface FocusSession { endAt: number; remainingMs: number; durationMinutes: number }
export function focusRemaining(session: FocusSession, now = Date.now()): number {
  return Math.max(0, session.endAt ? session.endAt - now : session.remainingMs);
}
export function normalizeFocus(value: unknown): FocusSession {
  const raw = value && typeof value === "object" ? value as Partial<FocusSession> : {};
  const durationMinutes = typeof raw.durationMinutes === "number" && Number.isFinite(raw.durationMinutes) ? Math.min(180, Math.max(1, Math.round(raw.durationMinutes))) : 25;
  const remainingMs = typeof raw.remainingMs === "number" && Number.isFinite(raw.remainingMs) ? Math.min(10800000, Math.max(0, raw.remainingMs)) : durationMinutes * 60000;
  const endAt = typeof raw.endAt === "number" && Number.isFinite(raw.endAt) && raw.endAt > 0 ? raw.endAt : 0;
  return { durationMinutes, remainingMs, endAt };
}
