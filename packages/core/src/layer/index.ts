import { BaseElementOption, Element } from "@fulate/core";
import type { RBushItem } from "@fulate/core";
import RBush from "rbush";
import { RectWithCenter, RectPoint } from "@fulate/util";
import { Point } from "@fulate/util";
import { Group } from "@tweenjs/tween.js";

// ========== dirty-rect helpers ==========

interface ScreenBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
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
  paintDirtyNodes = new Set<Element>();

  isLayer = true;
  isRenderDirtyMode = false;
  _forceFullRepaint = false;
  _dirtyVisitSet: Set<Element> | null = null;

  debugDirtyRect: boolean = false;
  private _debugCanvas: HTMLCanvasElement | null = null;
  private _debugCtx: CanvasRenderingContext2D | null = null;
  private _debugTimer: any = null;

  _frameId = 0;

  private _pendingSyncRbushNodes = new Set<Element>();
  private _postUpdateCallbacks = new Set<() => void>();
  private static GRID_COLS = 3;
  private static GRID_ROWS = 3;
  private static FULL_REPAINT_RATIO = 0.5;
  private static RBUSH_REBUILD_RATIO = 0.3;

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
      debugDirtyRect?: boolean;
    }
  ) {
    super(options);
    this.debugDirtyRect = options?.debugDirtyRect ?? false;
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

  syncRbush(node: Element) {
    if ((node as any).isLayer || node.type === "root") return;
    this._pendingSyncRbushNodes.add(node);
  }

  addPostUpdate(callback: () => void) {
    this._postUpdateCallbacks.add(callback);
    this.requestRender();
  }

  flushPostUpdate() {
    if (this._postUpdateCallbacks.size === 0) return;
    const cbs = [...this._postUpdateCallbacks];
    this._postUpdateCallbacks.clear();
    for (const cb of cbs) cb();
  }

  removeRbush(node: Element) {
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
    const pending = this._pendingSyncRbushNodes;
    if (pending.size === 0) return;

    const allItems = this.rbush.all();
    if (pending.size <= allItems.length * Layer.RBUSH_REBUILD_RATIO) {
      for (const node of pending) {
        const oldItem = node.rbushItem;
        if (oldItem) this.rbush.remove(oldItem);
        updateNodeItem(node);
        if (node.rbushItem) this.rbush.insert(node.rbushItem);
      }
    } else {
      for (const node of pending) updateNodeItem(node);

      const existing = new Set(allItems);
      const result = allItems.filter((item) => item.element.rbushItem === item);
      for (const node of pending) {
        const item = node.rbushItem;
        if (item && !existing.has(item)) result.push(item);
      }
      this.rbush.clear();
      this.rbush.load(result);
    }

    pending.clear();
  }

  hasInView() {
    return true;
  }

  markChildDirty() {
    this.requestRender();
  }

  addDirtyNode(node: Element) {
    this.dirtyNodes.add(node);
  }

  addPaintDirtyNode(node: Element) {
    this.paintDirtyNodes.add(node);
  }

  requestRender() {
    this.root?.scheduleLayerRender(this);
  }

  shouldRepaint() {
    if (this.root?._pendingLayers.has(this)) return true;
    return this.dirtyNodes.size > 0 || this.paintDirtyNodes.size > 0;
  }

  flushUpdate() {
    if (this.isUnmounted) return;

    if (this.isDirty) {
      this.updateTransform(false);
      return;
    }

    for (const node of this.dirtyNodes) {
      if (!node.isActiveed) continue;
      node.bubbleUpdateTransform();
    }
  }

  clearDirtyState() {
    for (const node of this.dirtyNodes) {
      node.isDirty = false;
      node._lastBoundingRect = null;
    }
    this.dirtyNodes.clear();
    this.paintDirtyNodes.clear();
  }

  private _fullRepaint() {
    this.clear();
    this.paint(this.ctx);
  }

  private _paintDirtyRects(screenRects: RectPoint[]) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    for (const r of screenRects) ctx.rect(r.left, r.top, r.width, r.height);
    ctx.clip();
    for (const r of screenRects)
      ctx.clearRect(r.left, r.top, r.width, r.height);

    const visitSet = new Set<Element>();
    for (const wr of this.finalDirtyRects!) {
      const hits = this.searchAreaElements(wr);
      for (const hit of hits) {
        let node: Element | undefined = hit.element;
        while (node && node !== (this as any)) {
          if (visitSet.has(node)) break;
          visitSet.add(node);
          node = node.parent;
        }
      }
    }
    this._dirtyVisitSet = visitSet;
    this.paint(ctx);
    this._dirtyVisitSet = null;

    ctx.restore();
  }

  private _ensureDebugCanvas(): CanvasRenderingContext2D | null {
    if (!this.debugDirtyRect) return null;
    if (!this._debugCanvas) {
      this._debugCanvas = document.createElement("canvas");
      this._debugCanvas.width = this.canvasEl.width;
      this._debugCanvas.height = this.canvasEl.height;
      this._debugCanvas.style.width = this.canvasEl.style.width;
      this._debugCanvas.style.height = this.canvasEl.style.height;
      this._debugCanvas.style.position = "absolute";
      this._debugCanvas.style.left = "0px";
      this._debugCanvas.style.top = "0px";
      this._debugCanvas.style.zIndex = "99999";
      this._debugCanvas.style.pointerEvents = "none";
      this.canvasEl.parentNode!.appendChild(this._debugCanvas);
      this._debugCtx = this._debugCanvas.getContext("2d")!;
    }
    return this._debugCtx;
  }

  private _flashRects(
    screenRects: RectPoint[],
    color: string,
    worldRects?: RectPoint[]
  ) {
    const ctx = this._ensureDebugCanvas();
    if (!ctx) return;
    const canvas = this._debugCanvas!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const r of screenRects) {
      ctx.fillStyle = color;
      ctx.fillRect(r.left, r.top, r.width, r.height);
      ctx.strokeStyle = color.replace(/[\d.]+\)$/, "0.8)");
      ctx.lineWidth = 2;
      ctx.strokeRect(r.left, r.top, r.width, r.height);
    }

    if (worldRects) {
      const m = this.root.getViewPointMtrix();
      const dpr = this.root.dpr;
      for (const wr of worldRects) {
        const hits = this.searchAreaElements(wr);
        for (const hit of hits) {
          const bounds = hit.element.getBoundingRect();
          const sx = (bounds.left * m.a + m.e) * dpr;
          const sy = (bounds.top * m.d + m.f) * dpr;
          const sw = bounds.width * m.a * dpr;
          const sh = bounds.height * m.d * dpr;
          ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, sy, sw, sh);
        }
      }
    }

    if (this._debugTimer) clearTimeout(this._debugTimer);
    this._debugTimer = setTimeout(() => {
      this._debugTimer = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 120);
  }

  flushPaint() {
    if (this.isUnmounted || this.shouldRepaint() === false) return;

    if (this._forceFullRepaint) {
      this._forceFullRepaint = false;
      this.clearDirtyState();
      this._fullRepaint();
      this.finalDirtyRects = null;
      this.isRenderDirtyMode = false;
      return;
    }

    const hasDirty = this.dirtyNodes.size > 0 || this.paintDirtyNodes.size > 0;
    if (this.enableDirtyRect && hasDirty) {
      this.isRenderDirtyMode = true;

      const m = this.root.getViewPointMtrix();
      const dpr = this.root.dpr;
      const padding = Math.ceil(2 + (m.a < 1 ? 1 / m.a : 0)) * dpr;
      const canvasW = this.width * dpr;
      const canvasH = this.height * dpr;
      const { GRID_COLS, GRID_ROWS, FULL_REPAINT_RATIO } = Layer;
      const cellW = canvasW / GRID_COLS;
      const cellH = canvasH / GRID_ROWS;
      const threshold = canvasW * canvasH * FULL_REPAINT_RATIO;

      resetBuckets(this._buckets);

      let totalArea = 0;
      let earlyOut = false;

      const addNodeDirtyRect = (node: Element) => {
        const screen = worldRectToScreen(
          node.getDirtyRect(),
          m.a,
          m.d,
          m.e,
          m.f,
          dpr,
          padding
        );
        totalArea += distributeToGrid(
          this._buckets,
          screen,
          GRID_COLS,
          GRID_ROWS,
          cellW,
          cellH
        );
        if (totalArea > threshold) earlyOut = true;
      };

      for (const node of this.dirtyNodes) {
        addNodeDirtyRect(node);
        if (earlyOut) break;
      }
      if (!earlyOut) {
        for (const node of this.paintDirtyNodes) {
          addNodeDirtyRect(node);
          if (earlyOut) break;
        }
      }

      if (earlyOut) {
        this.isRenderDirtyMode = false;
        this.clearDirtyState();
        this._fullRepaint();
        this._flashRects(
          [{ left: 0, top: 0, width: canvasW, height: canvasH }],
          "rgba(0, 100, 255, 0.2)"
        );
      } else {
        const screenRects = collectActiveBuckets(this._buckets);

        if (screenRects.length === 0) {
          this.clearDirtyState();
          this.isRenderDirtyMode = false;
          return;
        }

        this.finalDirtyRects = screenToWorldRects(
          screenRects,
          m.a,
          m.d,
          m.e,
          m.f,
          dpr
        );
        this._paintDirtyRects(screenRects);
        this._flashRects(
          screenRects,
          "rgba(255, 0, 0, 0.25)",
          this.finalDirtyRects!
        );
        this.clearDirtyState();
      }
    } else {
      this._fullRepaint();
    }

    this.finalDirtyRects = null;
    this.isRenderDirtyMode = false;
  }

  paint(ctx = this.ctx) {
    ctx.save();
    this.applyTransformToCtx(ctx);
    this.paintChildren(ctx);
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

function worldRectToScreen(
  rect: RectPoint,
  ma: number,
  md: number,
  me: number,
  mf: number,
  dpr: number,
  padding: number
): ScreenBounds {
  return {
    left: Math.floor((rect.left * ma + me) * dpr) - padding,
    top: Math.floor((rect.top * md + mf) * dpr) - padding,
    right: Math.ceil(((rect.left + rect.width) * ma + me) * dpr) + padding,
    bottom: Math.ceil(((rect.top + rect.height) * md + mf) * dpr) + padding
  };
}

function mergeToBucket(bucket: RectPoint, s: ScreenBounds): number {
  const oldArea = bucket.left === Infinity ? 0 : bucket.width * bucket.height;
  const bRight =
    bucket.left === Infinity ? -Infinity : bucket.left + bucket.width;
  const bBottom =
    bucket.top === Infinity ? -Infinity : bucket.top + bucket.height;
  bucket.left = Math.min(bucket.left, s.left);
  bucket.top = Math.min(bucket.top, s.top);
  bucket.width = Math.max(bRight, s.right) - bucket.left;
  bucket.height = Math.max(bBottom, s.bottom) - bucket.top;
  return bucket.width * bucket.height - oldArea;
}

function distributeToGrid(
  buckets: RectPoint[],
  s: ScreenBounds,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number
): number {
  const c0 = Math.max(0, Math.floor(s.left / cellW));
  const c1 = Math.min(cols - 1, Math.floor(s.right / cellW));
  const r0 = Math.max(0, Math.floor(s.top / cellH));
  const r1 = Math.min(rows - 1, Math.floor(s.bottom / cellH));
  let delta = 0;
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const clipped: ScreenBounds = {
        left: Math.floor(Math.max(s.left, c * cellW)),
        top: Math.floor(Math.max(s.top, r * cellH)),
        right: Math.ceil(Math.min(s.right, (c + 1) * cellW)),
        bottom: Math.ceil(Math.min(s.bottom, (r + 1) * cellH))
      };
      delta += mergeToBucket(buckets[r * cols + c], clipped);
    }
  return delta;
}

