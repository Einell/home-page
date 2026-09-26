import { describe, expect, it } from 'vitest';
import { TFile } from 'obsidian';
import { carrySelected } from '../src/todo-carry';
import { carryTasks } from '../src/todo-data';
import type Plugin from '../src/main';
function fixture() {
  const files = new Map<string,TFile>();
  const data = new Map<string,string>([['yesterday.md','- [ ] parent\n  - [ ] child\n'],['today.md','# Today\n']]);
  for(const path of data.keys())files.set(path,Object.assign(new TFile(),{path}));
  let failSource=false;
  const journal=new Map<string,string>();
  const plugin={manifest:{id:'qiaomu-home'},settings:{todoDaily:false,todoPath:'today.md'},app:{workspace:{getLeavesOfType:()=>[]},vault:{configDir:'.obsidian',getAbstractFileByPath:(path:string)=>files.get(path),read:async(file:TFile)=>data.get(file.path),process:async(file:TFile,fn:(s:string)=>string)=>{if(failSource&&file.path==='yesterday.md')throw new Error('disk full');data.set(file.path,fn(data.get(file.path)!));},adapter:{exists:async(path:string)=>journal.has(path),read:async(path:string)=>journal.get(path),write:async(path:string,value:string)=>{journal.set(path,value);},remove:async(path:string)=>{journal.delete(path);}}}}} as unknown as Plugin;
  return {plugin,data,journal,group:()=>{const snapshot=data.get('yesterday.md')!;return {file:files.get('yesterday.md')!,snapshot,tasks:carryTasks(snapshot)};},fail:(value:boolean)=>{failSource=value;}};
}
describe('durable carry operation',()=>{
  it('preserves the source on failed second write and recovers without duplicate target tasks',async()=>{
    const f=fixture();f.fail(true);
    await expect(carrySelected(f.plugin,'today.md',[f.group()])).rejects.toThrow('disk full');
    expect(f.data.get('yesterday.md')).toContain('- [ ] parent');
    expect(f.data.get('today.md')).toContain('- [ ] child');
    expect(f.journal.size).toBe(1);
    f.fail(false);await carrySelected(f.plugin,'today.md',[]);
    expect(f.data.get('yesterday.md')).toContain('已移至 today');
    expect(f.data.get('today.md')!.match(/parent/g)).toHaveLength(1);
    expect(f.journal.size).toBe(0);
  });
  it('refuses stale input without modifying either file',async()=>{
    const f=fixture(),group=f.group();f.data.set('yesterday.md','new edit\n'+group.snapshot);
    await expect(carrySelected(f.plugin,'today.md',[group])).rejects.toThrow('Task changed');
    expect(f.data.get('today.md')).toBe('# Today\n');expect(f.data.get('yesterday.md')).toContain('new edit');
  });
  it('does not overwrite external edits while recovering',async()=>{
    const f=fixture();f.fail(true);await expect(carrySelected(f.plugin,'today.md',[f.group()])).rejects.toThrow();
    f.fail(false);f.data.set('today.md',f.data.get('today.md')+'external edit');
    await expect(carrySelected(f.plugin,'today.md',[])).rejects.toThrow('Transfer conflict');
    expect(f.data.get('today.md')).toContain('external edit');expect(f.journal.size).toBe(1);
  });
});
