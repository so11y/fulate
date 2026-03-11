import { BaseElementOption, Element } from "@fulate/core";
import RBush from "rbush";
import { RectWithCenter, RectPoint } from "@fulate/util";
import { Point } from "@fulate/util";
import { Group } from "@tweenjs/tween.js";

export interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: Element;
}

export class Layer extends Element {
  type = "layer";
  canvasEl: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;
  enableDirtyRect: boolean = true;
  cssTransformable: boolean = true;
  rbush = new RBush<RBushItem>();
  tweenGroup = new Group();

  finalDirtyRects: RectPoint[] | null = null;

  dirtyNodes = new Set<Element>();

  isLayer = true;
  isRenderDirtyMode = false;

  private pendingSyncNodes = new Set<Element>();

  private static GRID_COLS = 3;
  private static GRID_ROWS = 3;
  private static FULL_REPAINT_RATIO = 0.5;

  private _buckets: RectPoint[] = Array.from(
    { length: Layer.GRID_COLS * Layer.GRID_ROWS },
    () => ({ left: Infinity, top: Infinity, width: 0, height: 0 })
  );

  constructor(
    options?: BaseElementOption & {
      zIndex?: number;
      silen?: boolean;
      enableDirtyRect?: boolean;
      cssTransformable?: boolean;
    }
  ) {
    super(options);
    this.enableDirtyRect = options?.enableDirtyRect ?? true;
    this.cssTransformable = options?.cssTransformable ?? true;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
  }

  mounted() {
    this.provide("layer", this);
    super.mounted();
    const root = this.root!;
    const width = this.width ?? this.root.width!;
    const height = this.height ?? this.root.height!;

    this.width = width;
    this.height = height;

    const dpr = root.dpr;
    this.canvasEl.width = this.width * dpr;
    this.canvasEl.height = this.height * dpr;

    this.canvasEl.style.width = this.width + "px";
    this.canvasEl.style.height = this.height + "px";
    this.canvasEl.style.position = "absolute";
    this.canvasEl.style.left = "0px";
    this.canvasEl.style.top = "0px";
    this.canvasEl.style.zIndex = (this.zIndex ?? 1).toString();
    root.container.appendChild(this.canvasEl);
    root.registerLayer(this);
  }

  unmounted() {
    super.unmounted();
    if (this.canvasEl.parentNode) {
      this.canvasEl.parentNode.removeChild(this.canvasEl);
    }
    this.root?.unregisterLayer(this);
  }

  syncRbush(node: any) {
    if (node.isLayer || node.type === "root") return;
    this.pendingSyncNodes.add(node);
  }

  removeRbush(node: any) {
    if (node.rbushItem) {
      this.rbush.remove(node.rbushItem);
      node.rbushItem = null;
    }
  }

  searchHitElements(point: Point): RBushItem[] {
    const x = point.x;
    const y = point.y;
    const hits = this.rbush.search({ minX: x, minY: y, maxX: x, maxY: y });
    return hits;
  }

  searchAreaElements(point: RectWithCenter): RBushItem[] {
    const x = point.left;
    const y = point.top;
    const hits = this.rbush.search({
      minX: x,
      minY: y,
      maxX: x + point.width,
      maxY: y + point.height
    });
    return hits;
  }

  flushSyncNodes() {
    this.pendingSyncNodes.forEach((node: any) => {
      if (node.width === undefined || node.height === undefined) {
        if (node.rbushItem) {
          this.rbush.remove(node.rbushItem);
          node.rbushItem = null;
        }
        return;
      }

      const { left, top, width, height } = node.getBoundingRect();

      if (node.rbushItem) {
        this.rbush.remove(node.rbushItem);
        node.rbushItem.minX = left;
        node.rbushItem.minY = top;
        node.rbushItem.maxX = left + width;
        node.rbushItem.maxY = top + height;
        this.rbush.insert(node.rbushItem);
      } else {
        node.rbushItem = {
          minX: left,
          minY: top,
          maxX: left + width,
          maxY: top + height,
          element: node
        };
        this.rbush.insert(node.rbushItem);
      }
    });
    this.pendingSyncNodes.clear();
  }

  hasInView() {
    return true;
  }

  markChildDirty() {
    this.requestRender();
  }

  addDirtyNode(node: Element) {
    if (!this.enableDirtyRect) return;
    this.dirtyNodes.add(node);
  }

