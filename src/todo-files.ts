import { MarkdownView, type App, type TFile } from "obsidian";
export function editorFor(app: App, file: TFile) {
  return app.workspace.getLeavesOfType('markdown').map(l => l.view).find((v): v is MarkdownView => v instanceof MarkdownView && v.file === file)?.editor;
}
export async function update(app: App, file: TFile, transform: (text: string) => string): Promise<void> {
  const editor = editorFor(app, file);
  if (editor) {
    const before = editor.getValue(), after = transform(before);
    let start = 0;
    while (start < before.length && before[start] === after[start]) start++;
    let end = before.length, tail = after.length;
    while (end > start && tail > start && before[end - 1] === after[tail - 1]) { end--; tail--; }
    editor.replaceRange(after.slice(start, tail), editor.offsetToPos(start), editor.offsetToPos(end));
  } else await app.vault.process(file, transform);
}
