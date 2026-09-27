import { setIcon } from "obsidian";

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
  input.setAttr("aria-label", options.label);
  const submit = row.createEl("button", { cls: "qh-field-submit" });
  setIcon(submit, options.icon);
  submit.setAttr("aria-label", options.action);
  submit.setAttr("title", options.action);
  submit.addEventListener("click", () => options.onSubmit());
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing && !submit.disabled) { event.preventDefault(); options.onSubmit(); }
  });
  return { input, submit, row };
}
