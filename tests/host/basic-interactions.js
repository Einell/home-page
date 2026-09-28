// Run with host_eval.py in the dedicated QA vault. Restores settings and removes its own note.
if (!app.vault.getName().includes('qa')) throw new Error('QA vault required');
const win=require('electron').remote.getCurrentWindow();
require('electron').remote.app.focus({steal:true});win.focus();
const p=app.plugins.plugins['qiaomu-home'];
const settings=structuredClone(p.settings);
const originalProcess=app.vault.process;
const originalSave=p.saveSettings;
const dailyCommand=app.commands.commands['daily-notes'];
const fixture=`Qiaomu-interactions-${crypto.randomUUID()}.md`;
const checks=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
const pause=(ms=150)=>new Promise(r=>setTimeout(r,ms));
const type=(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
const key=(el,name,options={})=>el.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...options}));
let release;
try {
 document.querySelectorAll('.modal-header-button:has(.lucide-x)').forEach(e=>e.click());
 await app.vault.create(fixture,'# Interaction QA\n');
 const page=p.settings.pages.find(x=>x.id===p.settings.homePageId);
 p.settings.activePageId=page.id;
 p.settings.captureTarget='inbox';p.settings.captureInboxPath=fixture;
 p.settings.todoDaily=false;p.settings.todoPath=fixture;
 p.settings.dailyFocus={day:'',items:[]};
 for(const id of ['quick-capture','daily-focus','todo'])page.moduleOptions[id]={visible:true,limit:3};
 page.moduleOrder=['quick-capture','daily-focus','todo'];
 delete app.commands.commands['daily-notes'];
 await p.saveSettings();await p.openHome();await pause();
 const view=app.workspace.getMostRecentLeaf().view;
 const root=view.contentEl;
 const search=root.querySelector('.qh-search-input');
 search.blur();
 const before=search.getBoundingClientRect();
 assert(getComputedStyle(search,'::placeholder').opacity!=='0','Search hint visible when not focused');
 search.parentElement.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
 assert(document.activeElement===search,'Clicking search padding focuses input');
 assert(getComputedStyle(search,'::placeholder').opacity==='0','Search hint hides on focus');
 const after=search.getBoundingClientRect();
 assert(before.width===after.width&&before.height===after.height,'Search focus does not shift layout');
 root.addClass('qh-has-photo');
 assert(getComputedStyle(search).caretColor==='rgb(255, 255, 255)','Search caret is white over a wallpaper');
 type(search,'Interaction QA');
 assert(search.getAttribute('aria-expanded')==='true','Typing opens search results');
 key(search,'ArrowDown');
 const active=document.getElementById(search.getAttribute('aria-activedescendant'));
 assert(active?.getAttribute('aria-selected')==='true','Search selection is exposed to assistive technology');
 key(search,'Enter',{isComposing:true});
 assert(search.value==='Interaction QA'&&search.getAttribute('aria-expanded')==='true','IME confirmation does not execute search');
 key(search,'Enter',{keyCode:229});
 assert(search.value==='Interaction QA','Legacy IME confirmation does not execute search');
 key(search,'Tab');
 assert(search.getAttribute('aria-expanded')==='false'&&!search.hasAttribute('aria-activedescendant'),'Tab dismisses result list and active descendant');
 type(search,'clear me');root.querySelector('.qh-search-clear').click();
 assert(search.value===''&&document.activeElement===search,'Clear button empties search and retains focus');
 search.blur();assert(getComputedStyle(search,'::placeholder').opacity!=='0','Empty search hint returns after blur');
 const quick=()=>root.querySelector('[data-module="quick-capture"] textarea');
 const focus=()=>root.querySelector('[data-module="daily-focus"] input');
 const todo=root.querySelector('.qh-todo-form input');
 for(const field of [quick(),focus(),todo]) {
  const box=field.getBoundingClientRect();field.focus();
  assert(getComputedStyle(field,'::placeholder').opacity==='0',`Focused ${field.tagName} hint is hidden`);
  assert(getComputedStyle(field).boxShadow==='none','Card input has no glow');
  assert(getComputedStyle(field).caretColor==='rgb(255, 255, 255)','Card input caret is white over a wallpaper');
  assert(box.width===field.getBoundingClientRect().width&&box.height===field.getBoundingClientRect().height,'Card input focus keeps geometry');
 }
 // Check the light theme independently of the wallpaper's dark field treatment.
 const wasDark=document.body.classList.contains('theme-dark');
 const wasLight=document.body.classList.contains('theme-light');
 try {
  document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');root.removeClass('qh-has-photo');
  assert(getComputedStyle(search).caretColor!=='rgb(255, 255, 255)','Light-theme caret remains dark');
 } finally {
  document.body.classList.toggle('theme-dark',wasDark);document.body.classList.toggle('theme-light',wasLight);root.addClass('qh-has-photo');
 }
 view.openLibrary(page.id);await pause();
 const modal=document.querySelector('.qh-library-modal');
 const modalInput=modal.querySelector('input');modalInput.focus();
 assert(getComputedStyle(modalInput,'::placeholder').opacity==='0','Component-library dialog hides placeholder on focus');
 assert(getComputedStyle(modalInput).boxShadow==='none','Dialog field has no focus glow');
 modal.querySelector('.modal-header-button:has(.lucide-x)').click();await pause();
 // A delayed disk write must neither duplicate the submission nor erase a newer draft.
 let writes=0;
 const gate=new Promise(r=>{release=r;});
 app.vault.process=async function(file,fn,...args){if(file.path===fixture){writes++;await gate;}return originalProcess.call(this,file,fn,...args);};
 quick().focus();type(quick(),'Saved first');key(quick(),'Enter');key(quick(),'Enter');
 await pause(20);type(quick(),'Keep newer draft');release();await pause(350);
 assert(writes===1,'Repeated Enter during capture creates only one write');
 assert((await app.vault.read(app.vault.getAbstractFileByPath(fixture))).includes('Saved first'),'Capture persists submitted text');
 assert(quick().value==='Keep newer draft','Capture retains newer text entered while saving');
 app.vault.process=originalProcess;
 // Failed focus persistence keeps the draft and rolls back the displayed state.
 focus().focus();type(focus(),'Keep failed focus draft');
 p.saveSettings=async()=>{throw new Error('QA simulated save failure');};
 key(focus(),'Enter');await pause(350);
 assert(focus().value==='Keep failed focus draft','Failed daily focus save retains draft after refresh');
 assert(!p.settings.dailyFocus.items.length,'Failed daily focus save rolls back settings');
 p.saveSettings=originalSave;
 // Native forms must not treat candidate acceptance as a submit.
 todo.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
 type(todo,'候选词');const submit=new Event('submit',{cancelable:true,bubbles:true});
 todo.closest('form').dispatchEvent(submit);
 assert(submit.defaultPrevented&&!todo.disabled,'Todo form blocks submission during IME composition');
 todo.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
 // The shared status-bar rule is evaluated against every confirmed Qiaomu view type.
 search.focus();
 const host=view.containerEl;
 const viewType=host.getAttribute('data-type');
 for(const typeName of ['qiaomu-home','qiaomu-agent-view','qiaomu-ai-rss-reader','qiaomu-reader','qiaomu-reader-library','qiaomu-book-reader-ai-chat','qiaomu-radio-view','qiaomu-wechat-preview']) {
  host.setAttribute('data-type',typeName);
  assert(getComputedStyle(document.querySelector('.status-bar')).display==='none',`Status bar hidden for ${typeName}`);
 }
 host.setAttribute('data-type',viewType);
 const noteLeaf=app.workspace.getLeaf('tab');
 await noteLeaf.openFile(app.vault.getAbstractFileByPath(fixture));
 assert(getComputedStyle(document.querySelector('.status-bar')).display!=='none','Status bar returns for an actual Markdown note with Home still open');
 noteLeaf.detach();await p.openHome();
 assert(getComputedStyle(document.querySelector('.status-bar')).display==='none','Status bar hides again after returning to Home');
 return {version:p.manifest.version,checks,statusScope:'All eight CSS view selectors plus real Home/Markdown switching'};
} finally {
 document.querySelectorAll('.modal-header-button:has(.lucide-x)').forEach(e=>e.click());
 release?.();app.vault.process=originalProcess;p.saveSettings=originalSave;
 if(dailyCommand)app.commands.commands['daily-notes']=dailyCommand;
 p.settings=settings;await p.saveSettings();
 const file=app.vault.getAbstractFileByPath(fixture);if(file)await app.vault.delete(file);
}
