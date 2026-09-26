# 乔木Home 协议 / Qiaomu Home Protocol v1

让任何 Obsidian 插件出现在乔木Home（Obsidian 的起点页）上：继续卡片、快捷新建按钮、统一搜索结果。

It is one of two sibling protocols in the Qiaomu plugin family:

| Protocol | Plugin field | Direction | Purpose |
| --- | --- | --- | --- |
| `qiaomu-context` v1 | `plugin.qiaomuContext` / Agent's `plugin.api` | source → Qiaomu Agent | "What the user is reading right now", for asking AI about it. Spec: `docs/integrations/qiaomu-context-protocol.md` in qiaomu-agent. |
| `qiaomu-home` v1 | `plugin.qiaomuHome` | source → Qiaomu Home | "What the user can resume, create or find", for the start page. This document. |

A plugin can implement either, both, or neither. Neither side ever imports the other.

## Adopt it in five minutes

1. Copy [`protocol/qiaomu-home.ts`](../protocol/qiaomu-home.ts) (TypeScript) or [`protocol/qiaomu-home.js`](../protocol/qiaomu-home.js) (plain JS) into your plugin **unchanged**. The file is MIT licensed.
2. Set a provider on your plugin instance:

```ts
import { homeProvider, notifyHomeChanged } from "./qiaomu-home";

export default class MyPlugin extends Plugin {
  qiaomuHome = homeProvider({
    sections: () => [{
      id: "continue",
      title: "继续",
      items: this.recent().map((doc) => ({
        id: doc.id, title: doc.title, subtitle: doc.source, progress: doc.progress,
        open: () => this.openDoc(doc),
      })),
      empty: "还没有内容",
      more: { id: "open", label: "打开", icon: "arrow-up-right", run: () => this.activateView() },
    }],
    actions: () => [{ id: "new", label: "新建", icon: "plus", run: () => this.create() }],
    search: (query, limit) => this.find(query).slice(0, limit).map(toHomeItem),
  });
}
```

3. Call `notifyHomeChanged(this.app, this.manifest.id)` whenever something Home shows changes (progress saved, unread count, playback state). Home coalesces bursts, so calling it from a save path is fine.

That's all. If Home is not installed nothing happens; if your plugin is not installed Home simply has one card fewer.

## Contract

**Discovery.** Home reads `app.plugins.plugins[id].qiaomuHome` at the moment it renders and checks `protocol === "qiaomu-home"`, `version === 1` and that `sections` is a function. It never caches providers, so enabling, disabling or reloading a plugin is picked up on the next render.

**`sections()`** — required. Returns `HomeSection[]` synchronously or as a promise.
- Local state only: no network requests, no file writes, no opening views. It is called whenever a Home page renders or is notified.
- Home waits at most 1.5 s, then shows the page without you; a throw or timeout shows a small "unavailable" card for your plugin only.
- Home shows at most `MAX_SECTION_ITEMS` (6) items per section. Sections with no items and no `empty` text are hidden.

**`actions()`** — optional. `HomeAction[]` added to the quick-create row under the search box, keyed as `<pluginId>:<action.id>`. Users can hide and reorder them in Home settings, so keep `id` stable.

**`search(query, limit)`** — optional. Your own local data only, at most `limit` items, within 1.5 s. Results appear in a group named after your plugin, below the vault notes.

**User gestures.** `open()` and `run()` are only called from a click or Enter on Home. They may open views, start playback or show a file picker. Items should *resume* — open the book at the saved page, the article in the reader, the conversation where it was.

**Data shapes.** Home validates everything and drops malformed parts rather than failing the page:
- `image` must be `https:`, `app:`, `capacitor:` or `data:image/`; anything else falls back to `icon`.
- `progress` is clamped to 0–1. `actions` on an item: at most two, shown as icon buttons with the label as the accessible name.
- `icon` is any Lucide icon name bundled with Obsidian.
- Text is shown as plain text, never HTML.

**Localization.** Providers return labels in the user's language; Home does not translate them.

**Versioning.** v1 may gain optional fields and methods. Check before using, ignore unknown ones. Only a breaking change raises the version, and a version mismatch reads as "absent".

## What Home itself does

- Opens on startup and replaces Obsidian's empty new tab (both switchable). It claims an empty tab 40 ms after the layout changes and re-checks it is still empty, so plugins opening their own view in a new tab are never overridden.
- Search: vault notes (name, alias, path; recent files ranked higher), provider results, then *create note*, *ask Qiaomu Agent* (`⌘↵`) and *full-text search*.
- Wallpaper: built-in Unsplash gallery (no key), Unsplash search with the user's own Access Key (stored in Obsidian SecretStorage), a vault image, or none. The current photo is cached in the plugin folder for instant, offline starts, and always credited.
- Recommends Qiaomu plugins that are not installed (opens their community-store page; Home never installs anything) and offers "enable" for installed-but-disabled ones. Enabled Qiaomu plugins without the protocol get an "open" card.

## Other ways to integrate

- Open Home from your plugin: run the command `qiaomu-home:open`.
- Ask Qiaomu Agent a question without attaching context (Qiaomu Context Protocol, optional v1 method): `app.plugins.plugins["qiaomu-agent"].api.compose?.({ prompt, submit })`. Pass `submit: true` only when the user already pressed send in your UI.

## Reference implementations

| Plugin | File | Shows |
| --- | --- | --- |
| Qiaomu Reader | `src/home.js` | Books in progress with covers and progress; "add a book"; title search |
| Qiaomu RSS | `src/home.ts` | Newest unread articles with count; "add feed"; title search over local and saved articles |
| Qiaomu Radio | `plugin-src/home.ts` | Live station with play/pause, recent stations; station search |
| Qiaomu Agent | `src/integrations/home.ts` | Recent conversations; "new conversation"; title search |
