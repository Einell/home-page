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
/** Finds the task again after the note changed: same line first, else the only line with the same text. */
export function locateTodo(current: string, item: TodoItem): number {
  const rows = current.split('\n');
  if (rows[item.line] === item.raw && readTodos(current).some(t => t.line === item.line)) return item.line;
  const matches = readTodos(current).filter(t => t.raw === item.raw);
  if (matches.length !== 1) throw new Error('Task changed');
  return matches[0].line;
}
export function completeTodo(current: string, _snapshot: string, item: TodoItem): string {
  const rows = current.split('\n');
  const line = locateTodo(current, item);
  rows[line] = rows[line].replace('[ ]', '[x]');
  return rows.join('\n');
}
/** Reverts a completion made from Home; `done` is exactly what Home wrote (several lines for a recurring task). */
export function reopenTodo(current: string, done: string, original: string): string {
  const rows = current.split('\n'), block = done.split('\n');
  const at: number[] = [];
  for (let i = 0; i + block.length <= rows.length; i++) if (block.every((line, j) => rows[i + j].replace(/\r$/, '') === line.replace(/\r$/, ''))) at.push(i);
  if (at.length !== 1) throw new Error('Task changed');
  const cr = rows[at[0]].endsWith('\r') ? '\r' : '';
  rows.splice(at[0], block.length, original.replace(/\r$/, '') + cr);
  return rows.join('\n');
}
/** Replaces one located task line (possibly with several lines, e.g. a recurring task's next copy). */
export function replaceTodo(current: string, item: TodoItem, lines: string): { text: string; line: number } {
  const rows = current.split('\n');
  const line = locateTodo(current, item);
  const cr = rows[line].endsWith('\r') ? '\r' : '';
  rows.splice(line, 1, ...lines.split(/\r?\n/).map(row => row + cr));
  return { text: rows.join('\n'), line };
}
/** Task text without Tasks/Dataview metadata or Markdown syntax, for display on cards. */
export function taskDisplay(text: string): string {
  return text
    .replace(/[📅⏳🛫✅➕❌]\uFE0F?\s*\d{4}-\d{2}-\d{2}/gu, '')
    .replace(/🔁\uFE0F?\s*[^📅⏳🛫✅➕❌⏫🔼🔽🔺⏬🆔⛔#[]*/gu, '')
    .replace(/[⏫🔼🔽🔺⏬]\uFE0F?/gu, '')
    .replace(/(?:🆔|⛔)\uFE0F?\s*[\w,-]+/gu, '')
    .replace(/[[(][\w-]+::[^\])]*[\])]/g, '')
    .replace(/!?\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|==|`)/g, '')
    .replace(/\s{2,}/g, ' ').trim() || text.trim();
}
export function appendTodo(content: string, text: string): string {
  const task = text.trim().replace(/[\r\n]+/g, ' ');
  if (!task) throw new Error('Empty task');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  return `${content}${content && !content.endsWith('\n') ? eol : ''}- [ ] ${task}${eol}`;
}

export interface CarryTask extends TodoItem { end: number; block: string }
/** A selected parent carries its indented descendants exactly once. */
export function carryTasks(content: string): CarryTask[] {
  const rows = content.split('\n'), result: CarryTask[] = [];
  for (const item of readTodos(content)) {
    if (result.some(parent => item.line < parent.end)) continue;
    const indent = (item.raw.match(/^\s*/)?.[0] ?? '').replace(/\t/g, '    ').length;
    let end = item.line + 1;
    while (end < rows.length) {
      if (!rows[end].trim()) { let next = end + 1; while (next < rows.length && !rows[next].trim()) next++; if (next >= rows.length || (rows[next].match(/^\s*/)?.[0] ?? '').replace(/\t/g, '    ').length <= indent) break; }
      else if ((rows[end].match(/^\s*/)?.[0] ?? '').replace(/\t/g, '    ').length <= indent) break;
      end++;
    }
    result.push({ ...item, end, block: rows.slice(item.line, end).join('\n') });
  }
  return result;
}
export function underHeading(content: string, heading: string, block: string): string {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const rows = content.split(/\r?\n/);
  const headings = new Set<number>();
  let fence = '', yaml = rows[0] === '---';
  rows.forEach((line, i) => {
    if(yaml){if(i>0 && /^(---|\.\.\.)\s*$/.test(line))yaml=false;return;}
    const match=/^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if(match){if(!fence)fence=match[1];else if(match[1][0]===fence[0]&&match[1].length>=fence.length)fence='';return;}
    if(!fence && /^#{1,2} /.test(line))headings.add(i);
  });
  if(fence || yaml)throw new Error('Unclosed Markdown block');
  const family = [TODAY_HEADINGS, CARRY_HEADINGS].find(names => names.includes(heading)) ?? [heading];
  let at = rows.findIndex((line,i) => headings.has(i) && line === `## ${heading}`);
  if (at < 0) at = rows.findIndex((line,i) => headings.has(i) && family.some(name => line === `## ${name}`));
  const lines = block.split(/\r?\n/);
  if (at < 0 && TODAY_HEADINGS.includes(heading)) {
    const carry=rows.findIndex((line,i)=>headings.has(i) && CARRY_HEADINGS.some(h=>line===`## ${h}`));
    if(carry>=0){rows.splice(carry,0,`## ${heading}`,...lines,'');return rows.join(eol);}
  }
  if (at < 0) return `${content}${content && !content.endsWith('\n') ? eol : ''}${content ? eol : ''}## ${heading}${eol}${lines.join(eol)}${eol}`;
  let end = at + 1; while (end < rows.length && !headings.has(end)) end++;
  // New tasks join the list, not the blank lines that separate it from the next section.
  while (end > at + 1 && !rows[end - 1].trim()) end--;
  rows.splice(end, 0, ...lines); return rows.join(eol);
}
export function carrySource(content: string, selected: CarryTask[], target: string): string {
  const rows = content.split('\n');
  for (const item of [...selected].sort((a,b) => b.line - a.line)) {
    if (rows.slice(item.line,item.end).join('\n') !== item.block) throw new Error('Task changed');
    const indent = item.raw.match(/^\s*/)?.[0] ?? '';
    rows.splice(item.line,item.end-item.line,`${indent}- ${item.text} → [[${target.replace(/\.md$/, '')}|已移至 ${target.split('/').pop()?.replace(/\.md$/, '')}]]${item.raw.endsWith('\r') ? '\r' : ''}`);
  }
  return rows.join('\n');
}

export function carryBlock(task: CarryTask): string {
  const prefix=task.raw.match(/^\s*/)?.[0] ?? '';
  return task.block.split('\n').map(line=>line.startsWith(prefix)?line.slice(prefix.length):line).join('\n');
}

/** Headings Home writes into daily notes; both languages are recognized when reading. */
export const TODAY_HEADINGS = ['今日待办', 'Today'];
export const CARRY_HEADINGS = ['昨日未完成', 'Carried over'];
export function todayFirst(content: string, tasks: TodoItem[]): TodoItem[] {
  const rows=content.split(/\r?\n/);
  const start=rows.findIndex(line=>TODAY_HEADINGS.some(h=>line===`## ${h}`));
  if(start<0)return tasks;
  let end=start+1;while(end<rows.length&&!/^#{1,2} /.test(rows[end]))end++;
  return [...tasks.filter(t=>t.line>start&&t.line<end),...tasks.filter(t=>t.line<=start||t.line>=end)];
}
