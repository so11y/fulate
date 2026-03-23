import { Element, Shape } from "@fulate/core";
import { Point } from "@fulate/util";
import { getMeasureContext, measureStringWidth, getCharWidth } from "./text/measure";

const DOT_RADIUS = 4;
const GAP = 3;
const FONT_SIZE = 10;
const LINE_HEIGHT = 1.4;
const FONT = `${FONT_SIZE}px Arial, sans-serif`;

export class AnchorIndicator extends Shape {
  type = "anchor-indicator";
  anchorLabel: string = "";
  edge: "top" | "right" | "bottom" | "left" = "top";
  anchorRatio: number = 0;
  dotColor: string = "#4F81FF";

  constructor(data: { id: string; label: string; edge: string }) {
    super();
    this.id = `__anchor_${data.id}`;
    this.anchorLabel = data.label;
    this.edge = data.edge as any;
    this.visible = true;
    this.selectctbale = false;
    this.enableMove = false;
    this.enableResize = false;
    this.enableAnchor = false;
    this.silent = true;
    this.pickable = false;
  }

  private _dotLocal(): { x: number; y: number } {
    const w = this.width || 0;
    const h = this.height || 0;
    switch (this.edge) {
      case "top":    return { x: w / 2, y: h + GAP + DOT_RADIUS };
      case "bottom": return { x: w / 2, y: -(GAP + DOT_RADIUS) };
      case "left":   return { x: w + GAP + DOT_RADIUS, y: h / 2 };
      case "right":  return { x: -(GAP + DOT_RADIUS), y: h / 2 };
    }
  }

  private _syncPosition() {
    const parent = this.parent;
    if (!parent) return;

    const pw = parent.width || 0;
    const ph = parent.height || 0;
    const anchors: any[] = (parent as any).anchors || [];
    const sameEdgeCount = anchors.filter((a: any) => a.edge === this.edge).length;
    const isH = this.edge === "top" || this.edge === "bottom";
    const edgeLength = isH ? pw : ph;
    const slotWidth = sameEdgeCount > 0 ? edgeLength / (sameEdgeCount + 1) : edgeLength;
    const lineH = FONT_SIZE * LINE_HEIGHT;

    this.width = slotWidth;
    this.height = lineH;

    let ax: number, ay: number;
    switch (this.edge) {
      case "top":    ax = pw * this.anchorRatio; ay = 0;  break;
      case "bottom": ax = pw * this.anchorRatio; ay = ph; break;
      case "left":   ax = 0;  ay = ph * this.anchorRatio; break;
      case "right":  ax = pw; ay = ph * this.anchorRatio; break;
    }

    const dot = this._dotLocal();
    this.left = ax - dot.x;
    this.top = ay - dot.y;
  }

  private _ellipsis(text: string, maxW: number): string {
    const ctx = getMeasureContext();
    if (measureStringWidth(ctx, text, FONT) <= maxW) return text;
    const ew = measureStringWidth(ctx, "\u2026", FONT);
    let w = ew;
    let i = 0;
    for (; i < text.length; i++) {
      w += getCharWidth(ctx, text[i], FONT);
      if (w > maxW) break;
    }
    return text.slice(0, i) + "\u2026";
  }

  updateTransform(parentWorldDirty: boolean = false) {
    this._syncPosition();
    super.updateTransform(parentWorldDirty);
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    const w = this.width || 0;
    const h = this.height || 0;

    const dot = this._dotLocal();
    ctx.fillStyle = this.dotColor;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (!this.anchorLabel) return;

    ctx.font = FONT;
    ctx.fillStyle = "#555";
    ctx.textBaseline = "middle";

    const textMaxW = w - DOT_RADIUS * 2 - GAP * 2;
    if (textMaxW <= 0) return;

    const label = this._ellipsis(this.anchorLabel, textMaxW);
    ctx.textAlign = "center";
    ctx.fillText(label, w / 2, h / 2);
  }

  hasPointHint(_point: Point): boolean {
    return false;
  }

  getLocalPoints() {
    const w = this.width || 0;
    const h = this.height || 0;
    const dot = this._dotLocal();
    return [
      new Point(Math.min(0, dot.x - DOT_RADIUS), Math.min(0, dot.y - DOT_RADIUS)),
      new Point(Math.max(w, dot.x + DOT_RADIUS), Math.min(0, dot.y - DOT_RADIUS)),
      new Point(Math.max(w, dot.x + DOT_RADIUS), Math.max(h, dot.y + DOT_RADIUS)),
      new Point(Math.min(0, dot.x - DOT_RADIUS), Math.max(h, dot.y + DOT_RADIUS)),
    ];
  }
}

Element._createAnchorIndicator = (data: any) => new AnchorIndicator(data);
