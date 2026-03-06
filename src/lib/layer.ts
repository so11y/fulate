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
  isRenderDitryMode = false;

  private pendingSyncNodes = new Set<Element>();
  private syncTimeout: number | null = null;

  constructor(
    options?: BaseElementOption & {
      zIndex?: number;
      silen?: boolean;
      //如果开启了脏矩形 注意以下情况
      //1. 如果父元素的包围盒没有包含子元素，但是子元素修改了是会被认为脏的，会让子在重新渲染
      //2. 如果父是脏的需要重新渲染，但是包围盒没有包含子元素，rBush里是的清理范围不够，所以子不会渲染
      //3. 如果是同一layer，可以将layer dirtyNodes 清空，然后在执行渲染，相当于全量渲染，避免了上面两种情况的困扰
      enableDirtyRect?: boolean;
    }
  ) {
    super(options);
    this.enableDirtyRect = options?.enableDirtyRect ?? true;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
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
    this.root?.scheduleLayerRender(this);
  }

  notInDitry() {
    const rootLayer = this.inject("layer-root");
    //这里到时候在 super.paint中考虑 如果父节点循环的时候判断
    //layer是不是已经在root的ditrylaery中，如果在跳过
    if (this.enableDirtyRect && rootLayer.isRenderDitryMode) {
      if (rootLayer !== this || this.dirtyNodes.size === 0) {
        return true;
      }
    }
    return false;
  }

  flushUpdate() {
    this.updateTransform(false);
  }

  flushPaint() {
    this.paint();
  }

  paint() {
    if (this.notInDitry()) {
      return;
    }

    if (this.enableDirtyRect && this.dirtyNodes.size > 0) {
      this.isRenderDitryMode = true;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      this.dirtyNodes.forEach((node) => {
        const rect = node.getDirtyRect();

        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.left + rect.width);
        maxY = Math.max(maxY, rect.top + rect.height);
      });

      const m = this.root.getViewPointMtrix();

      const dpr = window.devicePixelRatio || 1;

      let screenMinX = (minX * m.a + m.e) * dpr;
      let screenMinY = (minY * m.d + m.f) * dpr;
      let screenMaxX = (maxX * m.a + m.e) * dpr;
      let screenMaxY = (maxY * m.d + m.f) * dpr;

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
      this.clear();
      super.paint(this.ctx);
    }

    this.finalDirtyRect = null as any;

    this.isRenderDitryMode = false;
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.width * dpr, this.height * dpr);
    this.ctx.restore();
  }
}
