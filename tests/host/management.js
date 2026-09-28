// Run with qiaomu-obsidian-dev/scripts/host_eval.py in a QA vault only.
if (!app.vault.getName().includes('qa')) throw new Error('QA vault required');
let plugin = app.plugins.plugins['qiaomu-home'];
const original = structuredClone(plugin.settings);
const nativeMenus = app.vault.getConfig('nativeMenus');
const results = [];
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
const assert = (condition, message) => { if (!condition) throw new Error(message); results.push(message); };
const clickMenu = async text => {
  const entry = [...document.querySelectorAll('.menu-item')].find(el => el.querySelector('.menu-item-title')?.textContent === text);
  if (!entry) throw new Error(`Missing menu: ${text}; ${document.querySelector(".menu")?.textContent}`);
  entry.click(); await pause();
};
const input = (el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); };
const closeMenus = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
try {
  closeMenus();
  document.querySelectorAll('.modal-header-button:has(.lucide-x)').forEach(e=>e.click());
  app.vault.setConfig('nativeMenus', false);
  const page = plugin.settings.pages.find(p => p.id === plugin.settings.homePageId);
  plugin.settings.activePageId = page.id;
  const groupId = 'management-qa';
  page.shortcutGroups.push({ id: groupId, name: 'Management QA', items: [
    { id: 'qa-url', name: 'Before', kind: 'url', target: 'https://example.com', icon: 'globe' },
    { id: 'qa-daily', name: 'Daily QA', kind: 'daily', target: 'today', icon: 'calendar' },
  ] });
  const paths = Array.from({ length: 10 }, (_, i) => `Management-QA-missing-${i}.md`);
  page.moduleOptions[`shortcut:${groupId}`] = { visible: true, limit: 3 };
  page.moduleOptions['working-set'] = { visible: true, limit: 3, paths };
  page.moduleOptions.recent = { visible: true, limit: 3 };
  const note = app.vault.getMarkdownFiles()[0];
  if (!note) throw new Error('QA fixture requires one Markdown note');
  plugin.settings.recentPinned = [note.path];
  page.moduleOrder = [`shortcut:${groupId}`, 'working-set', 'recent'];
  await plugin.saveSettings(); await plugin.openHome(); await pause();
  const root = () => app.workspace.getMostRecentLeaf().view.contentEl;
  const cell = id => root().querySelector(`[data-shortcut="${id}"]`);
  assert(!root().classList.contains('qh-editing'), 'Normal mode, no layout editing required');
  const more = cell('qa-url').querySelector('.qh-shortcut-more');
  assert(!!more, 'Shortcut options present in normal mode');
  more.focus();
  assert(getComputedStyle(more).opacity === '1', 'Keyboard focus reveals shortcut options');
  more.click(); await clickMenu('编辑');
  const modal = document.querySelector('.qh-shortcut-modal');
  assert(!!modal, 'Edit opens the shortcut editor');
  const settingInput = name => [...modal.querySelectorAll('.setting-item')].find(el => el.querySelector('.setting-item-name')?.textContent === name)?.querySelector('input');
  input(settingInput('显示名称'), 'After'); input(settingInput('网址'), 'https://example.org/edited');
  [...modal.querySelectorAll('button')].find(el => el.textContent === '保存').click(); await pause();
  let stored = await plugin.loadData();
  let item = stored.pages.find(p => p.id === page.id).shortcutGroups.find(g => g.id === groupId).items[0];
  assert(item.name === 'After' && item.target === 'https://example.org/edited', 'Edited label and URL persisted');
  cell('qa-daily').querySelector('.qh-shortcut-more').click(); await clickMenu('编辑');
  const dailyModal = document.querySelector('.qh-shortcut-modal');
  input([...dailyModal.querySelectorAll('.setting-item')].find(el => el.querySelector('.setting-item-name')?.textContent === '显示名称').querySelector('input'), 'Renamed daily');
  [...dailyModal.querySelectorAll('button')].find(el => el.textContent === '保存').click(); await pause();
  assert(cell('qa-daily').textContent.includes('Renamed daily'), 'Default daily shortcut can be renamed');
  cell('qa-url').querySelector('.qh-shortcut-more').click(); await clickMenu('移除入口');
  assert(!cell('qa-url'), 'Remove shortcut updates the card');
  const card = () => root().querySelector('[data-module="working-set"]');
  assert(card().querySelectorAll('.qh-working-row:not([hidden])').length === 8, 'Working set starts with eight rows');
  card().querySelector('.qh-working-toggle').click();
  assert(card().querySelectorAll('.qh-working-row:not([hidden])').length === 10, 'Overflow notes can be expanded');
  card().querySelectorAll('.qh-working-row')[9].querySelector('button').click(); await pause();
  stored = await plugin.loadData();
  assert(!stored.pages.find(p => p.id === page.id).moduleOptions['working-set'].paths.includes(paths[9]), 'Tenth missing note can be removed and persists');
  const recent = root().querySelector('[data-module="recent"] .qh-item-menu');
  assert(!!recent, 'Recent note options accessible without right-click');
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  recent.dispatchEvent(event);
  assert(!event.defaultPrevented, 'Menu keyboard event does not invoke the parent note');
  recent.click(); await clickMenu('取消置顶');
  assert(!(await plugin.loadData()).recentPinned.includes(note.path), 'Recent note unpin persists');
  root().querySelector(`[data-module="shortcut:${groupId}"] .qh-module-menu`).click(); await clickMenu('管理入口');
  assert(!!root().querySelector('.qh-shortcut-grip'), 'Group menu exposes shortcut management');
  assert(root().querySelectorAll(`[data-module="shortcut:${groupId}"] .qh-shortcut-more`).length === 1, 'Layout editing does not duplicate item options');
  await app.plugins.disablePlugin('qiaomu-home'); await app.plugins.enablePlugin('qiaomu-home');
  plugin = app.plugins.plugins['qiaomu-home']; await plugin.openHome(); await pause();
  const reloaded = plugin.settings.pages.find(p => p.id === page.id).shortcutGroups.find(g => g.id === groupId);
  assert(reloaded.items.length === 1 && reloaded.items[0].name === 'Renamed daily', 'Shortcut edits and deletion survive plugin reload');
  return { version: plugin.manifest.version, checks: results };
} finally {
  closeMenus();
  document.querySelector('.modal-header-button:has(.lucide-x)')?.click();
  app.vault.setConfig('nativeMenus', nativeMenus);
  plugin.settings = original;
  await plugin.saveSettings();
}
