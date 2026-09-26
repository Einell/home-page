import { Modal, Setting, type App } from "obsidian";
import { t } from "./i18n";

export class NewPageModal extends Modal {
  constructor(app: App, private onCreate: (name: string) => Promise<void>) { super(app); }
  onOpen(): void {
    this.setTitle(t("pages.add"));
    const form = this.contentEl.createEl("form");
    let value = "";
    const row = new Setting(form).setName(t("pages.name"));
    row.addText((input) => {
      input.setPlaceholder(t("pages.example")).onChange((name) => { value = name; });
      input.inputEl.maxLength = 80;
      input.inputEl.required = true;
      input.inputEl.focus();
    });
    const button = form.createEl("button", { cls: "mod-cta", text: t("pages.add"), type: "submit" });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!value.trim() || button.disabled) return;
      button.disabled = true;
      void this.onCreate(value.trim()).then(() => this.close()).catch((error: unknown) => {
        button.disabled = false;
        console.error("Qiaomu Home: could not save a page", error);
      });
    });
  }
  onClose(): void { this.contentEl.empty(); }
}

export class DeletePageModal extends Modal {
  constructor(app: App, private name: string, private onDelete: () => Promise<void>) { super(app); }
  onOpen(): void {
    this.setTitle(t("pages.delete"));
    this.contentEl.createEl("p", { text: t("pages.deleteConfirm", { name: this.name }) });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(t("pages.cancel")).onClick(() => this.close()))
      .addButton((button) => button.setButtonText(t("pages.delete")).onClick(async () => {
        button.setDisabled(true);
        await this.onDelete();
        this.close();
      }));
  }
  onClose(): void { this.contentEl.empty(); }
}
