import { afterEach, expect, it, vi } from "vitest";
import type { Setting } from "obsidian";
import { autoSave, flushFields } from "../src/option-fields";

function element<T extends HTMLElement>(node: T): T {
  Object.assign(node, {
    setAttr: (name: string, value: string) => node.setAttribute(name, value),
    setText: (text: string) => { node.textContent = text; },
    addClass: (...names: string[]) => node.classList.add(...names),
    removeClass: (...names: string[]) => node.classList.remove(...names),
    hasClass: (name: string) => node.classList.contains(name),
    createDiv: ({ cls }: { cls: string }) => { const child = element(document.createElement("div")); child.className = cls; node.append(child); return child; },
  });
  return node;
}
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

it("saves the latest close-time edit even while an earlier save is pending", async () => {
  vi.useFakeTimers();
  const root = element(document.createElement("div"));
  const descEl = element(document.createElement("div"));
  const field = element(document.createElement("input"));
  root.append(descEl, field); document.body.append(root);
  let release!: () => void;
  const firstSave = new Promise<void>(resolve => { release = resolve; });
  const values: string[] = [];
  autoSave(root, { descEl } as Setting, field, async value => { values.push(value); if (values.length === 1) await firstSave; });
  field.value = "first"; field.dispatchEvent(new Event("blur"));
  await settle();
  field.value = "final"; flushFields(root); root.replaceChildren();
  release(); await settle();
  expect(values).toEqual(["first", "final"]);
});
