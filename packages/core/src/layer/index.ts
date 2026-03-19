import { BaseElementOption, Element } from "@fulate/core";
import type { RBushItem } from "@fulate/core";
import RBush from "rbush";
import { RectWithCenter, RectPoint } from "@fulate/util";
import { Point } from "@fulate/util";
import { Group } from "@tweenjs/tween.js";
import { DirtyGrid } from "./dirty-grid";

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
  private static FULL_REPAINT_RATIO = 0.5;
  private static RBUSH_REBUILD_RATIO = 0.3;

  private _dirtyGrid = new DirtyGrid();

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
        updateRbushItem(node);
        if (node.rbushItem) this.rbush.insert(node.rbushItem);
      }
    } else {
      for (const node of pending) updateRbushItem(node);

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
    const m = this.root.getViewPointMtrix();
    //因为有去整，这里对去整进行补偿，才不会多clear白边出来
    const queryPad = 1 / (m.a * this.root.dpr);
    for (const wr of this.finalDirtyRects!) {
      const padded = {
        left: wr.left - queryPad,
        top: wr.top - queryPad,
        width: wr.width + queryPad * 2,
        height: wr.height + queryPad * 2
      };
      const hits = this.searchAreaElements(padded);
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

    if (this.root?._isCssTransforming && this.cssTransformable) {
      return;
    }

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
      const worldPad = 2 / m.a;

      const worldRects: RectPoint[] = [];
      const addPadded = (node: Element) => {
        const r = node.getDirtyRect();
        worldRects.push({
          left: r.left - worldPad,
          top: r.top - worldPad,
          width: r.width + worldPad * 2,
          height: r.height + worldPad * 2
        });
      };
      for (const node of this.dirtyNodes) addPadded(node);
      for (const node of this.paintDirtyNodes) addPadded(node);

      const visibleWorldW = this.width / m.a;
      const visibleWorldH = this.height / m.d;
      const visibleArea = visibleWorldW * visibleWorldH;

      const { rects: mergedWorldRects } = this._dirtyGrid.merge(
        worldRects,
        visibleArea,
        Layer.FULL_REPAINT_RATIO
      );

      if (!mergedWorldRects) {
        this.isRenderDirtyMode = false;
        this.clearDirtyState();
        this._fullRepaint();
        this._flashFullRepaint();
      } else if (mergedWorldRects.length === 0) {
        this.clearDirtyState();
        this.isRenderDirtyMode = false;
        return;
      } else {
        this.finalDirtyRects = mergedWorldRects;
        const screenRects = this._worldToScreenRects(mergedWorldRects);
        this._paintDirtyRects(screenRects);
        this._flashRects(
          screenRects,
          "rgba(255, 0, 0, 0.25)",
          mergedWorldRects
        );
        this.clearDirtyState();
      }
    } else {
      this._fullRepaint();
    }

    this.finalDirtyRects = null;
    this.isRenderDirtyMode = false;
  }

  private _worldToScreenRects(worldRects: RectPoint[]): RectPoint[] {
    const m = this.root.getViewPointMtrix();
    const dpr = this.root.dpr;
    return worldRects.map((r) => {
      const sl = Math.floor((r.left * m.a + m.e) * dpr);
      const st = Math.floor((r.top * m.d + m.f) * dpr);
      const sr = Math.ceil(((r.left + r.width) * m.a + m.e) * dpr);
      const sb = Math.ceil(((r.top + r.height) * m.d + m.f) * dpr);
      return { left: sl, top: st, width: sr - sl, height: sb - st };
    });
  }

  private _flashFullRepaint() {
    const canvasW = this.width * this.root.dpr;
    const canvasH = this.height * this.root.dpr;
    this._flashRects(
      [{ left: 0, top: 0, width: canvasW, height: canvasH }],
      "rgba(0, 100, 255, 0.2)"
    );
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

function updateRbushItem(node: Element) {
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