  requestRender() {
    this.root?.scheduleLayerRender(this);
  }

  shouldRepaint() {
    if (this.root?._pendingLayers.has(this)) return true;
    if (this.enableDirtyRect) {
      return this.dirtyNodes.size > 0;
    }
    return true;
  }

  flushUpdate() {
    this.updateTransform(false);
  }

  flushPaint() {
    if (this.shouldRepaint() === false) {
      return;
    }

    if (this.enableDirtyRect && this.dirtyNodes.size > 0) {
      this.isRenderDirtyMode = true;

      const m = this.root.getViewPointMtrix();

      const dpr = this.root.dpr;
      const padding = Math.ceil(2 + (m.a < 1 ? 1 / m.a : 0)) * dpr;

      const canvasW = this.width * dpr;
      const canvasH = this.height * dpr;
      const { GRID_COLS, GRID_ROWS, FULL_REPAINT_RATIO } = Layer;
      const cellW = canvasW / GRID_COLS;
      const cellH = canvasH / GRID_ROWS;

      const buckets = this._buckets;
      for (const b of buckets) {
        b.left = Infinity;
        b.top = Infinity;
        b.width = 0;
        b.height = 0;
      }

      this.dirtyNodes.forEach((node) => {
        const rect = node.getDirtyRect();

        const sLeft = Math.floor((rect.left * m.a + m.e) * dpr) - padding;
        const sTop = Math.floor((rect.top * m.d + m.f) * dpr) - padding;
        const sRight =
          Math.ceil(((rect.left + rect.width) * m.a + m.e) * dpr) + padding;
        const sBottom =
          Math.ceil(((rect.top + rect.height) * m.d + m.f) * dpr) + padding;

        const c0 = Math.max(0, Math.floor(sLeft / cellW));
        const c1 = Math.min(GRID_COLS - 1, Math.floor(sRight / cellW));
        const r0 = Math.max(0, Math.floor(sTop / cellH));
        const r1 = Math.min(GRID_ROWS - 1, Math.floor(sBottom / cellH));

        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const b = buckets[r * GRID_COLS + c];
            const bRight = b.left === Infinity ? -Infinity : b.left + b.width;
            const bBottom = b.top === Infinity ? -Infinity : b.top + b.height;
            const newLeft = Math.min(b.left, sLeft);
            const newTop = Math.min(b.top, sTop);
            b.left = newLeft;
            b.top = newTop;
            b.width = Math.max(bRight, sRight) - newLeft;
            b.height = Math.max(bBottom, sBottom) - newTop;
          }
        }
      });

      const screenRects: RectPoint[] = [];
      let totalArea = 0;

      for (const b of buckets) {
        if (b.left === Infinity) continue;
        if (b.width > 0 && b.height > 0) {
          screenRects.push(b);
          totalArea += b.width * b.height;
        }
      }

      const canvasArea = canvasW * canvasH;

      if (screenRects.length === 0) {
        this.dirtyNodes.clear();
        this.isRenderDirtyMode = false;
        return;
      }

      if (totalArea > canvasArea * FULL_REPAINT_RATIO) {
        this.isRenderDirtyMode = false;
        this.dirtyNodes.clear();
        this.clear();
        this.paint(this.ctx);
      } else {
        this.finalDirtyRects = screenRects.map((r) => ({
          left: (r.left / dpr - m.e) / m.a,
          top: (r.top / dpr - m.f) / m.d,
          width: r.width / dpr / m.a,
          height: r.height / dpr / m.d
        }));

        this.ctx.save();
        this.ctx.beginPath();
        for (const r of screenRects) {
          this.ctx.rect(r.left, r.top, r.width, r.height);
        }
        this.ctx.clip();
        for (const r of screenRects) {
          this.ctx.clearRect(r.left, r.top, r.width, r.height);
        }
        this.paint(this.ctx);
        this.ctx.restore();

        this.dirtyNodes.clear();
      }
    } else {
      this.clear();
      this.paint(this.ctx);
    }

    this.finalDirtyRects = null;
    this.isRenderDirtyMode = false;
  }

  paint(ctx = this.ctx) {
    ctx.save();
    this.applyTransformToCtx(ctx);
    super.paint();
    ctx.restore();
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(
      0,
      0,
      this.width * this.root.dpr,
      this.height * this.root.dpr
    );
    this.ctx.restore();
  }
}
