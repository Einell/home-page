/** Some IMEs send the confirming Enter with isComposing=false and the legacy 229 code. */
export function isComposingKey(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

/** Native forms must not treat an IME's candidate confirmation as a submit. */
export function guardFormComposition(form: HTMLFormElement): void {
  let composing = false;
  form.addEventListener("compositionstart", () => { composing = true; });
  form.addEventListener("compositionend", () => { composing = false; });
  form.addEventListener("keydown", event => {
    if (event.key === "Enter" && (composing || isComposingKey(event))) event.preventDefault();
  });
  form.addEventListener("submit", event => {
    if (composing) { event.preventDefault(); event.stopImmediatePropagation(); }
  });
}
