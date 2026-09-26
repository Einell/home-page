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
