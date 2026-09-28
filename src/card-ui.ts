import { Notice, setIcon } from "obsidian";
import { isComposingKey } from "./input-ui";

/** A quiet text action with an optional leading icon; `primary` gives it a filled look for the card's main action. */
export function cardAction(parent: HTMLElement, text: string, run: () => void, icon?: string, primary = false): HTMLButtonElement {
  const button = parent.createEl("button", { cls: `qh-native-open${primary ? " is-primary" : ""}` });
  if (icon) setIcon(button.createSpan({ cls: "qh-action-icon" }), icon);
  button.createSpan({ text });
  button.addEventListener("click", run);
  return button;
}

export interface FieldRow { input: HTMLInputElement; submit: HTMLButtonElement; row: HTMLElement }
/** Input with an inline submit button, the same pattern as the Todo card. Enter submits unless an IME is composing. */
export function fieldRow(parent: HTMLElement, options: { placeholder: string; label: string; icon: string; action: string; onSubmit: () => void; type?: string }): FieldRow {
  const row = parent.createDiv({ cls: "qh-field-row" });
  const input = row.createEl("input", { cls: "qh-discovery-input", type: options.type ?? "text", placeholder: options.placeholder });
  input.id = `qh-field-${crypto.randomUUID()}`;
  row.createEl("label", { cls: "qh-sr-only", text: options.label, attr: { for: input.id } });
  const submit = row.createEl("button", { cls: "qh-field-submit" });
  setIcon(submit, options.icon);
  submit.createSpan({ cls: "qh-sr-only", text: options.action });
  submit.addEventListener("click", () => options.onSubmit());
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !isComposingKey(event) && !submit.disabled) { event.preventDefault(); options.onSubmit(); }
  });
  return { input, submit, row };
}

/** A notice with an Undo button, for actions that change a note from Home (complete, delete, move). */
export function undoNotice(message: string, undo: () => Promise<unknown>, labels: { undo: string; failed: string }): void {
  let notice: Notice | null = null;
  const fragment = createFragment((f) => {
    f.createSpan({ text: message });
    const button = f.createEl("button", { cls: "qh-notice-undo", text: labels.undo });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      notice?.hide();
      void undo().catch(() => new Notice(labels.failed));
    }, { once: true });
  });
  notice = new Notice(fragment, 6000);
}
