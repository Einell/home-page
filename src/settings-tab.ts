import { AbstractInputSuggest, FuzzySuggestModal, PluginSettingTab, SecretComponent, Setting, TFile, setIcon, type App } from "obsidian";
import { KNOWN_PLUGINS, listCommands, localized, pluginName } from "./ecosystem";
import { isChinese, t } from "./i18n";
import type QiaomuHomePlugin from "./main";
import { currentPage, moduleOptions, type Headline, type WallpaperRotation, type WallpaperSource } from "./settings";
import { findHomeProviders } from "./protocol/qiaomu-home";
import { collectActions } from "./view";
import { isImagePath } from "./wallpaper/wallpaper";

import { addPage, movePage, removePage } from "./pages";
import { DeletePageModal, NewPageModal } from "./page-dialogs";

const L = (zh: string, en: string): string => isChinese() ? zh : en;

const REPO = "https://github.com/joeseesun/qiaomu-home";

function unsplashError(code: string): string {
  if (!code) return "";
  if (code === "unsplash-no-key") return L("还没有填写 Access Key，暂时使用内置图库。", "No Access Key yet; using the built-in gallery.");
  if (code === "unsplash-auth") return L("Access Key 无效，暂时使用内置图库。", "The Access Key was rejected; using the built-in gallery.");
  if (code === "unsplash-empty") return L("这个关键词没有找到照片，换个词试试。", "No photos match these keywords.");
  return L("暂时连不上 Unsplash，已使用内置图库。", "Unsplash is unreachable; using the built-in gallery.");
}

class ImageSuggest extends AbstractInputSuggest<TFile> {
  constructor(app: App, private input: HTMLInputElement, private onPick: (path: string) => void) { super(app, input); }
  protected getSuggestions(query: string): TFile[] {
    const q = query.toLowerCase();
    return this.app.vault.getFiles().filter((file) => isImagePath(file.path) && file.path.toLowerCase().includes(q)).slice(0, 30);
  }
  renderSuggestion(file: TFile, el: HTMLElement): void { el.setText(file.path); }
  selectSuggestion(file: TFile): void {
    this.input.value = file.path;
    this.onPick(file.path);
    this.close();
  }
}

class CommandPicker extends FuzzySuggestModal<{ id: string; name: string; icon?: string }> {
  constructor(app: App, private onPick: (command: { id: string; name: string; icon?: string }) => void) {
    super(app);
    this.setPlaceholder(L("选择要放到主页的命令", "Pick a command for Home"));
  }
  getItems() { return listCommands(this.app).sort((a, b) => a.name.localeCompare(b.name)); }
  getItemText(item: { name: string }) { return item.name; }
  onChooseItem(item: { id: string; name: string; icon?: string }) { this.onPick(item); }
}

function iconButton(parent: HTMLElement, icon: string, label: string, onClick: () => void, disabled = false): void {
  const button = parent.createEl("button", { cls: "clickable-icon qh-setting-icon" });
  setIcon(button, icon);
  button.createSpan({ cls: "qh-sr-only", text: label });
  button.disabled = disabled;
  button.addEventListener("click", onClick);
}

export class HomeSettingTab extends PluginSettingTab {
  private editingPageId?: string;
  private scrollToPage = false;

  editPage(id?: string): void {
    this.editingPageId = id;
    this.scrollToPage = Boolean(id);
  }
  constructor(app: App, private plugin: QiaomuHomePlugin) { super(app, plugin); }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const wall = settings.wallpaper;
    const save = async (rerender = true) => { await this.plugin.saveSettings({ rerender }); };
    containerEl.empty();
    containerEl.addClass("qh-settings");

    new Setting(containerEl).setName(L("打开方式", "Opening")).setHeading();
    new Setting(containerEl)
      .setName(L("启动时打开主页", "Open on startup"))
      .setDesc(L("每次启动 Obsidian，都从主页开始。", "Start every Obsidian session on Home."))
      .addToggle((toggle) => toggle.setValue(settings.openOnStartup).onChange(async (value) => { settings.openOnStartup = value; await save(false); }));
    new Setting(containerEl)
      .setName(L("新标签页显示主页", "Show Home in new tabs"))
      .setDesc(L("代替 Obsidian 的空白新标签页。", "Replace Obsidian's empty new tab."))
      .addToggle((toggle) => toggle.setValue(settings.replaceNewTab).onChange(async (value) => { settings.replaceNewTab = value; await save(false); }));

