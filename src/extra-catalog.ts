/** Second wave of built-in cards. `vault` marks cards that must refresh when notes change. */
export const EXTRA_MODULES = {
  "quick-capture": { zh: "快速记录", en: "Quick capture", icon: "pencil-line", description: "一行输入，直接写进收件箱或今日日记。", descriptionEn: "Write one line straight into your Inbox or daily note.", vault: false },
  "weekly-review": { zh: "本周回顾", en: "Weekly review", icon: "calendar-range", description: "打开或创建本周周记，顺手看一眼内容。", descriptionEn: "Open or create this week's note and glance at it.", vault: true },
  "day-progress": { zh: "时间进度", en: "Time progress", icon: "hourglass", description: "今天的工作时段、本周、本月和今年过去了多少。", descriptionEn: "How much of your workday, week, month and year has passed.", vault: false },
  "world-clock": { zh: "世界时钟", en: "World clock", icon: "globe-2", description: "同时看几个城市的当地时间。", descriptionEn: "Local time in a few cities at once.", vault: false },
  "weather": { zh: "天气", en: "Weather", icon: "cloud-sun", description: "一个城市的今日天气与未来两天，来自 Open-Meteo。", descriptionEn: "Today and the next two days for one city, from Open-Meteo.", vault: false },
  "daily-quote": { zh: "每日一句", en: "Daily quote", icon: "quote", description: "每天一句话，可以来自你自己的摘录笔记。", descriptionEn: "One line a day, optionally from your own quotes note.", vault: true },
  "flashcards": { zh: "每日一问", en: "Daily question", icon: "layers", description: "从笔记中的「问题 :: 答案」抽一张卡片自测。", descriptionEn: "Quiz yourself with “question :: answer” lines from a note.", vault: true },
  "prompt-snippets": { zh: "常用片段", en: "Snippets", icon: "clipboard-list", description: "把笔记里的标题段落当片段，一键复制或交给 Agent。", descriptionEn: "Copy heading sections from a note, or send them to Agent.", vault: true },
  "video-notes": { zh: "视频笔记", en: "Video notes", icon: "square-play", description: "粘贴 YouTube / B 站链接，生成带时间戳结构的笔记。", descriptionEn: "Paste a YouTube or Bilibili link to start a timestamped note.", vault: false },
  "calendar-next": { zh: "日程", en: "Agenda", icon: "calendar-clock", description: "读取 .ics 日历，显示今天和接下来的安排。", descriptionEn: "Today's and upcoming events from an .ics calendar.", vault: true },
  "ambient-sound": { zh: "专注白噪音", en: "Ambient sound", icon: "audio-lines", description: "本地生成白噪音、粉红噪音或棕噪音，无需联网。", descriptionEn: "White, pink or brown noise generated locally.", vault: false },
  "activity-heatmap": { zh: "笔记活动", en: "Note activity", icon: "layout-grid", description: "近 12 周新建和编辑笔记的分布。", descriptionEn: "Notes created and edited over the last 12 weeks.", vault: true },
} as const;
export type ExtraId = keyof typeof EXTRA_MODULES;
export function isExtra(id: string): id is ExtraId { return Object.hasOwn(EXTRA_MODULES, id); }
