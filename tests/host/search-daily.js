// QA-only: use an isolated daily folder/template and restore all configuration.
if(!app.vault.getName().includes('qa'))throw Error('QA vault required');
const p=app.plugins.plugins['qiaomu-home'];
const daily=app.internalPlugins.getPluginById('daily-notes').instance;
const options={...daily.options};
const settings=structuredClone(p.settings);
const folder=`Search-daily-QA-${crypto.randomUUID()}`;
const checks=[];
const assert=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg)};
try{
 await app.vault.createFolder(folder);
 await app.vault.create(`${folder}/Template.md`,'# {{title}}\nExisting template text\n');
 daily.options={folder,format:'YYYY_MM_DD',template:`${folder}/Template`};
 p.settings.captureTarget='inbox';p.settings.captureInboxPath=`${folder}/Inbox.md`;
 await p.openHome();const view=app.workspace.getMostRecentLeaf().view;
 const input=view.contentEl.querySelector('.qh-search-input');
 input.value='今日记录 QA';input.dispatchEvent(new Event('input',{bubbles:true}));
 assert(view.contentEl.textContent.includes('记录到今日日记'),'Search action names the daily note even when card target is Inbox');
 await view.capture('今日记录 QA');
 const file=app.vault.getMarkdownFiles().find(f=>f.path.startsWith(folder+'/')&&!f.path.endsWith('Template.md'));
 assert(!!file&&/\d{4}_\d{2}_\d{2}\.md$/.test(file.path),'Search uses configured daily folder and date format');
 const content=await app.vault.read(file);
 assert(content.includes('Existing template text')&&content.includes('今日记录 QA'),'Search creates daily template then appends capture');
 await view.capture('第二笔 QA');
 const next=await app.vault.read(file);
 assert(next.includes('今日记录 QA')&&next.includes('第二笔 QA'),'Second capture preserves existing daily content');
 assert(!app.vault.getAbstractFileByPath(`${folder}/Inbox.md`),'Search does not silently write to Inbox');
 const command=app.commands.commands['daily-notes'];
 try{
  delete app.commands.commands['daily-notes'];input.value='Keep failed daily capture';await view.capture(input.value);
  assert(input.value==='Keep failed daily capture','Disabled daily notes preserves failed capture draft');
  assert(app.setting.activeTab?.id==='plugins','Disabled daily notes opens the actual Core plugins settings');
  app.setting.close();
 }finally{app.commands.commands['daily-notes']=command;}
 return {checks};
}finally{
 daily.options=options;p.settings=settings;await p.saveSettings();
 const dir=app.vault.getAbstractFileByPath(folder);if(dir)await app.vault.delete(dir,true);
}