    new Setting(containerEl).setName(L("外观", "Appearance")).setHeading();
    new Setting(containerEl)
      .setName(L("顶部显示", "Headline"))
      .addDropdown((dropdown) => dropdown
        .addOptions({ clock: L("时间与问候", "Time and greeting"), brand: L("乔木Home", "Qiaomu Home"), vault: L("仓库名称", "Vault name") })
        .setValue(settings.headline)
        .onChange(async (value) => { settings.headline = value as Headline; await save(); }));
    new Setting(containerEl)
      .setName(L("壁纸", "Wallpaper"))
      .addDropdown((dropdown) => dropdown
        .addOptions({
          curated: L("Unsplash 精选（内置）", "Unsplash picks (built in)"),
          unsplash: L("Unsplash 搜索（需要 Access Key）", "Unsplash search (Access Key)"),
          local: L("库中的图片", "Image from this vault"),
          none: L("不使用壁纸", "No wallpaper"),
        })
        .setValue(wall.source)
        .onChange(async (value) => {
          wall.source = value as WallpaperSource;
          await save(false);
          await this.plugin.wallpaper.prepareForView();
          this.plugin.eachView((view) => void view.renderPhoto());
          this.display();
        }));

    if (wall.source === "unsplash") {
      new Setting(containerEl)
        .setName("Unsplash Access Key")
        .setDesc(createFragment((fragment) => {
          fragment.appendText(L("在 Unsplash 开发者页面免费创建应用后获得。密钥保存在 Obsidian 的密钥库中。", "Create a free app on the Unsplash developer site. The key is kept in Obsidian's secret storage."));
          fragment.createEl("br");
          fragment.createEl("a", { text: "unsplash.com/developers", href: "https://unsplash.com/developers" });
        }))
        .addComponent((el) => new SecretComponent(this.app, el).setValue(wall.unsplashSecret).onChange(async (value) => {
          wall.unsplashSecret = value;
          await save(false);
        }));
      new Setting(containerEl)
        .setName(L("关键词", "Keywords"))
        .setDesc(L("例如：mountain、ocean night、minimal。", "For example: mountain, ocean night, minimal."))
        .addText((text) => text.setValue(wall.query).onChange(async (value) => { wall.query = value; await save(false); }));
      const status = unsplashError(this.plugin.wallpaper.error());
      if (status) containerEl.createDiv({ cls: "setting-item-description qh-setting-status", text: status });
    }

    if (wall.source === "local") {
      new Setting(containerEl)
        .setName(L("图片路径", "Image path"))
        .setDesc(L("输入库中的图片路径，可从建议中选择。", "Type a vault image path or pick a suggestion."))
        .addText((text) => {
          text.setPlaceholder("Attachments/wallpaper.jpg").setValue(wall.localPath);
          const apply = async (path: string) => { wall.localPath = path.trim(); await save(false); this.plugin.eachView((view) => void view.renderPhoto()); };
          new ImageSuggest(this.app, text.inputEl, (path) => void apply(path));
          text.inputEl.addEventListener("blur", () => void apply(text.getValue()));
        });
    }

    if (this.plugin.wallpaper.canRotate()) {
      new Setting(containerEl)
        .setName(L("更换频率", "Change"))
        .addDropdown((dropdown) => dropdown
          .addOptions({ daily: L("每天一张", "Once a day"), open: L("每次打开", "Every time Home opens"), fixed: L("手动更换", "Only when I ask") })
          .setValue(wall.rotation)
          .onChange(async (value) => { wall.rotation = value as WallpaperRotation; await save(false); }));
    }
    if (wall.source !== "none") {
      new Setting(containerEl)
        .setName(L("壁纸暗度", "Dim wallpaper"))
        .setDesc(L("让文字在明亮照片上也清楚。", "Keeps text readable on bright photos."))
        .addSlider((slider) => slider.setLimits(0, 80, 5).setValue(Math.round(wall.dim * 100))
          .onChange(async (value) => {
            wall.dim = value / 100;
            this.plugin.eachView((view) => view.containerEl.style.setProperty("--qh-dim", String(wall.dim)));
            await save(false);
          }));
    }

