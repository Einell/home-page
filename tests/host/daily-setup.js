if(!app.vault.getName().includes('qa'))throw Error('QA only');
const p=app.plugins.plugins['qiaomu-home'];await p.openHome();
const view=app.workspace.getMostRecentLeaf().view;
const input=view.contentEl.querySelector('.qh-search-input');
input.value='Daily setup QA draft';
const command=app.commands.commands['daily-notes'];
try{delete app.commands.commands['daily-notes'];await view.capture(input.value);}finally{app.commands.commands['daily-notes']=command;}
await new Promise(r=>setTimeout(r,500));
if(app.setting.activeTab?.id!=='plugins'||input.value!=='Daily setup QA draft')throw Error('Daily setup navigation or draft preservation failed');
return {tab:app.setting.activeTab.id,retained:true};
