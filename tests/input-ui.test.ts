import { describe, expect, it, vi } from "vitest";
import { guardFormComposition, isComposingKey } from "../src/input-ui";
import { writeFocus } from "../src/daily-focus";
import { normalizeSettings } from "../src/settings";
import type Plugin from "../src/main";

describe("IME confirmation and native forms", () => {
  it("recognizes both composing Enter and the final legacy 229 event", () => {
    expect(isComposingKey(new KeyboardEvent("keydown", { key: "Enter", isComposing: true }))).toBe(true);
    expect(isComposingKey(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229 }))).toBe(true);
    expect(isComposingKey(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(false);
  });
  it("blocks candidate confirmation without blocking the next intentional submission", () => {
    const form = document.createElement("form"), input = document.createElement("input");
    form.append(input); guardFormComposition(form);
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", submit);
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(submit).not.toHaveBeenCalled();
    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    const legacy = new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, bubbles: true, cancelable: true });
    input.dispatchEvent(legacy);
    expect(legacy.defaultPrevented).toBe(true);
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(submit).toHaveBeenCalledOnce();
  });
});

it("rolls back the in-memory daily focus if settings persistence fails", async () => {
  const settings = normalizeSettings(null);
  const before = settings.dailyFocus;
  const plugin = { settings, app: { commands: { commands: {} } }, saveSettings: vi.fn().mockRejectedValue(new Error("disk full")) } as unknown as Plugin;
  await expect(writeFocus(plugin, [{ text: "Keep my draft", done: false }])).rejects.toThrow("disk full");
  expect(settings.dailyFocus).toBe(before);
});