    new Setting(containerEl).setName(L("主页内容", "Content")).setHeading();
    new Setting(containerEl)
      .setName(L("快速记录保存到", "Quick capture destination"))
      .setDesc(L("在搜索框输入后按 ⇧↵，不离开主页。", "Type in search and press Shift+Enter without leaving Home."))
      .addDropdown((dropdown) => dropdown
        .addOptions({ daily: L("今日日记", "Today's daily note"), inbox: "Inbox" })
        .setValue(settings.captureTarget)
        .onChange(async (value) => { settings.captureTarget = value as "daily" | "inbox"; await save(); this.display(); }));
    if (settings.captureTarget === "inbox") {
      new Setting(containerEl)
        .setName(L("Inbox 笔记路径", "Inbox note path"))
        .setDesc(L("库内 Markdown 路径，例如 Inbox.md 或 Inbox/速记.md。", "Vault Markdown path, for example Inbox.md."))
        .addText((input) => input.setValue(settings.captureInboxPath).onChange(async (value) => {
          settings.captureInboxPath = value.trim(); await save(false);
        }));
    }
    const pageHeading = new Setting(containerEl).setName(L("页签与模块", "Pages and cards")).setHeading();
    new Setting(containerEl).setName(L("启用页签模式", "Enable pages"))
      .setDesc(L("每页独立设置模块和条数；关闭后显示第一个页签。", "Each page has its own cards and item counts. When off, Home shows the first page."))
      .addToggle((toggle) => toggle.setValue(settings.tabsEnabled).onChange(async (value) => {
        settings.tabsEnabled = value; this.editingPageId = undefined; await save(); this.display();
      }));
    const page = currentPage(settings, settings.tabsEnabled ? this.editingPageId : undefined);
    this.editingPageId = page.id;
    if (settings.tabsEnabled) {
      new Setting(containerEl).setName(L("配置页签", "Edit page"))
        .addDropdown((dropdown) => dropdown.addOptions(Object.fromEntries(settings.pages.map((item) => [item.id, item.name || t("pages.default")])))
          .setValue(page.id).onChange((id) => { this.editingPageId = id; this.display(); }))
        .addButton((button) => button.setButtonText(t("pages.add")).onClick(() => {
          new NewPageModal(this.app, async (name) => {
            this.editingPageId = addPage(settings, name).id;
            await save(); this.display();
          }).open();
        }));
      new Setting(containerEl).setName(t("pages.name"))
        .addText((input) => {
          input.setValue(page.name || t("pages.default"));
          input.inputEl.maxLength = 80;
          input.inputEl.addEventListener("change", () => {
            page.name = input.getValue().trim().slice(0, 80);
            void save().then(() => this.display());
          });
        });
      const order = new Setting(containerEl).setName(L("页签顺序", "Page order"));
      const index = settings.pages.indexOf(page);
      iconButton(order.controlEl, "arrow-left", L("前移", "Move earlier"), () => {
        movePage(settings, page.id, -1); void save().then(() => this.display());
      }, index === 0);
      iconButton(order.controlEl, "arrow-right", L("后移", "Move later"), () => {
        movePage(settings, page.id, 1); void save().then(() => this.display());
      }, index === settings.pages.length - 1);
      order.addButton((button) => button.setButtonText(t("pages.delete")).setDisabled(settings.pages.length === 1).onClick(() => {
        new DeletePageModal(this.app, page.name || t("pages.default"), async () => {
          removePage(settings, page.id); this.editingPageId = undefined; await save(); this.display();
        }).open();
      }));
    }
    if (this.scrollToPage) { pageHeading.settingEl.scrollIntoView({ block: "start" }); this.scrollToPage = false; }
    this.renderModuleOption(containerEl, "recent", L("最近笔记", "Recent notes"));
    this.renderModuleOption(containerEl, "bookmarks", L("常用书签", "Bookmarks"));
    const ids = new Set([...KNOWN_PLUGINS.map((plugin) => plugin.id), ...findHomeProviders(this.app).map(([id]) => id)]);
    for (const id of ids) {
      const known = KNOWN_PLUGINS.find((plugin) => plugin.id === id);
      this.renderModuleOption(containerEl, id, known ? localized(known.name) : pluginName(this.app, id));
    }
    new Setting(containerEl)
      .setName(L("推荐乔木插件", "Suggest Qiaomu plugins"))
      .setDesc(settings.hiddenRecommendations.length ? L(`已隐藏 ${settings.hiddenRecommendations.length} 个推荐。`, `${settings.hiddenRecommendations.length} hidden.`) : "")
      .addToggle((toggle) => toggle.setValue(page.showRecommendations).onChange(async (value) => { page.showRecommendations = value; await save(); }))
      .then((setting) => {
        if (!settings.hiddenRecommendations.length) return;
        setting.addButton((button) => button.setButtonText(L("全部恢复", "Show all")).onClick(async () => {
          settings.hiddenRecommendations = [];
          await save();
          this.display();
        }));
      });

    this.renderActions(containerEl);

