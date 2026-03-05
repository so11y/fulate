import { BaseElementOption, Element } from "./node/element";
import RBush from "rbush";
import { Rectangle } from "./ui/rectangle";
import { RectWithCenter, RectPoint } from "./node/transformable";
import { Point } from "../util/point";

export interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: Element;
}

export class Layer extends Rectangle {
  type = "layer";
  canvasEl: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;
  enableDirtyRect: boolean = true;
  breakDirtyRectCheck = true;
  rbush = new RBush<RBushItem>();

  finalDirtyRect: RectPoint;

  dirtyNodes = new Set<Element>();

  isLayer = true;
  isRender: boolean = false;
  isRenderDitryMode = false;
  private renderResolve: (() => void) | null = null;
  _renderPromise: Promise<void> | null = null;

  private pendingSyncNodes = new Set<Element>();
  private syncTimeout: number | null = null;

  constructor(
    options?: BaseElementOption & {
      zIndex?: number;
      silen?: boolean;
      enableDirtyRect?: boolean;
    }
  ) {
    super(options);
    this.enableDirtyRect = options?.enableDirtyRect ?? true;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
    this.isRender = false;
  }

  mounted() {
    if (!this.inject("layer-root")) {
      this.provide("layer-root", this);
    }
    this.provide("layer", this);
    super.mounted();
    const root = this.root!;
    const width = this.width ?? this.root.width!;
    const height = this.height ?? this.root.height!;

    this.width = width;
    this.height = height;

    const dpr = window.devicePixelRatio || 1;
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
    if (this.syncTimeout === null) {
      this.syncTimeout = requestAnimationFrame(() => {
        this.flushSyncNodes();
        this.syncTimeout = null;
      }) as any;
    }
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
    if (this.isRender) return this._renderPromise;
    this.isRender = true;

    if (!this._renderPromise) {
      this._renderPromise = new Promise<void>((resolve) => {
        this.renderResolve = resolve;
      });
    }

    requestAnimationFrame(() => {
      this.updateTransform(false);

      if (this.enableDirtyRect && this.dirtyNodes.size > 0) {
        this.isRenderDitryMode = true;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.dirtyNodes.forEach((node) => {
          // getDirtyRect 应该返回该节点：上一次的包围盒 + 这一次的包围盒 的合并矩形
          const rect = node.getDirtyRect();

          minX = Math.min(minX, rect.left);
          minY = Math.min(minY, rect.top);
          maxX = Math.max(maxX, rect.left + rect.width);
          maxY = Math.max(maxY, rect.top + rect.height);
        });

        const m = this.root.getViewPointMtrix();

        const dpr = window.devicePixelRatio || 1;

        // 转换为屏幕坐标，并立即乘以 DPR 得到物理坐标
        let screenMinX = (minX * m.a + m.e) * dpr;
        let screenMinY = (minY * m.d + m.f) * dpr;
        let screenMaxX = (maxX * m.a + m.e) * dpr;
        let screenMaxY = (maxY * m.d + m.f) * dpr;

        // 增加一点 padding 防止抗锯齿残留边缘，并对齐到物理像素
        const padding = Math.ceil(2 + (m.a < 1 ? 1 / m.a : 0)) * dpr;
        screenMinX = Math.floor(screenMinX) - padding;
        screenMinY = Math.floor(screenMinY) - padding;
        screenMaxX = Math.ceil(screenMaxX) + padding;
        screenMaxY = Math.ceil(screenMaxY) + padding;

        const screenWidth = screenMaxX - screenMinX;
        const screenHeight = screenMaxY - screenMinY;

        this.finalDirtyRect = {
          left: (screenMinX / dpr - m.e) / m.a,
          top: (screenMinY / dpr - m.f) / m.d,
          width: screenWidth / dpr / m.a,
          height: screenHeight / dpr / m.d
        };

        if (screenWidth > 0 && screenHeight > 0) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(screenMinX, screenMinY, screenWidth, screenHeight);
          this.ctx.clip();
          this.ctx.clearRect(screenMinX, screenMinY, screenWidth, screenHeight);
          super.paint(this.ctx);
          this.ctx.restore();
        }

        this.dirtyNodes.clear();
      } else {
        // Fallback or initial render (全量重绘)
        this.clear();

        // 全量重绘不需要传脏矩形
        super.paint(this.ctx);
      }

      this.finalDirtyRect = null as any;

      this.isRender = false;
      this.isRenderDitryMode = false;
      this.renderResolve?.();
      this._renderPromise = null;
      this.renderResolve = null;
    });
    return this._renderPromise;
  }

  nextTick(fn: () => void): void {
    if (this._renderPromise) {
      this._renderPromise.then(fn);
    } else {
      setTimeout(fn, 0);
    }
  }

  notInDitry() {
    const rootLayer = this.inject("layer-root");
    if (this.enableDirtyRect && rootLayer.isRenderDitryMode) {
      if (rootLayer !== this || this.dirtyNodes.size === 0) {
        return true;
      }
    }
    return false;
  }

  paint() {
    if (this.notInDitry()) {
      return;
    }
    this.requestRender();
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.width * dpr, this.height * dpr);
    this.ctx.restore();
  }
}
