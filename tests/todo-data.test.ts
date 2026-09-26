import { describe, expect, it } from 'vitest';
import { readTodos, appendTodo, completeTodo } from '../src/todo-data';
describe('Markdown tasks', () => {
  it('ignores YAML, fenced examples and completed/custom statuses', () => {
    expect(readTodos('---\n- [ ] yaml\n---\n```md\n- [ ] sample\n```\n- [x] done\n- [/] custom\n  - [ ] real ^id').map(t=>t.text)).toEqual(['real ^id']);
  });
  it('changes only the exact task marker and preserves CRLF and duplicates', () => {
    const source = '- [ ] same\r\n- [ ] same\r\n  child\r\n';
    expect(completeTodo(source, source, readTodos(source)[1])).toBe('- [ ] same\r\n- [x] same\r\n  child\r\n');
  });
  it('refuses stale snapshots', () => {
    const old = '- [ ] first';
    expect(()=>completeTodo('intro\n'+old,old,readTodos(old)[0])).toThrow();
  });
  it('appends one task without replacing existing content', () => {
    expect(appendTodo('notes\r\n', 'one\ntwo')).toBe('notes\r\n- [ ] one two\r\n');
    expect(()=>appendTodo('', '  ')).toThrow();
  });
});

import { carryTasks, carrySource, carryBlock, underHeading } from '../src/todo-data';
describe('daily carry forward',()=>{
  it('moves selected parent with nested tasks and leaves siblings alone',()=>{
    const source='## Tasks\n- [ ] parent\n  - [ ] child\n  details\n- [ ] sibling\n';
    const tasks=carryTasks(source);
    expect(tasks).toHaveLength(2);
    expect(carrySource(source,[tasks[0]],'Daily/2026-09-27.md')).toBe('## Tasks\n- parent → [[Daily/2026-09-27|已移至 2026-09-27]]\n- [ ] sibling\n');
    expect(tasks[0].block).toContain('- [ ] child');
  });
  it('does not deduplicate distinct tasks with identical names',()=>{
    const tasks=carryTasks('- [ ] same\n- [ ] same');expect(tasks).toHaveLength(2);
    expect(readTodos(carrySource('- [ ] same\n- [ ] same',[tasks[1]],'today.md'))).toHaveLength(1);
  });
  it('normalizes a child of a completed parent into a top-level carried task',()=>{
    expect(carryBlock(carryTasks('- [x] parent\n    - [ ] child\n      detail')[0])).toBe('- [ ] child\n  detail');
  });
  it('inserts under the proper heading, excluding code examples',()=>{
    const source='```md\n## 今日待办\n```\n## 今日待办\n- [ ] old\n## Notes\ntext';
    expect(underHeading(source,'今日待办','- [ ] new')).toBe('```md\n## 今日待办\n```\n## 今日待办\n- [ ] old\n- [ ] new\n## Notes\ntext');
    expect(()=>underHeading('```','今日待办','task')).toThrow();
  });
});
it('places new daily tasks above carried tasks',()=>{
  expect(underHeading('## 昨日未完成\n- [ ] old\n','今日待办','- [ ] new')).toBe('## 今日待办\n- [ ] new\n\n## 昨日未完成\n- [ ] old\n');
});
