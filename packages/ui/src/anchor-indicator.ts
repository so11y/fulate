import { Element, Shape } from "@fulate/core";
import { Point, Bound, makeBoundingBoxFromPoints } from "@fulate/util";
import { getMeasureContext } from "./text/measure";
import { buildFontString, getTextDefaults } from "./text/style";
import { fitLineWithEllipsis } from "./text/layout";

const DOT_RADIUS = 4;
const GAP = 3;
const FONT_SIZE = 10;
const LINE_HEIGHT = 1.4;
const MAX_WIDTH = 80;

export class AnchorIndicator extends Shape {
  type = "anchor-indicator";
  anchorLabel: string = "";
  edge: "top" | "right" | "bottom" | "left" = "top";
  anchorRatio: number = 0;
  dotColor: string = "#4F81FF";
  labelWidth: number = MAX_WIDTH;
  keepLabelUpright: boolean = true;

  constructor(data: {
    label: string;
    edge: string;
    labelWidth?: number;
  }, anchorId: string) {
    super();
    this.id = `__anchor_${anchorId}`;
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

  private _getLabelFont(scaledFontSize?: number): {
    font: string;
    color: string;
  } {
    const defaults = getTextDefaults(this, {
      fontSize: scaledFontSize ?? FONT_SIZE
    });
    return {
      font: buildFontString(defaults),
      color: (defaults.color as string) ?? "#555"
    };
  }

  private _dotLocal(): { x: number; y: number } {
    const w = this.width || 0;
    const h = this.height || 0;
    switch (this.edge) {
      case "top":
        return { x: w / 2, y: h + GAP + DOT_RADIUS };
      case "bottom":
        return { x: w / 2, y: -(GAP + DOT_RADIUS) };
      case "left":
        return { x: w + GAP + DOT_RADIUS, y: h / 2 };
      case "right":
        return { x: -(GAP + DOT_RADIUS), y: h / 2 };
    }
  }

  private _anchorLocalOnHost(): { x: number; y: number } {
    const host = this.parent;
    if (!host) return { x: 0, y: 0 };
    const pw = host.width || 0;
    const ph = host.height || 0;
    switch (this.edge) {
      case "top":
        return { x: pw * this.anchorRatio, y: 0 };
      case "bottom":
        return { x: pw * this.anchorRatio, y: ph };
      case "left":
        return { x: 0, y: ph * this.anchorRatio };
      case "right":
        return { x: pw, y: ph * this.anchorRatio };
    }
  }

  /** Edge outward normal in local space (unit vector). */
  private _edgeNormal(): { nx: number; ny: number } {
    switch (this.edge) {
      case "top":
        return { nx: 0, ny: -1 };
      case "bottom":
        return { nx: 0, ny: 1 };
      case "left":
        return { nx: -1, ny: 0 };
      case "right":
        return { nx: 1, ny: 0 };
    }
  }

  /**
   * Transform the edge normal into world space using the host matrix,
   * then compute the label center position offset from the anchor dot.
   */
  private _labelWorldCenter(
    dotWorld: { x: number; y: number },
    matrix: DOMMatrix
  ) {
    const { a, b, c, d } = matrix;
    const { nx: lnx, ny: lny } = this._edgeNormal();
    const rnx = a * lnx + c * lny;
    const rny = b * lnx + d * lny;
    const len = Math.sqrt(rnx * rnx + rny * rny) || 1;
    const wnx = rnx / len;
    const wny = rny / len;

    const lineH = FONT_SIZE * LINE_HEIGHT;
    const offset = GAP + DOT_RADIUS + GAP + lineH / 2;

    return {
      cx: dotWorld.x + wnx * offset,
      cy: dotWorld.y + wny * offset,
      wnx,
      wny,
      lineH
    };
  }

  private _getLabel(maxW: number): string | null {
    const textMaxW = maxW - GAP;
    if (textMaxW <= 0) return null;
    return this._ellipsis(this.anchorLabel, textMaxW);
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
    const { font } = this._getLabelFont();
    const ctx = getMeasureContext();
    return fitLineWithEllipsis(ctx, text, maxW, font);
  }

  private _labelWorldRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
    align: CanvasTextAlign;
    tx: number;
    ty: number;
  } | null {
    const host = this.parent;
    if (!host || !this.anchorLabel) return null;

    const hostMatrix = host.getOwnMatrix();
    const aLocal = this._anchorLocalOnHost();
    const dot = hostMatrix.transformPoint({ x: aLocal.x, y: aLocal.y });
    const { cx, cy, wnx, lineH } = this._labelWorldCenter(dot, hostMatrix);

    const w = this.labelWidth;
    const align: CanvasTextAlign =
      Math.abs(wnx) > Math.abs(1 - Math.abs(wnx))
        ? wnx > 0
          ? "left"
          : "right"
        : "center";

    return {
      x: cx - w / 2,
      y: cy - lineH / 2,
      w,
      h: lineH,
      align,
      tx: cx,
      ty: cy
    };
  }

