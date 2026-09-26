import { getLanguage } from "obsidian";

const zh = {
  "brand": "乔木Home",
  "view.title": "主页",
  "cmd.open": "打开主页",
  "cmd.focusSearch": "打开主页并搜索",
  "cmd.nextWallpaper": "更换主页壁纸",
  "ribbon.open": "打开乔木Home",
  "greeting.night": "夜深了",
  "greeting.morning": "早上好",
  "greeting.noon": "中午好",
  "greeting.afternoon": "下午好",
  "greeting.evening": "晚上好",
  "search.placeholder": "搜索笔记、文章、书与电台…",
  "search.label": "搜索",
  "search.clear": "清除搜索",
  "search.notes": "笔记",
  "search.fullText": "在全局搜索中查找「{q}」",
  "search.ask": "问乔木 Agent：{q}",
  "search.create": "新建笔记「{q}」",
  "search.none": "没有匹配的笔记",
  "search.hint.ask": "⌘↵ 问 Agent",
  "new.note": "新笔记",
  "new.today": "今日",
  "new.more": "更多新建方式",
  "menu.customize": "自定义此菜单…",
  "settings.open": "主页设置",
  "wallpaper.view": "在 Unsplash 查看这张照片",
  "wallpaper.curated": "Unsplash 精选",
  "wallpaper.unsplash": "Unsplash 搜索",
  "wallpaper.local": "库中的图片",
  "wallpaper.none": "不使用壁纸",
  "wallpaper.settings": "壁纸设置…",
  "new.daily": "今日日记",
  "new.canvas": "白板",
  "new.base": "数据库",
  "new.folder": "文件夹",
  "new.import": "导入文件",
  "new.untitled": "未命名",
  "section.recent": "最近笔记",
  "section.recent.empty": "打开过的笔记会出现在这里",
  "section.recommend": "乔木插件",
  "recommend.install": "安装",
  "recommend.enable": "启用",
  "recommend.hide": "不再显示",
  "recommend.installed": "已安装，未启用",
  "legacy.open": "打开",
  "legacy.update": "更新到最新版即可在这里显示内容",
  "wallpaper.next": "换一张壁纸",
  "wallpaper.credit": "{name} / Unsplash",
  "error.source": "{name} 暂时无法显示",
  "error.create": "无法创建：{message}",
  "error.command": "这个命令当前不可用",
  "error.import": "导入失败：{message}",
  "notice.imported": "已导入 {n} 个文件",
  "time.justNow": "刚刚",
  "time.minutes": "{n} 分钟前",
  "time.hours": "{n} 小时前",
  "time.days": "{n} 天前",
} as const;

type Key = keyof typeof zh;

const en: Record<Key, string> = {
  "brand": "Qiaomu Home",
  "view.title": "Home",
  "cmd.open": "Open home",
  "cmd.focusSearch": "Open home and search",
  "cmd.nextWallpaper": "Change home wallpaper",
  "ribbon.open": "Open Qiaomu Home",
  "greeting.night": "Good night",
  "greeting.morning": "Good morning",
  "greeting.noon": "Good afternoon",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",
  "search.placeholder": "Search notes, articles, books and stations…",
  "search.label": "Search",
  "search.clear": "Clear search",
  "search.notes": "Notes",
  "search.fullText": "Search “{q}” in all files",
  "search.ask": "Ask Qiaomu Agent: {q}",
  "search.create": "Create note “{q}”",
  "search.none": "No matching notes",
  "search.hint.ask": "⌘↵ ask Agent",
  "new.note": "New note",
  "new.today": "Today",
  "new.more": "More ways to create",
  "menu.customize": "Customize this menu…",
  "settings.open": "Home settings",
  "wallpaper.view": "View this photo on Unsplash",
  "wallpaper.curated": "Unsplash picks",
  "wallpaper.unsplash": "Unsplash search",
  "wallpaper.local": "Image from vault",
  "wallpaper.none": "No wallpaper",
  "wallpaper.settings": "Wallpaper settings…",
  "new.daily": "Today",
  "new.canvas": "Canvas",
  "new.base": "Base",
  "new.folder": "Folder",
  "new.import": "Import",
  "new.untitled": "Untitled",
  "section.recent": "Recent notes",
  "section.recent.empty": "Notes you open will appear here",
  "section.recommend": "Qiaomu plugins",
  "recommend.install": "Install",
  "recommend.enable": "Enable",
  "recommend.hide": "Hide",
  "recommend.installed": "Installed, not enabled",
  "legacy.open": "Open",
  "legacy.update": "Update to the latest version to see content here",
  "wallpaper.next": "Next wallpaper",
  "wallpaper.credit": "{name} / Unsplash",
  "error.source": "{name} is unavailable right now",
  "error.create": "Could not create: {message}",
  "error.command": "This command is not available right now",
  "error.import": "Import failed: {message}",
  "notice.imported": "Imported {n} files",
  "time.justNow": "just now",
  "time.minutes": "{n} min ago",
  "time.hours": "{n} h ago",
  "time.days": "{n} d ago",
};

export function isChinese(): boolean {
  try { return getLanguage().toLowerCase().startsWith("zh"); }
  catch { return true; }
}

export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const template = isChinese() ? zh[key] : en[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export function greeting(hour: number): string {
  if (hour < 5) return t("greeting.night");
  if (hour < 11) return t("greeting.morning");
  if (hour < 13) return t("greeting.noon");
  if (hour < 18) return t("greeting.afternoon");
  return t("greeting.evening");
}

export function relativeTime(then: number, now = Date.now()): string {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60) return t("time.minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hours", { n: hours });
  return t("time.days", { n: Math.floor(hours / 24) });
}
