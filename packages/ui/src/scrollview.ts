import { Shape } from "@fulate/core";
import type { ShapeOption } from "@fulate/core";
import type { RectWithCenter } from "@fulate/util";
import { CustomEvent } from "@fulate/core";
import { Point } from "@fulate/util";

export interface ScrollViewOption extends ShapeOption {
  scrollX?: number;
  scrollY?: number;
  contentWidth?: number;
  contentHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  scrollbarSize?: number;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  scrollEndThreshold?: number;
  onscroll?: (e: { scrollX: number; scrollY: number }) => void;
  onscrollend?: (e: { scrollX: number; scrollY: number }) => void;
}

interface ThumbRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ScrollView extends Shape {
  type = "scrollview";

  isScrollContainer = true;

  scrollX = 0;
  scrollY = 0;
  contentWidth = 0;
  contentHeight = 0;

  maxWidth?: number;
  maxHeight?: number;

  scrollbarSize = 6;
  scrollbarColor = "rgba(0,0,0,0.35)";
  scrollbarTrackColor = "rgba(0,0,0,0.08)";
  scrollEndThreshold = 0;

  private _vThumb: ThumbRect | null = null;
  private _hThumb: ThumbRect | null = null;

  private _dragging = false;
  private _dragAxis: "x" | "y" = "y";
  private _dragStartScroll = 0;
  private _dragStartPointer = 0;

  constructor(options?: ScrollViewOption) {
    super(options as any);
    if (options) {
      this.attrs(options);
    }
    if (options?.maxHeight != null && options.height == null) {
      this.height = options.maxHeight;
    }
    if (options?.maxWidth != null && options.width == null) {
      this.width = options.maxWidth;
    }
  }

  markChildDirty() {
    super.markChildDirty();
    this.layer?.addDirtyNode(this as any);
  }

  mounted() {
    this.provide("scrollContainer", this);
    super.mounted();
    this._initDragInteraction();
  }

  scrollTo(x: number, y: number) {
    const maxX = Math.max(0, this.contentWidth - this.width!);
    const maxY = Math.max(0, this.contentHeight - this.height!);
    const newX = Math.max(0, Math.min(x, maxX));
    const newY = Math.max(0, Math.min(y, maxY));
    if (newX === this.scrollX && newY === this.scrollY) return;
    this.scrollX = newX;
    this.scrollY = newY;
    this.markNeedsLayout();

    const detail = { scrollX: this.scrollX, scrollY: this.scrollY };
    this.dispatchEvent(new CustomEvent("scroll", { detail }));

    const atBottom = maxY > 0 && this.scrollY >= maxY - this.scrollEndThreshold;
    const atRight = maxX > 0 && this.scrollX >= maxX - this.scrollEndThreshold;
    if (atBottom || atRight) {
      this.dispatchEvent(new CustomEvent("scrollend", { detail }));
    }
  }

  scrollBy(dx: number, dy: number) {
    this.scrollTo(this.scrollX + dx, this.scrollY + dy);
  }

  isChildInScrollView(child: any): boolean {
    if (!child.visible || child.width == null || child.height == null)
      return false;
    const cb: RectWithCenter = child.getBoundingRect();
    const mb: RectWithCenter = this.getBoundingRect();
    return (
      cb.left + cb.width > mb.left &&
      cb.left < mb.left + mb.width &&
      cb.top + cb.height > mb.top &&
      cb.top < mb.top + mb.height
    );
  }

  updateTransform(parentWorldDirty: boolean = false) {
    const needsLayout = parentWorldDirty || this.isDirty || this.isDirtyChild;
    super.updateTransform(parentWorldDirty);
    if (needsLayout) {
      this._updateScrollLayout();
    }
  }

  private _updateScrollLayout() {
    let maxRight = 0;
    let maxBottom = 0;
    if (this.children?.length) {
      for (const child of this.children) {
        if (!child.visible || child.width == null || child.height == null)
          continue;
        maxRight = Math.max(maxRight, child.left + child.width);
        maxBottom = Math.max(maxBottom, child.top + child.height);
      }
    }
    this.contentWidth = maxRight;
    this.contentHeight = maxBottom;

    let sizeChanged = false;
    if (this.maxHeight != null) {
      const newH = maxBottom > 0 ? Math.min(this.contentHeight, this.maxHeight) : 0;
      if (newH !== this.height) {
        this.height = newH;
        sizeChanged = true;
      }
    }
    if (this.maxWidth != null) {
      const newW = maxRight > 0 ? Math.min(this.contentWidth, this.maxWidth) : 0;
      if (newW !== this.width) {
        this.width = newW;
        sizeChanged = true;
      }
    }

    if (sizeChanged) {
      this.calcWorldMatrix();
      this.layer?.syncRbush(this as any);
    }

    const oldScrollX = this.scrollX;
    const oldScrollY = this.scrollY;
    const maxScrollX = Math.max(0, this.contentWidth - (this.width ?? 0));
    const maxScrollY = Math.max(0, this.contentHeight - (this.height ?? 0));
    this.scrollX = Math.min(this.scrollX, maxScrollX);
    this.scrollY = Math.min(this.scrollY, maxScrollY);

    if (this.scrollX !== oldScrollX || this.scrollY !== oldScrollY) {
      if (this.children) {
        for (const child of this.children) {
          (child as any).updateTransform?.(true);
        }
      }
    }
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (!this.visible) return;

    ctx.save();
    this.applyPaintTransform(ctx);
    if (this.opacity < 1) ctx.globalAlpha *= this.opacity;
    this.paintBackground(ctx);

    ctx.beginPath();
    ctx.rect(0, 0, this.width!, this.height!);
    ctx.clip();

    this.paintChildren(ctx);
    ctx.restore();

    ctx.save();
    this.applyPaintTransform(ctx);
    if (this.opacity < 1) ctx.globalAlpha *= this.opacity;
    this.paintScrollbars(ctx);
    this.paintBorder(ctx);
    ctx.restore();
  }

