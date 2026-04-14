import type { Root } from "./index";
import type { RectWithCenter } from "@fulate/util";
import { Point } from "@fulate/util";
import { CustomEvent } from "../event";
import { Group } from "@tweenjs/tween.js";
import { Tween, Easing } from "@tweenjs/tween.js";

export class Viewport {
  x = 0;
  y = 0;
  scale = 1;
  matrix = new DOMMatrix();

  minScale: number;
  maxScale: number;

  dpr = window.devicePixelRatio || 1;

  _tweenGroup = new Group();
  _paintedViewport = { x: 0, y: 0, scale: 1 };
  _cssTransformTimer: ReturnType<typeof setTimeout> | null = null;
  _isCssTransforming = false;
  cssTransformThreshold = 0.45;

  constructor(
    private _root: Root,
    options?: { minScale?: number; maxScale?: number }
  ) {
    this.minScale = options?.minScale ?? 0.1;
    this.maxScale = options?.maxScale ?? 10;
  }

  getWorldRect() {
    return {
      left: -this.x / this.scale,
      top: -this.y / this.scale,
      width: this._root.width / this.scale,
      height: this._root.height / this.scale,
    };
  }

  getLogicalPosition(clientX: number, clientY: number) {
    const rect = this._root.containerRect;
    return new Point(
      (clientX - rect.left - this.x) / this.scale,
      (clientY - rect.top - this.y) / this.scale
    );
  }

  getViewPointMtrix() {
    const m = this.matrix;
    m.a = this.scale;
    m.b = 0;
    m.c = 0;
    m.d = this.scale;
    m.e = this.x;
    m.f = this.y;
    return m;
  }

  applyViewPointTransform(
    ctx: CanvasRenderingContext2D,
    ownMatrix?: DOMMatrix
  ) {
    const d = this.dpr;
    const vp = this.getViewPointMtrix();
    if (!ownMatrix) {
      ctx.setTransform(
        vp.a * d,
        vp.b * d,
        vp.c * d,
        vp.d * d,
        vp.e * d,
        vp.f * d
      );
      return;
    }
    const m = ownMatrix;
    ctx.setTransform(
      (vp.a * m.a + vp.c * m.b) * d,
      (vp.b * m.a + vp.d * m.b) * d,
      (vp.a * m.c + vp.c * m.d) * d,
      (vp.b * m.c + vp.d * m.d) * d,
      (vp.a * m.e + vp.c * m.f + vp.e) * d,
      (vp.b * m.e + vp.d * m.f + vp.f) * d
    );
  }

  private _clampScale(scale: number): number {
    return Math.max(this.minScale, Math.min(this.maxScale, scale));
  }

  zoom(
    delta: number,
    center?: { x: number; y: number },
    useCssTransform = false
  ): number {
    const root = this._root;
    const prevScale = this.scale;
    const newScale = this._clampScale(prevScale * delta);
    const cx = center?.x ?? root.width / 2;
    const cy = center?.y ?? root.height / 2;

    this.x = cx - ((cx - this.x) * newScale) / prevScale;
    this.y = cy - ((cy - this.y) * newScale) / prevScale;
    this.scale = newScale;

    if (useCssTransform) {
      this._applyCssTransform();
    } else {
      this.syncPaintedViewport();
      root.requestRender();
    }
    root.dispatchEvent(new CustomEvent("zoom"));

    return newScale;
  }

  reset() {
    const root = this._root;
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.syncPaintedViewport();
    root.requestRender();
    root.dispatchEvent(new CustomEvent("zoom"));
  }

  getZoom(): number {
    return this.scale;
  }

  focus(
    rect: RectWithCenter,
    {
      padding = 10,
      animate
    }: {
      padding?: number;
      animate?: { duration?: number; easing?: (amount: number) => number };
    } = {}
  ): Promise<void> {
    const root = this._root;
    const rulerSize =
      root.find<{ rulerSize?: number }>("rule")?.rulerSize ?? 0;
    const activeWidth = root.width - rulerSize;
    const activeHeight = root.height - rulerSize;

    const scaleX = (activeWidth - padding * 2) / rect.width;
    const scaleY = (activeHeight - padding * 2) / rect.height;
    const bestScale = Math.min(scaleX, scaleY, 1);

    const visualCenterX = rulerSize + activeWidth / 2;
    const visualCenterY = rulerSize + activeHeight / 2;

    const cx = rect.centerX ?? rect.left + rect.width / 2;
    const cy = rect.centerY ?? rect.top + rect.height / 2;

    const targetX = visualCenterX - cx * bestScale;
    const targetY = visualCenterY - cy * bestScale;

    if (!animate) {
      this.scale = bestScale;
      this.x = targetX;
      this.y = targetY;
      this.syncPaintedViewport();
      root.requestRender();
      return Promise.resolve();
    }

    this._tweenGroup.removeAll();

    const duration = animate.duration ?? 600;
    const easing = animate.easing ?? Easing.Quadratic.InOut;

    return new Promise<void>((resolve) => {
      new Tween(this, this._tweenGroup)
        .to({ x: targetX, y: targetY, scale: bestScale }, duration)
        .easing(easing)
        .onUpdate(() => root.requestRender())
        .onComplete(() => {
          this.syncPaintedViewport();
          resolve();
          this._tweenGroup.removeAll();
        })
        .start();

      root.requestRender();
    });
  }

  syncPaintedViewport() {
    this._paintedViewport.x = this.x;
    this._paintedViewport.y = this.y;
    this._paintedViewport.scale = this.scale;
  }

  _applyCssTransform() {
    const root = this._root;
    if (this.scale >= this.cssTransformThreshold) {
      this.syncPaintedViewport();
      root.requestRender();
      return;
    }

    const pv = this._paintedViewport;

    const relScale = this.scale / pv.scale;
    const dx = this.x - pv.x * relScale;
    const dy = this.y - pv.y * relScale;

    for (const layer of root.layers) {
      if (!layer.cssTransformable) {
        layer.requestRender();
        continue;
      }
      layer.canvasEl.style.transformOrigin = "0 0";
      layer.canvasEl.style.transform =
        `translate(${dx}px, ${dy}px) scale(${relScale})`;
    }

    this._isCssTransforming = true;

    if (this._cssTransformTimer) clearTimeout(this._cssTransformTimer);
    this._cssTransformTimer = setTimeout(() => {
      this._flushCssTransform();
    }, 150);
  }

  _flushCssTransform() {
    const root = this._root;
    this._cssTransformTimer = null;
    this._isCssTransforming = false;

    for (const layer of root.layers) {
      if (!layer.cssTransformable) continue;
      layer.canvasEl.style.transform = "";
    }

    this.syncPaintedViewport();
    root.requestRender();
  }

  dispose() {
    if (this._cssTransformTimer) {
      clearTimeout(this._cssTransformTimer);
      this._cssTransformTimer = null;
    }
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      scale: this.scale,
      minScale: this.minScale,
      maxScale: this.maxScale,
    };
  }
}