    new Setting(containerEl).setName(L("关于", "About")).setHeading();
    new Setting(containerEl)
      .setName(`${L("乔木Home", "Qiaomu Home")} ${this.plugin.manifest.version}`)
      .setDesc(createFragment((fragment) => {
        fragment.appendText(L("其他插件可以接入主页：", "Other plugins can join Home: "));
        fragment.createEl("a", { text: L("乔木Home 协议", "Qiaomu Home protocol"), href: `${REPO}/blob/main/docs/qiaomu-home-protocol.md` });
        fragment.appendText(" · ");
        fragment.createEl("a", { text: "GitHub", href: REPO });
      }));
  }

  private renderModuleOption(containerEl: HTMLElement, id: string, name: string): void {
    const settings = this.plugin.settings;
    const page = currentPage(settings, this.editingPageId);
    const current = moduleOptions(settings, id, page.id);
    new Setting(containerEl)
      .setName(name)
      .addToggle((toggle) => toggle.setValue(current.visible).onChange(async (visible) => {
        page.moduleOptions[id] = { ...moduleOptions(settings, id, page.id), visible };
        await this.plugin.saveSettings();
      }))
      .addDropdown((dropdown) => dropdown
        .addOptions(Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
          const n = index + 1;
          return [String(n), L(`${n} 条`, `${n} items`)];
        })))
        .setValue(String(current.limit))
        .onChange(async (value) => {
          page.moduleOptions[id] = { ...moduleOptions(settings, id, page.id), limit: Number(value) };
          await this.plugin.saveSettings();
        }));
  }

  private renderActions(containerEl: HTMLElement): void {
    const settings = this.plugin.settings;
    new Setting(containerEl).setName(L("新建", "Create")).setHeading();
    new Setting(containerEl)
      .setName(L("搜索栏旁显示「今日」", "Show “Today” next to search"))
      .setDesc(L("一键打开今天的日记。需要启用核心插件「日记」。", "Opens today's daily note. Needs the Daily notes core plugin."))
      .addToggle((toggle) => toggle.setValue(settings.showDaily).onChange(async (value) => { settings.showDaily = value; await this.plugin.saveSettings(); }));
    containerEl.createDiv({ cls: "setting-item-description qh-setting-note", text: L("下面是「新笔记」旁 ▾ 菜单里的项目，可排序、隐藏。", "Items in the ▾ menu next to “New note”. Reorder or hide them.") });
    const actions = collectActions(this.app, settings).filter((action) => !(settings.showDaily && action.key === "builtin:daily"));
    const keys = actions.map((action) => action.key);
    const move = async (index: number, delta: number) => {
      const order = [...keys];
      const [item] = order.splice(index, 1);
      order.splice(index + delta, 0, item);
      settings.actions = order;
      await this.plugin.saveSettings();
      this.display();
    };
    actions.forEach((action, index) => {
      const setting = new Setting(containerEl);
      setIcon(setting.nameEl.createSpan({ cls: "qh-setting-action-icon" }), action.icon);
      setting.nameEl.appendText(action.label);
      const controls = setting.controlEl;
      iconButton(controls, "arrow-up", L("上移", "Move up"), () => void move(index, -1), index === 0);
      iconButton(controls, "arrow-down", L("下移", "Move down"), () => void move(index, 1), index === actions.length - 1);
      if (action.key.startsWith("command:")) {
        iconButton(controls, "trash-2", L("移除", "Remove"), () => {
          const id = action.key.slice("command:".length);
          settings.commands = settings.commands.filter((command) => command.id !== id);
          settings.actions = settings.actions.filter((key) => key !== action.key);
          void this.plugin.saveSettings().then(() => this.display());
        });
      }
      setting.addToggle((toggle) => toggle.setValue(!settings.hiddenActions.includes(action.key)).onChange(async (visible) => {
        settings.hiddenActions = visible ? settings.hiddenActions.filter((key) => key !== action.key) : [...settings.hiddenActions, action.key];
        await this.plugin.saveSettings();
      }));
    });
    new Setting(containerEl)
      .setName(L("添加命令", "Add a command"))
      .setDesc(L("把任意 Obsidian 命令放到主页。", "Put any Obsidian command on Home."))
      .addButton((button) => button.setButtonText(L("选择命令", "Choose")).onClick(() => {
        new CommandPicker(this.app, (command) => {
          if (settings.commands.some((item) => item.id === command.id)) return;
          const label = command.name.includes(": ") ? command.name.slice(command.name.indexOf(": ") + 2) : command.name;
          settings.commands = [...settings.commands, { id: command.id, label: label.slice(0, 24), icon: command.icon ?? "terminal-square" }];
          settings.actions = [...keys, `command:${command.id}`];
          void this.plugin.saveSettings().then(() => this.display());
        }).open();
      }));
  }
}
