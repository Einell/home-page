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
  const at = rows.findIndex((line,i) => headings.has(i) && line === `## ${heading}`);
  const lines = block.split(/\r?\n/);
  if (at < 0 && heading === '今日待办') {
    const carry=rows.findIndex((line,i)=>headings.has(i) && line==='## 昨日未完成');
    if(carry>=0){rows.splice(carry,0,'## 今日待办',...lines,'');return rows.join(eol);}
  }
  if (at < 0) return `${content}${content && !content.endsWith('\n') ? eol : ''}${content ? eol : ''}## ${heading}${eol}${lines.join(eol)}${eol}`;
  let end = at + 1; while (end < rows.length && !headings.has(end)) end++;
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

export function todayFirst(content: string, tasks: TodoItem[]): TodoItem[] {
  const rows=content.split(/\r?\n/);
  const start=rows.findIndex(line=>line==='## 今日待办');
  if(start<0)return tasks;
  let end=start+1;while(end<rows.length&&!/^#{1,2} /.test(rows[end]))end++;
  return [...tasks.filter(t=>t.line>start&&t.line<end),...tasks.filter(t=>t.line<=start||t.line>=end)];
}
