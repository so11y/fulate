import { BaseElementOption, Element } from "./node/element";
import RBush from "rbush";
import { Rectangle } from "./ui/rectangle";

export interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: Element;
}

export class Layer extends  Rectangle{
  type = "layer";
  canvasEl: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;
  rbush = new RBush<RBushItem>();

  private isRender: boolean = false;
  private renderResolve: (() => void) | null = null;
  private renderPromise: Promise<void> | null = null;

  private pendingSyncNodes = new Set<Element>();
  private syncTimeout: number | null = null;

  constructor(
    options?: BaseElementOption & { zIndex?: number; silen?: boolean }
  ) {
    super(options);
    this.zIndex = options?.zIndex ?? 1;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
    this.layer = this;
    this.isRender = false;
  }

  get _width() {
    return this.width ?? this.root.width!;
  }

  get _height() {
    return this.height ?? this.root.height!;
  }

  mounted() {
    super.mounted();
    const root = this.root!;
    this.canvasEl.width = this._width;
    this.canvasEl.height = this._height;
    this.canvasEl.style.width = this._width + "px";
    this.canvasEl.style.height = this._height! + "px";
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
      this.clear();
      super.paint(this.ctx);
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
    this.ctx.clearRect(0, 0, this._width!, this._height!);
  }
}
