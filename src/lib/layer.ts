import { BaseElementOption, Element } from "./node/element";
import RBush from "rbush";
import { Rectangle } from "./ui/rectangle";
import { Rect, RectPoint } from "./node/transformable";

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
  rbush = new RBush<RBushItem>();

  finalDirtyRect: RectPoint;

  private dirtyNodes = new Set<Element>();

  private isRender: boolean = false;
  private renderResolve: (() => void) | null = null;
  private renderPromise: Promise<void> | null = null;

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
    this.zIndex = options?.zIndex ?? 1;
    this.enableDirtyRect = options?.enableDirtyRect ?? true;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
    this.layer = this;
    this.isRender = false;
  }

  mounted() {
    super.mounted();
    const root = this.root!;
    const width = this.width ?? this.root.width!;
    const height = this.height ?? this.root.height!;

    this.width = width;
    this.height = height;
    this.canvasEl.width = this.width;
    this.canvasEl.height = this.height;
    this.canvasEl.style.width = this.width + "px";
    this.canvasEl.style.height = this.height + "px";
    this.canvasEl.style.position = "absolute";
    this.canvasEl.style.left = "0px";
    this.canvasEl.style.top = "0px";
    this.canvasEl.style.zIndex = this.zIndex.toString();
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

  syncNode(node: Element) {
    if (node.type === "layer" || node.type === "root") return;
    this.pendingSyncNodes.add(node);
    if (this.syncTimeout === null) {
      this.syncTimeout = requestAnimationFrame(() => {
        this.flushSyncNodes();
        this.syncTimeout = null;
      }) as any;
    }
  }

  searchHitElements(x: number, y: number): Element[] {
    const hits = this.rbush.search({ minX: x, minY: y, maxX: x, maxY: y });
    return hits.map((h) => h.element);
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
    if (this.isRender) return;
    this.isRender = true;

    if (!this.renderPromise) {
      this.renderPromise = new Promise<void>((resolve) => {
        this.renderResolve = resolve;
      });
    }

    requestAnimationFrame(() => {
      this.updateTransform(false);

      if (this.enableDirtyRect && this.dirtyNodes.size > 0) {
        // 1. 仅仅只计算“真正发生变化”的节点的旧/新包围盒的合并集合
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

        // 增加一点 padding 防止抗锯齿残留边缘
        const padding = 2;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const dirtyWidth = maxX - minX;
        const dirtyHeight = maxY - minY;

        this.finalDirtyRect = {
          left: minX,
          top: minY,
          width: dirtyWidth,
          height: dirtyHeight
        };

        if (dirtyWidth > 0 && dirtyHeight > 0) {
          this.ctx.save();

          // 2. 应用视口变换
          // 必须应用视口变换，因为 minX/minY 是世界坐标
          this.ctx.setTransform(this.root.getViewPointMtrix());

          this.ctx.beginPath();
          this.ctx.rect(minX, minY, dirtyWidth, dirtyHeight);
          this.ctx.clip();

          this.ctx.clearRect(minX, minY, dirtyWidth, dirtyHeight);

          super.paint(this.ctx);

          this.ctx.restore();
        }

        // 5. 重置 dirty 状态
        this.dirtyNodes.forEach((node) => {
          node.lastBoundingRect = null;
          node.isDirty = false;
        });
        this.dirtyNodes.clear();
      } else {
        // Fallback or initial render (全量重绘)
        this.clear();
        // 全量重绘不需要传脏矩形
        super.paint(this.ctx);
      }

      this.isRender = false;
      this.renderResolve?.();
      this.renderPromise = null;
      this.renderResolve = null;
    });
  }

  nextTick(fn: () => void): void {
    if (this.renderPromise) {
      this.renderPromise.then(fn);
    } else {
      fn();
    }
  }

  paint() {
    this.requestRender();
  }

  clear() {
    // this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
