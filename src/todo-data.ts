export interface TodoItem { line: number; raw: string; text: string }
/** Only plain unchecked Markdown tasks, outside YAML and fenced code. */
export function readTodos(content: string): TodoItem[] {
  const rows = content.split('\n');
  const result: TodoItem[] = [];
  let fence = '', yaml = rows[0]?.trim() === '---';
  rows.forEach((raw, line) => {
    if (yaml) { if (line > 0 && /^(---|\.\.\.)\s*$/.test(raw)) yaml = false; return; }
    const boundary = /^\s{0,3}(`{3,}|~{3,})/.exec(raw);
    if (boundary) { if (!fence) fence = boundary[1]; else if (boundary[1][0] === fence[0] && boundary[1].length >= fence.length) fence = ''; return; }
    if (fence) return;
    const match = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.+?)\r?$/.exec(raw);
    if (match) result.push({ line, raw, text: match[1] });
  });
  return result;
}
export function completeTodo(current: string, snapshot: string, item: TodoItem): string {
  if (current !== snapshot || !readTodos(current).some(t => t.line === item.line && t.raw === item.raw)) throw new Error('Task changed');
  const rows = current.split('\n');
  rows[item.line] = rows[item.line].replace('[ ]', '[x]');
  return rows.join('\n');
}
export function appendTodo(content: string, text: string): string {
  const task = text.trim().replace(/[\r\n]+/g, ' ');
  if (!task) throw new Error('Empty task');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  return `${content}${content && !content.endsWith('\n') ? eol : ''}- [ ] ${task}${eol}`;
}
