# 乔木 Home 社区组件目录 / Community extensions

`extensions.json` lists Obsidian plugins that implement the [Qiaomu Home protocol](../docs/qiaomu-home-protocol.md). Qiaomu Home reads this file from GitHub **only when a user opens the Community category** in Add cards, caches it for an hour, and never installs anything by itself: it opens the plugin's page in Obsidian's community browser, or its GitHub repository.

## 提交 / Submit

Open a [community extension submission](https://github.com/joeseesun/qiaomu-home/issues/new?template=submit-extension.yml). A maintainer reviews the plugin against [the checklist](../docs/build-an-extension.md#审核标准) and adds an entry here.

## 字段 / Fields

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | The plugin's `manifest.json` id: lowercase letters, digits and hyphens. |
| `name` | yes | `{ "zh": "", "en": "" }`, up to 60 characters each. |
| `description` | yes | `{ "zh": "", "en": "" }`, up to 200 characters; what the card shows and does. |
| `author` | no | Display name. |
| `repo` | yes | `https://github.com/<owner>/<repo>`. |
| `icon` | no | A Lucide icon name bundled with Obsidian; defaults to `puzzle`. |
| `store` | yes | `true` when the plugin is in Obsidian's official community store, so Home can open its install page. |

Malformed entries are skipped by Home rather than breaking the list; `tests/community.test.ts` validates this file on every change.