  protected paintScrollbars(ctx: CanvasRenderingContext2D) {
    const w = this.width!;
    const h = this.height!;
    const bar = this.scrollbarSize;
    const pad = 2;
    const minThumb = 20;

    this._vThumb = null;
    this._hThumb = null;

    if (this.contentHeight > h) {
      const trackH = h - pad * 2;
      const ratio = h / this.contentHeight;
      const thumbH = Math.min(Math.max(ratio * trackH, minThumb), trackH);
      const maxScroll = this.contentHeight - h;
      const thumbY =
        pad +
        (maxScroll > 0
          ? (this.scrollY / maxScroll) * (trackH - thumbH)
          : 0);
      const x = w - bar - pad;

      this._vThumb = { x, y: thumbY, w: bar, h: thumbH };

      ctx.beginPath();
      ctx.roundRect(x, pad, bar, trackH, bar / 2);
      ctx.fillStyle = this.scrollbarTrackColor;
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(x, thumbY, bar, thumbH, bar / 2);
      ctx.fillStyle = this.scrollbarColor;
      ctx.fill();
    }

    if (this.contentWidth > w) {
      const trackW = w - pad * 2;
      const ratio = w / this.contentWidth;
      const thumbW = Math.min(Math.max(ratio * trackW, minThumb), trackW);
      const maxScroll = this.contentWidth - w;
      const thumbX =
        pad +
        (maxScroll > 0
          ? (this.scrollX / maxScroll) * (trackW - thumbW)
          : 0);
      const y = h - bar - pad;

      this._hThumb = { x: thumbX, y, w: thumbW, h: bar };

      ctx.beginPath();
      ctx.roundRect(pad, y, trackW, bar, bar / 2);
      ctx.fillStyle = this.scrollbarTrackColor;
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(thumbX, y, thumbW, bar, bar / 2);
      ctx.fillStyle = this.scrollbarColor;
      ctx.fill();
    }
  }

  private _hitThumb(local: { x: number; y: number }): "x" | "y" | null {
    const v = this._vThumb;
    if (
      v &&
      local.x >= v.x &&
      local.x <= v.x + v.w &&
      local.y >= v.y &&
      local.y <= v.y + v.h
    ) {
      return "y";
    }
    const h = this._hThumb;
    if (
      h &&
      local.x >= h.x &&
      local.x <= h.x + h.w &&
      local.y >= h.y &&
      local.y <= h.y + h.h
    ) {
      return "x";
    }
    return null;
  }

  private _initDragInteraction() {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const logical = this.root.getLogicalPosition(e.clientX, e.clientY);
      const local = this.getGlobalToLocal(new Point(logical.x, logical.y));
      const axis = this._hitThumb(local);
      if (!axis) return;

      e.stopPropagation();
      this._dragging = true;
      this._dragAxis = axis;
      this._dragStartScroll = axis === "y" ? this.scrollY : this.scrollX;
      this._dragStartPointer = axis === "y" ? e.clientY : e.clientX;
      this.root.hasLockPoint = true;
    };

    const onMove = (e: PointerEvent) => {
      if (!this._dragging) return;
      const scale = this.root.viewport.scale;
      const pointer = this._dragAxis === "y" ? e.clientY : e.clientX;
      const delta = (pointer - this._dragStartPointer) / scale;

      const viewSize = this._dragAxis === "y" ? this.height! : this.width!;
      const contentSize =
        this._dragAxis === "y" ? this.contentHeight : this.contentWidth;
      const thumb = this._dragAxis === "y" ? this._vThumb : this._hThumb;
      if (!thumb) return;

      const pad = 2;
      const trackSize = viewSize - pad * 2;
      const thumbSize = this._dragAxis === "y" ? thumb.h : thumb.w;
      const scrollRange = contentSize - viewSize;
      const scrollDelta = (delta / (trackSize - thumbSize)) * scrollRange;

      if (this._dragAxis === "y") {
        this.scrollTo(this.scrollX, this._dragStartScroll + scrollDelta);
      } else {
        this.scrollTo(this._dragStartScroll + scrollDelta, this.scrollY);
      }
    };

    const onUp = () => {
      if (!this._dragging) return;
      this._dragging = false;
      this.root.hasLockPoint = false;
    };

    this.root.container.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    this.addEventListener("deactivated", () => {
      this.root.container.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    });
  }
}