function collectActiveBuckets(buckets: RectPoint[]): RectPoint[] {
  const out: RectPoint[] = [];
  for (const b of buckets)
    if (b.left !== Infinity && b.width > 0 && b.height > 0) out.push(b);
  return out;
}

function screenToWorldRects(
  rects: RectPoint[],
  ma: number,
  md: number,
  me: number,
  mf: number,
  dpr: number
): RectPoint[] {
  return rects.map((r) => ({
    left: (r.left / dpr - me) / ma,
    top: (r.top / dpr - mf) / md,
    width: r.width / dpr / ma,
    height: r.height / dpr / md
  }));
}

function resetBuckets(buckets: RectPoint[]) {
  for (const b of buckets) {
    b.left = Infinity;
    b.top = Infinity;
    b.width = 0;
    b.height = 0;
  }
}

function updateNodeItem(node: Element) {
  if (node.width === undefined || node.height === undefined) {
    node.rbushItem = null;
    return;
  }
  const { left, top, width, height } = node.getBoundingRect();
  if (!node.rbushItem) {
    node.rbushItem = {
      minX: left,
      minY: top,
      maxX: left + width,
      maxY: top + height,
      element: node
    };
  } else {
    node.rbushItem.minX = left;
    node.rbushItem.minY = top;
    node.rbushItem.maxX = left + width;
    node.rbushItem.maxY = top + height;
  }
}
