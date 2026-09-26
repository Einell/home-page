/** Shared placement geometry for pages, cards and shortcut grids. */
export function dropAfter(axis: "x" | "y", rect: Pick<DOMRect, "left" | "top" | "width" | "height">, point: { clientX: number; clientY: number }): boolean {
  return axis === "x" ? point.clientX > rect.left + rect.width / 2 : point.clientY > rect.top + rect.height / 2;
}
export function edgeScrollSpeed(y: number, top: number, bottom: number): number {
  if (y < top || y > bottom) return 0;
  const zone = Math.min(48, (bottom - top) / 4);
  if (y < top + zone) return -Math.ceil(12 * (1 - (y - top) / zone));
  if (y > bottom - zone) return Math.ceil(12 * (1 - (bottom - y) / zone));
  return 0;
}

/** Visual state never changes saved ordering until a valid drop. */
export class DragFeedback {
  private frame: number | null = null;
  private previewFrame: number | null = null;
  private preview: HTMLElement | null = null;
  private velocity = 0;
  private scroll: HTMLElement | null = null;
  constructor(private root: HTMLElement) {}
  start(source: HTMLElement, event: DragEvent, title: string): void {
    this.clear();
    const preview = this.root.createDiv({ cls: "qh-drag-preview", text: title });
    this.preview = preview;
    event.dataTransfer?.setDragImage(preview, 16, 16);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    source.addClass("qh-dragging");
    const win = this.root.ownerDocument.defaultView;
    if (win) this.previewFrame = win.requestAnimationFrame(() => { preview.remove(); this.preview = null; this.previewFrame = null; });
  }
  over(target: HTMLElement, event: DragEvent, axis: "x" | "y"): boolean {
    this.clearMarker();
    const after = dropAfter(axis, target.getBoundingClientRect(), event);
    target.addClass("qh-drop-marker");
    target.dataset.dropAxis = axis;
    target.dataset.dropSide = after ? "after" : "before";
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    this.scroll = target.closest<HTMLElement>(".qh-page");
    if (this.scroll) {
      const rect = this.scroll.getBoundingClientRect();
      this.velocity = edgeScrollSpeed(event.clientY, rect.top, rect.bottom);
      const win = this.root.ownerDocument.defaultView;
      if (win && this.frame === null && this.velocity) {
        const step = () => {
          this.frame = null;
          if (!this.velocity || !this.scroll?.isConnected) return;
          this.scroll.scrollTop += this.velocity;
          this.frame = win.requestAnimationFrame(step);
        };
        this.frame = win.requestAnimationFrame(step);
      }
    }
    return after;
  }
  leave(target: HTMLElement, event: DragEvent): void {
    const related = event.relatedTarget;
    if (related && target.contains(related as Node)) return;
    target.removeClass("qh-drop-marker"); this.velocity = 0;
  }
  private clearMarker(): void {
    this.root.querySelectorAll<HTMLElement>(".qh-drop-marker").forEach((element) => {
      element.removeClass("qh-drop-marker"); delete element.dataset.dropAxis; delete element.dataset.dropSide;
    });
  }
  clear(): void {
    this.clearMarker(); this.velocity = 0; this.scroll = null;
    const win = this.root.ownerDocument.defaultView;
    if (this.frame !== null) win?.cancelAnimationFrame(this.frame);
    if (this.previewFrame !== null) win?.cancelAnimationFrame(this.previewFrame);
    this.frame = this.previewFrame = null;
    this.preview?.remove(); this.preview = null;
    this.root.querySelectorAll(".qh-dragging").forEach((element) => element.removeClass("qh-dragging"));
  }
}
