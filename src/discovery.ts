import { L } from "./i18n";
/** Approved public search destinations. Home only opens their search pages; it never scrapes or downloads content. */
export interface DiscoverySite {
  id: string;
  zh: string;
  en: string;
  icon: string;
  home: string;
  search?: (query: string) => string;
  /** Multi-search only: not selected until the user turns it on. */
  off?: true;
}

/** Sites a card uses when the user has not chosen any yet. */
export function defaultSites(sites: DiscoverySite[]): string[] {
  return sites.filter(site => !site.off).map(site => site.id);
}

export type DiscoveryModuleId = "multi-search" | "book-finder" | "watch-finder" | "music-finder" | "ai-learning" | "paper-finder" | "word-finder" | "translate" | "dev-inbox";

/** Chinese text goes to English; everything else to Chinese. */
export function translateTarget(text: string): "zh" | "en" {
  return /[\u3400-\u9fff]/.test(text) ? "en" : "zh";
}

export const DISCOVERY_MODULES: Record<DiscoveryModuleId, {
  zh: string; en: string; icon: string; descriptionZh: string; descriptionEn: string; sites: DiscoverySite[];
}> = {
  "multi-search": {
    zh: "多站搜索", en: "Search across sites", icon: "search", descriptionZh: "一次输入，在选定的网站分别搜索。", descriptionEn: "Search selected websites with one query.",
    sites: [
      { id: "google", zh: "Google", en: "Google", icon: "globe", home: "https://www.google.com/", search: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
      { id: "bing", zh: "Bing", en: "Bing", icon: "globe", home: "https://www.bing.com/", search: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
      { id: "duckduckgo", zh: "DuckDuckGo", en: "DuckDuckGo", icon: "globe", home: "https://duckduckgo.com/", search: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
      { id: "wikipedia", zh: "维基百科", en: "Wikipedia", icon: "book-open", home: "https://www.wikipedia.org/", search: q => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` },
      { id: "brave", zh: "Brave", en: "Brave", icon: "shield", home: "https://search.brave.com/", off: true, search: q => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
      { id: "baidu", zh: "百度", en: "Baidu", icon: "globe", home: "https://www.baidu.com/", off: true, search: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
    ],
  },
  "book-finder": {
    zh: "找电子书", en: "Find books", icon: "book-open", descriptionZh: "找书目与可合法阅读、下载的公版书。", descriptionEn: "Find books and public-domain editions.",
    sites: [
      { id: "openlibrary", zh: "Open Library", en: "Open Library", icon: "library", home: "https://openlibrary.org/", search: q => `https://openlibrary.org/search?q=${encodeURIComponent(q)}` },
      { id: "gutenberg", zh: "古腾堡计划", en: "Project Gutenberg", icon: "book-open", home: "https://www.gutenberg.org/", search: q => `https://www.gutenberg.org/ebooks/?query=${encodeURIComponent(q)}` },
      { id: "douban-book", zh: "豆瓣读书", en: "Douban Books", icon: "book-marked", home: "https://book.douban.com/", search: q => `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(q)}` },
      { id: "google-books", zh: "Google 图书", en: "Google Books", icon: "book", home: "https://books.google.com/", search: q => `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(q)}` },
    ],
  },
  "watch-finder": {
    zh: "找视频与电影", en: "Find video and film", icon: "clapperboard", descriptionZh: "搜索 YouTube 视频和电影资料；观看交给来源网站。", descriptionEn: "Search YouTube and film catalogs; watch at the source.",
    sites: [
      { id: "youtube", zh: "YouTube", en: "YouTube", icon: "video", home: "https://www.youtube.com/", search: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
      { id: "bilibili", zh: "哔哩哔哩", en: "Bilibili", icon: "video", home: "https://www.bilibili.com/", search: q => `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}` },
      { id: "imdb", zh: "IMDb", en: "IMDb", icon: "clapperboard", home: "https://www.imdb.com/", search: q => `https://www.imdb.com/find/?q=${encodeURIComponent(q)}` },
      { id: "douban-movie", zh: "豆瓣电影", en: "Douban Movies", icon: "film", home: "https://movie.douban.com/", search: q => `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(q)}` },
      { id: "justwatch", zh: "JustWatch 观看渠道", en: "JustWatch", icon: "tv", home: "https://www.justwatch.com/", search: q => `https://www.justwatch.com/us/search?q=${encodeURIComponent(q)}` },
    ],
  },
  "music-finder": {
    zh: "Spotify 搜索", en: "Search Spotify", icon: "music", descriptionZh: "找歌曲和播客，交给 Spotify 播放。", descriptionEn: "Find music and podcasts, then play them in Spotify.",
    sites: [
      { id: "spotify", zh: "Spotify", en: "Spotify", icon: "music", home: "https://open.spotify.com/", search: q => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    ],
  },
  "ai-learning": {
    zh: "学 AI", en: "Learn AI", icon: "graduation-cap", descriptionZh: "打开可信的 AI 学习资料，进度保留在原网站。", descriptionEn: "Open trusted AI lessons; progress stays at the source.",
    sites: [
      { id: "openai-academy", zh: "OpenAI Academy", en: "OpenAI Academy", icon: "graduation-cap", home: "https://academy.openai.com/" },
      { id: "hf-learn", zh: "Hugging Face Learn", en: "Hugging Face Learn", icon: "book-open", home: "https://huggingface.co/learn" },
      { id: "deeplearning-ai", zh: "DeepLearning.AI 短课", en: "DeepLearning.AI short courses", icon: "graduation-cap", home: "https://www.deeplearning.ai/short-courses/" },
      { id: "fast-ai", zh: "fast.ai 实战课", en: "fast.ai course", icon: "book-open", home: "https://course.fast.ai/" },
    ],
  },
  "paper-finder": {
    zh: "找论文", en: "Find papers", icon: "file-search", descriptionZh: "用标题或关键词检索论文，阅读留在来源网站。", descriptionEn: "Find research papers by title or keyword.",
    sites: [
      { id: "arxiv", zh: "arXiv", en: "arXiv", icon: "file-text", home: "https://arxiv.org/", search: q => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all` },
      { id: "crossref", zh: "Crossref", en: "Crossref", icon: "book-open", home: "https://search.crossref.org/", search: q => `https://search.crossref.org/?q=${encodeURIComponent(q)}` },
      { id: "semantic-scholar", zh: "Semantic Scholar", en: "Semantic Scholar", icon: "sparkles", home: "https://www.semanticscholar.org/", search: q => `https://www.semanticscholar.org/search?q=${encodeURIComponent(q)}` },
      { id: "google-scholar", zh: "Google 学术", en: "Google Scholar", icon: "graduation-cap", home: "https://scholar.google.com/", search: q => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}` },
    ],
  },
  "word-finder": {
    zh: "查词", en: "Look up a word", icon: "book-a", descriptionZh: "一词查询多个词典，结果在来源网站查看。", descriptionEn: "Look up a word in trusted dictionaries.",
    sites: [
      { id: "cambridge", zh: "剑桥词典", en: "Cambridge Dictionary", icon: "book-open", home: "https://dictionary.cambridge.org/", search: q => `https://dictionary.cambridge.org/search/english/direct/?q=${encodeURIComponent(q)}` },
      { id: "wiktionary", zh: "维基词典", en: "Wiktionary", icon: "book-open", home: "https://en.wiktionary.org/", search: q => `https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(q)}` },
      { id: "youdao", zh: "有道词典", en: "Youdao", icon: "languages", home: "https://dict.youdao.com/", search: q => `https://dict.youdao.com/result?word=${encodeURIComponent(q)}&lang=en` },
      { id: "merriam-webster", zh: "韦氏词典", en: "Merriam-Webster", icon: "book-a", home: "https://www.merriam-webster.com/", search: q => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(q)}` },
    ],
  },
  "translate": {
    zh: "翻译", en: "Translate", icon: "languages", descriptionZh: "中文译成英文，其他语言译成中文，在翻译网站查看结果。", descriptionEn: "Chinese to English, anything else to Chinese, at a translation site.",
    sites: [
      { id: "google-translate", zh: "Google 翻译", en: "Google Translate", icon: "languages", home: "https://translate.google.com/", search: q => `https://translate.google.com/?sl=auto&tl=${translateTarget(q) === "zh" ? "zh-CN" : "en"}&text=${encodeURIComponent(q)}&op=translate` },
      { id: "deepl", zh: "DeepL", en: "DeepL", icon: "languages", home: "https://www.deepl.com/translator", search: q => `https://www.deepl.com/translator#auto/${translateTarget(q)}/${encodeURIComponent(q).replace(/%2F/gi, "%5C%2F")}` },
      { id: "bing-translate", zh: "必应翻译", en: "Bing Translator", icon: "languages", home: "https://www.bing.com/translator", search: q => `https://www.bing.com/translator?from=auto-detect&to=${translateTarget(q) === "zh" ? "zh-Hans" : "en"}&text=${encodeURIComponent(q)}` },
    ],
  },
  "dev-inbox": {
    zh: "GitHub 待办", en: "GitHub inbox", icon: "git-pull-request", descriptionZh: "打开待你审阅的 PR、分配给你的 Issue 和通知；登录状态留在浏览器。", descriptionEn: "Open review requests, assigned issues and notifications; sign-in stays in your browser.",
    sites: [
      { id: "github-search", zh: "搜索仓库", en: "Search repositories", icon: "search", home: "https://github.com/search", search: q => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories` },
      { id: "github-reviews", zh: "待我审阅", en: "Review requests", icon: "git-pull-request", home: "https://github.com/pulls/review-requested" },
      { id: "github-pulls", zh: "我的 PR", en: "My pull requests", icon: "git-merge", home: "https://github.com/pulls" },
      { id: "github-issues", zh: "分配给我", en: "Assigned issues", icon: "circle-dot", home: "https://github.com/issues/assigned" },
      { id: "github-notifications", zh: "通知", en: "Notifications", icon: "bell", home: "https://github.com/notifications" },
    ],
  },
};

export function discoveryUrl(site: DiscoverySite, query: string): string {
  return query.trim() && site.search ? site.search(query.trim().slice(0, 300)) : site.home;
}

export interface SearchTemplate { name: string; url: string }
export function parseSearchTemplates(input: string): SearchTemplate[] {
  return input.split(/\r?\n/).filter(line => line.trim()).slice(0, 8).map((line, index) => {
    const separator = line.indexOf("|");
    const name = line.slice(0, separator).trim(), url = line.slice(separator + 1).trim();
    if (separator < 1 || !name || !url.includes("{query}")) throw new Error(L("第 {line} 行需要：名称 | https://example.com/?q={query}", "Line {line} needs: Name | https://example.com/?q={query}", { line: index + 1 }));
    const parsed = new URL(url.replaceAll("{query}", "test"));
    if (parsed.origin !== new URL(url.replaceAll("{query}", "other")).origin) throw new Error(L("第 {line} 行的 {query} 只能放在路径或查询参数中", "Line {line}: {query} can only appear in the path or query string", { line: index + 1 }));
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(L("第 {line} 行的网址无效", "Line {line}: invalid URL", { line: index + 1 }));
    return { name: name.slice(0, 60), url };
  });
}
export function customSearchSites(templates: SearchTemplate[]): DiscoverySite[] {
  return templates.map(template => ({ id: `custom:${template.url}`, zh: template.name, en: template.name, icon: "globe", home: new URL(template.url.replaceAll("{query}", "")).origin, search: query => template.url.replaceAll("{query}", encodeURIComponent(query)) }));
}
