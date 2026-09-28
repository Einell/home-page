import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error plain ESM script without type declarations
import { collectStrings } from "../scripts/i18n-strings.mjs";
import { L, LANGUAGES, currentLanguage, dateLocale, greeting, isChinese, languageFromObsidian, setLanguage, t, translate } from "../src/i18n";
import { normalizeSettings } from "../src/settings";
import { carryHeading, todayHeading } from "../src/todo-carry";
import { CARRY_HEADINGS, TODAY_HEADINGS } from "../src/todo-data";

const TRANSLATED = LANGUAGES.map((language) => language.id).filter((id) => id !== "zh" && id !== "en");
const placeholders = (text: string) => (text.match(/\{\{?\w+\}\}?/g) ?? []).sort();

afterEach(() => setLanguage("auto"));

describe("locale files", () => {
  const { strings } = collectStrings() as { strings: string[] };

  it("finds the English source strings", () => {
    expect(strings.length).toBeGreaterThan(900);
    expect(strings).toContain("Search notes, or capture a thought…");
  });

  for (const id of TRANSLATED) {
    it(`${id} covers every string with the same placeholders`, () => {
      const table = JSON.parse(readFileSync(join(process.cwd(), "src", "locales", `${id}.json`), "utf8")) as Record<string, string>;
      // New UI text must be translated before it ships: run `node scripts/i18n-strings.mjs` to list the sources.
      expect(strings.filter((text) => !(text in table))).toEqual([]);
      expect(Object.keys(table).filter((text) => !strings.includes(text))).toEqual([]);
      expect(Object.entries(table).filter(([en, value]) => !value.trim() || placeholders(en).join() !== placeholders(value).join())).toEqual([]);
    });
  }
});

describe("language selection", () => {
  it("maps Obsidian language codes to shipped languages", () => {
    expect(languageFromObsidian("zh")).toBe("zh");
    expect(languageFromObsidian("zh-TW")).toBe("zh");
    expect(languageFromObsidian("ja")).toBe("ja");
    expect(languageFromObsidian("pt-BR")).toBe("pt");
    expect(languageFromObsidian("RU")).toBe("ru");
    expect(languageFromObsidian("it")).toBe("en");
  });

  it("follows Obsidian by default and honours an explicit choice", () => {
    expect(currentLanguage()).toBe("zh"); // the Obsidian mock reports "zh"
    setLanguage("ja");
    expect(currentLanguage()).toBe("ja");
    expect(isChinese()).toBe(false);
    expect(dateLocale()).toBe("ja-JP");
    setLanguage("nonsense" as never);
    expect(currentLanguage()).toBe("zh");
  });

  it("translates inline text, keyed text and placeholders", () => {
    setLanguage("fr");
    expect(L("取消", "Cancel")).toBe("Annuler");
    expect(t("pages.copyName", { name: "Lecture" })).toBe("Copie de Lecture");
    expect(greeting(8)).toBe("Bonjour");
    setLanguage("de");
    expect(L("第 {v} 行", "Line {v}: unknown time zone “{zone}”", { v: 2, zone: "Mars" })).toBe("Zeile 2: unbekannte Zeitzone „Mars“");
    setLanguage("en");
    expect(L("取消", "Cancel")).toBe("Cancel");
    setLanguage("zh");
    expect(L("取消", "Cancel")).toBe("取消");
  });

  it("falls back to English for text that has no translation", () => {
    expect(translate("A string nobody translated", "ko")).toBe("A string nobody translated");
    setLanguage("ru");
    expect(L("动态", "Some plugin title")).toBe("Some plugin title");
  });

  it("keeps placeholders that have no value", () => {
    setLanguage("en");
    expect(L("", "Line {line}: {query} can only appear in the path or query string", { line: 3 })).toBe("Line 3: {query} can only appear in the path or query string");
  });
});

describe("persistence boundaries", () => {
  it("stores the language preference and repairs invalid values", () => {
    expect(normalizeSettings({}).language).toBe("auto");
    expect(normalizeSettings({ language: "es" }).language).toBe("es");
    expect(normalizeSettings({ language: "xx" }).language).toBe("auto");
  });

  it("writes task headings that the parser can read back in every language", () => {
    for (const language of LANGUAGES) {
      setLanguage(language.id);
      expect(TODAY_HEADINGS).toContain(todayHeading());
      expect(CARRY_HEADINGS).toContain(carryHeading());
    }
  });
});