  updateTransform(parentWorldDirty: boolean = false) {
    this._syncPosition();
    super.updateTransform(parentWorldDirty);
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    const dot = this._dotLocal();
    ctx.fillStyle = this.dotColor;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (!this.anchorLabel) return;

    if (this.keepLabelUpright) {
      this.layer?.addOverlayPainter((overlayCtx) => {
        this._paintLabelWorld(overlayCtx);
      });
    } else {
      this._paintLabelLocal(ctx);
    }
  }

  private _paintLabelLocal(ctx: CanvasRenderingContext2D) {
    const w = this.width || 0;
    const h = this.height || 0;
    const label = this._getLabel(w);
    if (!label) return;

    const { font, color } = this._getLabelFont();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";

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

  private _paintLabelWorld(ctx: CanvasRenderingContext2D) {
    const rect = this._labelWorldRect();
    if (!rect) return;

    const root = this.root;
    if (!root) return;

    const label = this._getLabel(rect.w);
    if (!label) return;

    const vp = root.viewport;
    const dpr = root.viewport.dpr;
    const { font, color } = this._getLabelFont(FONT_SIZE * vp.scale);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = (x: number) => x * vp.scale + vp.x;
    const sy = (y: number) => y * vp.scale + vp.y;

    ctx.fillStyle = '#fff'

    ctx.rect(sx(rect.tx), sy(rect.ty), 0, 100);

    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = rect.align;
    ctx.fillText(label, sx(rect.tx), sy(rect.ty));
    ctx.restore();
  }

  getBoundingRect(): Bound {
    if (this._boundingRectCache) return this._boundingRectCache;

    if (!this.keepLabelUpright || !this.parent) {
      this._boundingRectCache = Bound.fromPoints(this.getCoords());
      return this._boundingRectCache;
    }

    const hostMatrix = this.parent.getOwnMatrix();
    const aLocal = this._anchorLocalOnHost();
    const dotWorld = hostMatrix.transformPoint({ x: aLocal.x, y: aLocal.y });
    const { cx, cy, lineH } = this._labelWorldCenter(dotWorld, hostMatrix);

    const w = this.labelWidth;
    const textLeft = cx - w / 2;
    const textTop = cy - lineH / 2;

    const minX = Math.min(textLeft, dotWorld.x - DOT_RADIUS);
    const minY = Math.min(textTop, dotWorld.y - DOT_RADIUS);
    const maxX = Math.max(textLeft + w, dotWorld.x + DOT_RADIUS);
    const maxY = Math.max(textTop + lineH, dotWorld.y + DOT_RADIUS);

    this._boundingRectCache = new Bound(minX, minY, maxX, maxY);
    return this._boundingRectCache;
  }

  hasPointHint(_point: Point): boolean {
    return false;
  }

  getLocalPoints() {
    const w = this.width || 0;
    const h = this.height || 0;
    const dot = this._dotLocal();
    return [
      new Point(
        Math.min(0, dot.x - DOT_RADIUS),
        Math.min(0, dot.y - DOT_RADIUS)
      ),
      new Point(
        Math.max(w, dot.x + DOT_RADIUS),
        Math.min(0, dot.y - DOT_RADIUS)
      ),
      new Point(
        Math.max(w, dot.x + DOT_RADIUS),
        Math.max(h, dot.y + DOT_RADIUS)
      ),
      new Point(
        Math.min(0, dot.x - DOT_RADIUS),
        Math.max(h, dot.y + DOT_RADIUS)
      )
    ];
  }
}

Element._createAnchorIndicator = (data: any, anchorId: string) => new AnchorIndicator(data, anchorId);
