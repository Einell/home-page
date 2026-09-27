import { DISCOVERY_MODULES } from "./discovery";
import { INTEGRATIONS } from "./integration-catalog";

export type ModuleCategory = "today" | "tasks" | "notes" | "vault" | "web" | "tools" | "links" | "plugins" | "community";

export const MODULE_CATEGORIES: Array<{ id: ModuleCategory; zh: string; en: string; icon: string }> = [
  { id: "today", zh: "今天", en: "Today", icon: "sun" },
  { id: "tasks", zh: "任务与专注", en: "Tasks & focus", icon: "list-checks" },
  { id: "notes", zh: "笔记与回顾", en: "Notes & review", icon: "notebook-pen" },
  { id: "vault", zh: "整理知识库", en: "Vault upkeep", icon: "network" },
  { id: "web", zh: "搜索与学习", en: "Search & learn", icon: "search" },
  { id: "tools", zh: "小工具", en: "Utilities", icon: "wrench" },
  { id: "links", zh: "快捷入口", en: "Shortcuts", icon: "link" },
  { id: "plugins", zh: "插件联动", en: "Integrations", icon: "puzzle" },
  { id: "community", zh: "社区", en: "Community", icon: "users" },
];

const BY_ID: Record<string, ModuleCategory> = {
  "daily-preview": "today", "daily-focus": "today", "daily-timeline": "today", "daily-calendar": "today", "habit-checkin": "today",
  "weekly-review": "today", "quick-capture": "today", "inbox-preview": "today",
  "todo": "tasks", "due-today": "tasks", "overdue": "tasks", "project-next": "tasks", "milestones": "tasks", "goal-progress": "tasks",
  "focus-timer": "tasks", "countdown": "tasks", "calendar-next": "tasks",
  "recent": "notes", "recently-modified": "notes", "review-note": "notes", "note-preview": "notes", "working-set": "notes",
  "template-create": "notes", "saved-search": "notes", "flashcards": "notes", "prompt-snippets": "notes", "video-notes": "notes",
  "tag-cloud": "vault", "orphan-notes": "vault", "broken-links": "vault", "activity-heatmap": "vault",
  "weather": "tools", "world-clock": "tools", "day-progress": "tools", "ambient-sound": "tools", "daily-quote": "tools",
  "new-shortcuts": "links", "import-bookmarks": "links", "beginner-plugins": "links",
};

export function moduleCategory(id: string, sourceId?: string): ModuleCategory {
  if (id.startsWith("community:") || id === "build-extension") return "community";
  if (sourceId) return "plugins";
  if (id.startsWith("shortcut:")) return "links";
  if (Object.hasOwn(DISCOVERY_MODULES, id)) return "web";
  if (Object.hasOwn(INTEGRATIONS, id)) return "plugins";
  return BY_ID[id] ?? "notes";
}
