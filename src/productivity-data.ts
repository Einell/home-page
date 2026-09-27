import { readTodos, type TodoItem } from "./todo-data";

export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function taskDate(text: string, emoji: string, field: string): string | null {
  const pattern = new RegExp(`(?:${emoji}\\uFE0F?\\s*|[\\[(]${field}::\\s*)(\\d{4}-\\d{2}-\\d{2})(?=\\s|\\]|\\)|$)`, "u");
  const match = pattern.exec(text);
  return match && validDay(match[1]) ? match[1] : null;
}
/** Tasks plugin emoji or Dataview inline fields: 📅 / [due:: ] / (due:: ). */
export function dueDate(text: string): string | null { return taskDate(text, "📅", "due"); }
export function scheduledDate(text: string): string | null { return taskDate(text, "⏳", "scheduled"); }
export function startDate(text: string): string | null { return taskDate(text, "🛫", "start"); }
export interface DatedTask extends TodoItem { due: string | null; scheduled: string | null; start: string | null }
export function datedTasks(markdown: string): DatedTask[] {
  return readTodos(markdown).map(item => ({ ...item, due: dueDate(item.text), scheduled: scheduledDate(item.text), start: startDate(item.text) }));
}
/** Which list a task belongs to today: "today" (due or scheduled today), "overdue", "upcoming" (dated later), or null. */
export function taskBucket(task: Pick<DatedTask, "due" | "scheduled" | "start">, today: string): "today" | "overdue" | "upcoming" | null {
  if (task.start && task.start > today) return task.due || task.scheduled ? "upcoming" : null;
  if (task.due && task.due < today) return "overdue";
  if (task.due === today || task.scheduled === today) return "today";
  if (!task.due && task.scheduled && task.scheduled < today) return "overdue";
  if ((task.due && task.due > today) || (task.scheduled && task.scheduled > today)) return "upcoming";
  return null;
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}
/**
 * Marks a task line done without the Tasks plugin: emoji-style tasks get ✅ date, Dataview-style get [completion:: date].
 * Recurring tasks cannot produce their next copy here; the caller warns the user.
 */
export function completeTaskLine(line: string, today: string): string {
  const done = line.replace("[ ]", "[x]");
  if (/[[(]\w+::/.test(line)) return `${done.replace(/\s+$/, "")} [completion:: ${today}]`;
  if (/[📅⏳🛫🔁⏫🔼🔽🔺⏬]/u.test(line)) return `${done.replace(/\s+$/, "")} ✅ ${today}`;
  return done;
}
export function isRecurring(text: string): boolean { return /🔁|[[(]repeat::/u.test(text); }
/** Moves a task's due date (or scheduled date when it has no due date) to `day`. */
export function rescheduleLine(line: string, day: string): string {
  if (dueDate(line)) return line.replace(/(📅\uFE0F?\s*|[[(]due::\s*)\d{4}-\d{2}-\d{2}/u, `$1${day}`);
  return line.replace(/(⏳\uFE0F?\s*|[[(]scheduled::\s*)\d{4}-\d{2}-\d{2}/u, `$1${day}`);
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
export interface FocusSession {
  endAt: number; remainingMs: number;
  /** Length of the current session (a break is 5 minutes). */
  durationMinutes: number;
  /** The focus length the user chose; restored after a break. */
  focusMinutes: number;
  /** A break runs after a focus session and is not counted in the day's focus stats. */
  kind: "focus" | "break";
  /** What this session is for (a task or today's focus); written to the focus log. */
  label: string;
}
export function focusRemaining(session: FocusSession, now = Date.now()): number {
  return Math.max(0, session.endAt ? session.endAt - now : session.remainingMs);
}
export function normalizeFocus(value: unknown): FocusSession {
  const raw = value && typeof value === "object" ? value as Partial<FocusSession> : {};
  const durationMinutes = typeof raw.durationMinutes === "number" && Number.isFinite(raw.durationMinutes) ? Math.min(180, Math.max(1, Math.round(raw.durationMinutes))) : 25;
  const remainingMs = typeof raw.remainingMs === "number" && Number.isFinite(raw.remainingMs) ? Math.min(10800000, Math.max(0, raw.remainingMs)) : durationMinutes * 60000;
  const endAt = typeof raw.endAt === "number" && Number.isFinite(raw.endAt) && raw.endAt > 0 ? raw.endAt : 0;
  const focusMinutes = typeof raw.focusMinutes === "number" && Number.isFinite(raw.focusMinutes) ? Math.min(180, Math.max(1, Math.round(raw.focusMinutes))) : durationMinutes;
  return { durationMinutes, focusMinutes, remainingMs, endAt, kind: raw.kind === "break" ? "break" : "focus", label: typeof raw.label === "string" ? raw.label.slice(0, 240) : "" };
}
