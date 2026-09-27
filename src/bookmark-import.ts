import { Modal, Notice, Setting } from "obsidian";
import type QiaomuHomePlugin from "./main";
import { isChinese, t } from "./i18n";
import { parseBookmarks, decodeBookmarkText } from "./quick-tools";
import { shortcutModuleId, type ShortcutGroup } from "./shortcuts";
const L = (zh: string, en: string) => isChinese() ? zh : en;
export class BookmarkImportModal extends Modal {
  constructor(private plugin: QiaomuHomePlugin, private pageId: string) { super(plugin.app); this.modalEl.addClass("qh-ui"); }
  onOpen(): void {
    this.setTitle(L("导入浏览器书签", "Import browser bookmarks"));
    this.contentEl.createEl("p", { text: L("选择浏览器导出的 HTML 文件，预览后导入为一个快捷方式组。最多导入前 50 个不同的网址。", "Choose an exported HTML bookmark file. Preview and import up to 50 unique websites as a shortcut group.") });
    let bookmarks: Array<{ name: string; url: string }> = [];
    const input = this.contentEl.createEl("input", { type: "file", attr: { accept: ".html,.htm,text/html" } });
    input.id = `qh-bookmarks-${crypto.randomUUID()}`;
    this.contentEl.createEl("label", { cls: "qh-sr-only", text: L("书签 HTML 文件", "Bookmark HTML file"), attr: { for: input.id } });
    const preview = this.contentEl.createDiv({ cls: "qh-bookmark-preview" });
    const footer = new Setting(this.contentEl);
    footer.addButton(button => {
      button.setButtonText(L("导入", "Import")).setDisabled(true).setCta();
      input.addEventListener("change", () => {
        bookmarks = []; button.setDisabled(true); preview.empty();
        const file = input.files?.[0]; if (!file) return;
        if (file.size > 2_000_000) { preview.setText(L("文件需小于 2 MB", "File must be smaller than 2 MB")); return; }
        void file.text().then(text => {
          if (!this.contentEl.isConnected || input.files?.[0] !== file) return;
          bookmarks = parseBookmarks(text, decodeBookmarkText);
          preview.createEl("p", { text: L(`将导入 ${bookmarks.length} 个网址`, `${bookmarks.length} websites to import`) });
          for (const item of bookmarks.slice(0, 8)) preview.createDiv({ text: `${item.name} · ${new URL(item.url).hostname}` });
          button.setDisabled(!bookmarks.length);
        }).catch(error => preview.setText(error instanceof Error ? error.message : L("读取失败", "Could not read bookmarks")));
      });
      button.onClick(async () => {
        const page = this.plugin.settings.pages.find(page => page.id === this.pageId); if (!page || !bookmarks.length) return;
        const group: ShortcutGroup = { id: crypto.randomUUID(), name: L("导入的书签", "Imported bookmarks"), items: bookmarks.map(item => ({ id: crypto.randomUUID(), kind: "url", target: item.url, name: item.name, icon: "globe" })) };
        const key = shortcutModuleId(group.id);
        page.shortcutGroups.push(group); page.moduleOptions[key] = { visible: true, limit: 3 }; page.moduleOrder.push(key); button.setDisabled(true);
        try { await this.plugin.saveSettings(); this.close(); }
        catch { page.shortcutGroups = page.shortcutGroups.filter(item => item !== group); page.moduleOrder = page.moduleOrder.filter(id => id !== key); delete page.moduleOptions[key]; button.setDisabled(false); new Notice(t("layout.saveFailed")); }
      });
    });
  }
  onClose(): void { this.contentEl.empty(); }
}
