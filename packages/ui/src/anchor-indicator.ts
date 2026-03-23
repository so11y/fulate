import { Element, Shape } from "@fulate/core";
import { Point } from "@fulate/util";
import { getMeasureContext, measureStringWidth, getCharWidth } from "./text/measure";

const DOT_RADIUS = 4;
const GAP = 3;
const FONT_SIZE = 10;
const LINE_HEIGHT = 1.4;
const FONT = `${FONT_SIZE}px Arial, sans-serif`;
const MAX_WIDTH = 80;

export class AnchorIndicator extends Shape {
  type = "anchor-indicator";
  anchorLabel: string = "";
  edge: "top" | "right" | "bottom" | "left" = "top";
  anchorRatio: number = 0;
  dotColor: string = "#4F81FF";
  labelWidth: number = MAX_WIDTH;

  constructor(data: { id: string; label: string; edge: string; labelWidth?: number }) {
    super();
    this.id = `__anchor_${data.id}`;
    this.anchorLabel = data.label;
    this.edge = data.edge as any;
    if (data.labelWidth != null) this.labelWidth = data.labelWidth;
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
      case "right":  return { x: -(GAP + DOT_RADIUS), y: h / 2  };
    }
  }

  private _syncPosition() {
    const parent = this.parent;
    if (!parent) return;

    const pw = parent.width || 0;
    const ph = parent.height || 0;
    const lineH = FONT_SIZE * LINE_HEIGHT;

    this.width = this.labelWidth;
    this.height = lineH;

    const dot = this._dotLocal();
    switch (this.edge) {
      case "top":
        this.left = pw * this.anchorRatio - dot.x;
        this.top = -(lineH + GAP + DOT_RADIUS);
        break;
      case "bottom":
        this.left = pw * this.anchorRatio - dot.x;
        this.top = ph + GAP + DOT_RADIUS;
        break;
      case "left":
        this.left = -(this.labelWidth + GAP + DOT_RADIUS);
        this.top = ph * this.anchorRatio - lineH / 2;
        break;
      case "right":
        this.left = pw + GAP + DOT_RADIUS;
        this.top = ph * this.anchorRatio - lineH / 2;
        break;
    }
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

    const textMaxW = w - GAP;
    if (textMaxW <= 0) return;

    const label = this._ellipsis(this.anchorLabel, textMaxW);
    if (this.edge === "left") {
      ctx.textAlign = "right";
      ctx.fillText(label, w, h / 2);
    } else if (this.edge === "right") {
      ctx.textAlign = "left";
      ctx.fillText(label, 0, h / 2);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(label, w / 2, h / 2);
    }
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
