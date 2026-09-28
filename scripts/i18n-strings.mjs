// Collects every English source string that other languages translate.
// Sources: the English argument of L(), the `en` table in i18n.ts, and catalog fields named `en` / `*En`.
// Usage: node scripts/i18n-strings.mjs [--dynamic]   (prints JSON; --dynamic lists L() calls with non-literal English)
import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const SKIP = new Set(["extension-prompt.ts"]);

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "locales" ? [] : files(path);
    return entry.name.endsWith(".ts") && !SKIP.has(entry.name) ? [path] : [];
  });
}

export function collectStrings() {
  const strings = new Set();
  const dynamic = [];
  const literal = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
  const add = (text) => { if (text.trim() && /[A-Za-z]/.test(text)) strings.add(text); };
  const english = (node, where) => {
    if (literal(node)) add(node.text);
    else if (ts.isParenthesizedExpression(node)) english(node.expression, where);
    else if (ts.isConditionalExpression(node)) { english(node.whenTrue, where); english(node.whenFalse, where); }
    else dynamic.push(`${where}: ${node.getText()}`);
  };
  for (const file of files(SRC)) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const where = (node) => `${file.slice(SRC.length + 1)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "L" && node.arguments.length >= 2) {
        const arg = node.arguments[1];
        if (!ts.isSpreadElement(node.arguments[0])) english(arg, where(arg));
      }
      if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) {
        const name = node.name.text;
        if ((name === "en" || /^[a-z]+En$/.test(name)) && literal(node.initializer)) add(node.initializer.text);
        if ((name === "en" || /^[a-z]+En$/.test(name)) && ts.isArrayLiteralExpression(node.initializer)) node.initializer.elements.forEach((item) => literal(item) && add(item.text));
      }
      // `const en: Record<Key, string> = {...}` in i18n.ts
      if (ts.isVariableDeclaration(node) && node.name.getText() === "en" && node.initializer && ts.isObjectLiteralExpression(node.initializer))
        node.initializer.properties.forEach((property) => ts.isPropertyAssignment(property) && literal(property.initializer) && add(property.initializer.text));
      // Tables tagged /* i18n */ hold rows with a Chinese string followed by its English, e.g. `[codes, "晴", "Clear", icon]`.
      if (ts.isArrayLiteralExpression(node) && /\/\*\s*i18n\s*\*\//.test(source.text.slice(node.getFullStart(), node.getStart()))) {
        node.elements.forEach((row) => {
          if (!ts.isArrayLiteralExpression(row)) return;
          const texts = row.elements.filter(literal);
          const zh = texts.findIndex((item) => /[\u4e00-\u9fff]/.test(item.text));
          if (zh >= 0 && texts[zh + 1]) add(texts[zh + 1].text);
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { strings: [...strings].sort(), dynamic };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { strings, dynamic } = collectStrings();
  console.log(JSON.stringify(process.argv.includes("--dynamic") ? dynamic : strings, null, 2));
}
