import { Modal, Notice, Setting, setIcon, type App } from "obsidian";
import { guardFormComposition } from "./input-ui";
import { isChinese, t } from "./i18n";
import { PAGE_TEMPLATES, type PageTemplate } from "./settings";

export class NewPageModal extends Modal {
  constructor(app: App, private onCreate: (name: string, template: PageTemplate | null) => Promise<void>, private initialName = "", private heading = t("pages.add"), private withTemplates = false) { super(app); this.modalEl.addClass("qh-ui"); }
  onOpen(): void {
    this.setTitle(this.heading);
    const form = this.contentEl.createEl("form");
    guardFormComposition(form);
    let value = this.initialName;
    let template: PageTemplate | null = null;
    let nameInput: HTMLInputElement | null = null;
    if (this.withTemplates) {
      form.createDiv({ cls: "qh-template-hint", text: isChinese() ? "从模板开始，卡片已经放好；也可以留空自己布置。" : "Start from a template with cards in place, or start blank." });
      const grid = form.createDiv({ cls: "qh-template-grid" });
      grid.setAttr("role", "radiogroup");
      const choices: Array<[PageTemplate | null, string, string, string]> = [[null, isChinese() ? "空白页签" : "Blank page", isChinese() ? "自己添加内容" : "Add cards yourself", "square-dashed"],
        ...(Object.entries(PAGE_TEMPLATES) as Array<[PageTemplate, typeof PAGE_TEMPLATES[PageTemplate]]>).map(([id, item]): [PageTemplate, string, string, string] => [id, isChinese() ? item.zh : item.en, isChinese() ? item.descZh : item.descEn, item.icon])];
      const buttons: HTMLButtonElement[] = [];
      for (const [id, name, desc, icon] of choices) {
        const option = grid.createEl("button", { cls: "qh-template-option" });
        option.type = "button"; // Inside the form, a default submit button would create the page on the first click.
        option.setAttr("role", "radio");
        option.setAttr("aria-checked", String(id === template));
        setIcon(option.createSpan({ cls: "qh-template-icon" }), icon);
        const text = option.createSpan({ cls: "qh-template-text" });
        text.createSpan({ cls: "qh-template-name", text: name });
        text.createSpan({ cls: "qh-template-desc", text: desc });
        buttons.push(option);
        option.addEventListener("click", () => {
          const previousName = template ? (isChinese() ? PAGE_TEMPLATES[template].zh : PAGE_TEMPLATES[template].en) : "";
          template = id;
          buttons.forEach(button => button.setAttr("aria-checked", String(button === option)));
          // Follow the template name unless the user typed their own.
          if (nameInput && (!value.trim() || value === previousName)) { value = id ? name : ""; nameInput.value = value; }
        });
      }
    }
    const row = new Setting(form).setName(t("pages.name"));
    row.addText((input) => {
      nameInput = input.inputEl;
      input.setValue(this.initialName).setPlaceholder(t("pages.example")).onChange((name) => { value = name; });
      input.inputEl.maxLength = 80;
      input.inputEl.required = true;
      input.inputEl.focus();
    });
    const button = form.createEl("button", { cls: "mod-cta", text: this.heading, type: "submit" });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!value.trim() || button.disabled) return;
      button.disabled = true;
      void this.onCreate(value.trim(), template).then(() => this.close()).catch((error: unknown) => {
        button.disabled = false;
        new Notice(t("layout.saveFailed"));
        console.error("Qiaomu Home: could not save a page", error);
      });
    });
  }
  onClose(): void { this.contentEl.empty(); }
}

export class DeletePageModal extends Modal {
  constructor(app: App, private name: string, private onDelete: () => Promise<void>) { super(app); this.modalEl.addClass("qh-ui"); }
  onOpen(): void {
    this.setTitle(t("pages.delete"));
    this.contentEl.createEl("p", { text: t("pages.deleteConfirm", { name: this.name }) });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(t("pages.cancel")).onClick(() => this.close()))
      .addButton((button) => button.setButtonText(t("pages.delete")).onClick(async () => {
        button.setDisabled(true);
        try { await this.onDelete(); this.close(); }
        catch { button.setDisabled(false); new Notice(t("layout.saveFailed")); }
      }));
  }
  onClose(): void { this.contentEl.empty(); }
}
