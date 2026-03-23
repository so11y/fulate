import { Point } from "@fulate/util";
import { FulateEvent } from "../event";
import { Transformable, TransformableOptions } from "./transformable";
import { Tween, Easing } from "@tweenjs/tween.js";
import { parseColor, formatColor } from "@fulate/util";
import { qrDecompose } from "@fulate/util";

export interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: Element;
}

export interface BaseElementOption<T = Element> extends TransformableOptions {
  key?: string;
  cursor?: string;
  visible?: boolean;
  selectctbale?: boolean;
  silent?: boolean;
  pickable?: boolean;

  enableRotation?: boolean;
  enableMove?: boolean;
  enableResize?: boolean;
  enableAnchor?: boolean;

  onclick?: (this: T, e: FulateEvent<T>) => any;
  onpointermove?: (this: T, e: FulateEvent<T>) => any;
  onpointerdown?: (this: T, e: FulateEvent<T>) => any;
  onpointerup?: (this: T, e: FulateEvent<T>) => any;

  children?: Array<Element>;
}

export const EVENT_KEYS = [
  "onclick",
  "onpointerdown",
  "onpointermove",
  "onpointerup"
];

export interface AnimateOptions<T = any> {
  duration?: number;
  easing?: (amount: number) => number;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  paintOnly?: boolean;
  onComplete?: (v: T) => void;
  onUpdate?: (v: T) => void;
}

export class Element extends Transformable {
  type = "element";

  rbushItem: RBushItem | null = null;
  cursor?: string;
  visible: boolean = true;
  selectctbale?: boolean;
  enableRotation?: boolean;
  enableMove?: boolean;
  enableResize?: boolean;
  enableAnchor?: boolean;
  groupParent?: any;
  /** IDs of lines that have an anchor point connected to this element */
  connectedLines?: Set<string>;
  /** User-configured anchor point data (edge + label). */
  private _anchors: any[] | null = null;
  private _anchorIndicators: Map<string, Element> | null = null;

  get anchors(): any[] | null { return this._anchors; }
  set anchors(value: any[] | null) {
    const oldIds = new Set(this._anchors?.map((a: any) => a.id) ?? []);
    this._anchors = value;
    const newIds = new Set(value?.map((a: any) => a.id) ?? []);

    if (this.isActiveed && this.connectedLines) {
      for (const removedId of oldIds) {
        if (newIds.has(removedId)) continue;
        for (const lineId of [...this.connectedLines]) {
          const line = this.root?.idElements.get(lineId) as any;
          if (!line?.linePoints) continue;
          for (const p of line.linePoints) {
            if (p.anchor?.elementId === this.id && p.anchor?.anchorType === removedId) {
              p.anchor = undefined;
            }
          }
          line.markNeedsLayout?.();
        }
      }
    }

    if (this.isActiveed) this._syncAnchorIndicators();
  }

  private _groupSnapshot: {
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
  } | null = null;
  private _activeTweens?: Set<Tween<Element>>;
  declare children: this[];
  declare parent: this;
  private _initProps: any = null;

  constructor(options?: BaseElementOption) {
    super();
    if (options) {
      const { children, ...props } = options;
      this._initProps = props;
      if (children) this.children = children as any;
    }
  }

  mounted() {
    if (this._initProps) {
      this.attrs(this._initProps);
      this._initProps = null;
    }
    super.mounted();
    if (this._anchors?.length) this._syncAnchorIndicators();
  }

  deactivate() {
    if (!this.shouldFastDeactivate()) {
      for (const lineId of [...(this.connectedLines ?? [])]) {
        const line = this.root?.idElements.get(lineId) as any;
        if (!line?.linePoints) continue;

        for (const p of line.linePoints) {
          if (p.anchor?.elementId === this.id) {
            p.anchor = undefined;
          }
        }

        const hasRemainingAnchor = line.linePoints.some((p: any) => p.anchor);
        if (!hasRemainingAnchor) {
          line.parent?.removeChild(line);
        } else {
          line.markNeedsLayout();
        }
      }
    }

    super.deactivate();
  }

  getAffectedElements(): Element[] {
    if (!this.connectedLines) return [];
    const result: Element[] = [];
    for (const lineId of this.connectedLines) {
      const line = this.root?.idElements.get(lineId);
      if (line) result.push(line);
    }
    return result;
  }

  attrs(options: any): void {
    if (options.width !== undefined) this._hasExplicitWidth = true;
    if (options.height !== undefined) this._hasExplicitHeight = true;

    if (options.anchors !== undefined) {
      this._anchors = options.anchors;
      delete options.anchors;
      if (this.isActiveed) this._syncAnchorIndicators();
    }

    EVENT_KEYS.forEach((v) => {
      if (options[v]) {
        this.addEventListener(v.slice(2), options[v]);
      }
    });

    Object.assign(this, options);
  }

  getDirtyRect() {
    if (!this._ownMatrixCache) {
      return (
        this._lastBoundingRect ?? {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          centerX: 0,
          centerY: 0
        }
      );
    }
    const current = this.getBoundingRect();
    if (!this._lastBoundingRect) return current;

    const minX = Math.min(current.left, this._lastBoundingRect.left);
    const minY = Math.min(current.top, this._lastBoundingRect.top);
    const maxX = Math.max(
      current.left + current.width,
      this._lastBoundingRect.left + this._lastBoundingRect.width
    );
    const maxY = Math.max(
      current.top + current.height,
      this._lastBoundingRect.top + this._lastBoundingRect.height
    );

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (!this.visible) return;
    this.paintChildren(ctx);
  }

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    const coords = this.getCoords();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    ctx.restore();
  }

  protected paintChildren(ctx: CanvasRenderingContext2D) {
    if (!this.children) return;
    const visitSet = this.layer?._dirtyVisitSet;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (
        (child as any).isLayer &&
        this.root?._pendingLayers.has(child as any)
      ) {
        continue;
      }
      if (visitSet && !visitSet.has(child)) continue;
      if (child.hasInView()) {
        child.paint(ctx);
      }
    }
  }

  /** Override to provide custom control points for selection. */
  getControlSchema(): any {
    return null;
  }

  /**
   * Override to provide custom anchor points for snapping and line connections.
   * Returns null to use DEFAULT_ANCHOR_SCHEMA.
   */
  getAnchorSchema(): any[] | null {
    if (this.enableAnchor === false) return [];
    if (this._anchors?.length) return this._resolveAnchors(this._anchors);
    return null;
  }

  private _resolveAnchors(data: any[]): any[] {
    const groups = new Map<string, any[]>();
    for (const d of data) {
      let list = groups.get(d.edge);
      if (!list) { list = []; groups.set(d.edge, list); }
      list.push(d);
    }
    const result: any[] = [];
    for (const [edge, items] of groups) {
      const total = items.length;
      items.forEach((item: any, i: number) => {
        const ratio = (i + 1) / (total + 1);
        result.push({
          id: item.id,
          localPosition: (el: any) => {
            switch (edge) {
              case "top":    return new Point(el.width * ratio, 0);
              case "bottom": return new Point(el.width * ratio, el.height);
              case "left":   return new Point(0, el.height * ratio);
              case "right":  return new Point(el.width, el.height * ratio);
              default:       return new Point(el.width * 0.5, el.height * 0.5);
            }
          }
        });
      });
    }
    return result;
  }

  _syncAnchorIndicators() {
    const data = this._anchors;

    if (!data?.length) {
      if (this._anchorIndicators) {
        for (const indicator of this._anchorIndicators.values()) {
          this.removeChild(indicator);
        }
        this._anchorIndicators = null;
      }
      return;
    }

    if (!this._anchorIndicators) this._anchorIndicators = new Map();
    const currentIds = new Set(data.map((a: any) => a.id));

    for (const [id, indicator] of this._anchorIndicators) {
      if (!currentIds.has(id)) {
        this.removeChild(indicator);
        this._anchorIndicators.delete(id);
      }
    }

    const groups = new Map<string, any[]>();
    for (const d of data) {
      let list = groups.get(d.edge);
      if (!list) { list = []; groups.set(d.edge, list); }
      list.push(d);
    }

    for (const d of data) {
      const sameEdge = groups.get(d.edge)!;
      const idx = sameEdge.indexOf(d);
      const ratio = (idx + 1) / (sameEdge.length + 1);

      let indicator = this._anchorIndicators.get(d.id);
      if (!indicator) {
        indicator = Element._createAnchorIndicator(d);
        this._anchorIndicators.set(d.id, indicator);
        this.append(indicator);
      } else {
        (indicator as any).anchorLabel = d.label;
        (indicator as any).edge = d.edge;
        if (d.labelWidth != null) (indicator as any).labelWidth = d.labelWidth;
      }

      (indicator as any).anchorRatio = ratio;
      indicator.markNeedsLayout();
    }
  }

  static _createAnchorIndicator: (data: any) => Element = (data) => {
    const el = new Element({ width: 8, height: 8, visible: true });
    el.id = `__anchor_${data.id}`;
    el.selectctbale = false;
    el.enableMove = false;
    el.enableResize = false;
    el.enableAnchor = false;
    el.silent = true;
    el.pickable = false;
    (el as any).edge = data.edge;
    return el;
  };

  snapshotForGroup(): void {
    this._groupSnapshot = {
      width: this.width,
      height: this.height,
      scaleX: this.scaleX,
      scaleY: this.scaleY
    };
  }

  applyGroupTransform(
    targetMatrix: DOMMatrix,
    localCenter: Point,
    groupWorldMatrix: DOMMatrix
  ): void {
    const snap = this._groupSnapshot;
    if (!snap) return;

    const { angle, scaleX, scaleY, skewX } = qrDecompose(targetMatrix);
    const oldWidth = this.width;
    const oldHeight = this.height;

    const ratioX = Math.abs(scaleX) / Math.abs(snap.scaleX);
    const ratioY = Math.abs(scaleY) / Math.abs(snap.scaleY);
    const newWidth = snap.width * ratioX;
    const newHeight = snap.height * ratioY;

    this.width = newWidth;
    this.height = newHeight;

    const worldCenter = localCenter.matrixTransform(groupWorldMatrix);
    const pos = this.getPositionByOrigin(worldCenter);

    this.setOptions({
      angle,
      width: newWidth,
      height: newHeight,
      scaleX: Math.sign(scaleX) * Math.abs(snap.scaleX),
      scaleY: Math.sign(scaleY) * Math.abs(snap.scaleY),
      skewX,
      left: pos.x,
      top: pos.y
    });

    if (this.children?.length && oldWidth && oldHeight) {
      const rx = newWidth / oldWidth;
      const ry = newHeight / oldHeight;
      for (const child of this.children) {
        child.onParentResize(rx, ry);
      }
    }
  }

  onParentResize(rx: number, ry: number) {
    this.setOptions({
      width: this.width * rx,
      height: this.height * ry,
      left: this.left * rx,
      top: this.top * ry
    });
  }

  hasPointHint(point: Point): boolean {
    if (!this.visible) {
      return false;
    }
    return super.hasPointHint(point);
  }

  hasInView() {
    if (!this.visible || !this.width || !this.height) return false;
    if (!this.isActiveed) return false;

    const root = this.root;
    if (!root) return false;
    const { x: vx, y: vy, scale } = root.viewport;
    const vw = root.width / scale;
    const vh = root.height / scale;

    const viewLeft = -vx / scale;
    const viewTop = -vy / scale;

    const m = this._ownMatrixCache;
    let inRootViewport: boolean;

    if (m.b === 0 && m.c === 0) {
      const sx = m.a;
      const sy = m.d;
      const left = m.e;
      const top = m.f;
      const w = this.width * Math.abs(sx);
      const h = this.height * Math.abs(sy);

      inRootViewport =
        left + w > viewLeft &&
        left < viewLeft + vw &&
        top + h > viewTop &&
        top < viewTop + vh;
    } else {
      const { left, top, width, height } = this.getBoundingRect();

      inRootViewport =
        left + width > viewLeft &&
        left < viewLeft + vw &&
        top + height > viewTop &&
        top < viewTop + vh;
    }

    if (!inRootViewport) return false;

    const scrollContainer = this.inject("scrollContainer");
    if (scrollContainer && scrollContainer !== this) {
      return scrollContainer.isChildInScrollView(this);
    }

    return true;
  }

  /**
   * 设置选项（标记脏，延迟计算）
   * @param syncCalc 是否立即同步计算（用于需要立即获取坐标的场景）
   */
  setOptions(options?: BaseElementOption, syncCalc = false) {
    if (!options) return this;

    if (options.children && this.isActiveed) {
      this.children = options.children as any;
      this._afterMutate(this.children);
    }

    this.attrs(options);

    this.markNeedsLayout();

    if (syncCalc && this.isActiveed) {
      super.updateTransform(this.parent ? this.parent.isDirty : false);
    }

    return this;
  }

  setOptionsSync(options?: any) {
    return this.setOptions(options, true);
  }

  animate(
    to: Partial<
      TransformableOptions & { backgroundColor?: string; color?: string }
    >,
    options?: AnimateOptions<this>
  ): Promise<void> & { tween: Tween<any> } {
    const startState: any = {};
    const endState: any = {};

    for (const key in to) {
      const isColor = key.toLowerCase().includes("color");
      const targetValue = (to as any)[key];
      const currentValue = (this as any)[key];

      if (isColor) {
        startState[key] = parseColor(currentValue || "transparent");
        endState[key] = parseColor(targetValue || "transparent");
      } else {
        startState[key] = currentValue ?? 0;
        endState[key] = targetValue;
      }
    }

    const dirtyFn = options?.paintOnly
      ? () => this.markPaintDirty()
      : () => this.markNeedsLayout();

    const tween = new Tween(startState, this.layer.tweenGroup)
      .to(endState, options?.duration ?? 300)
      .onUpdate(() => {
        for (const key in to) {
          const isColor = key.toLowerCase().includes("color");
          (this as any)[key] = isColor
            ? formatColor(startState[key])
            : startState[key];
        }
        dirtyFn();
        if (options?.onUpdate) {
          options.onUpdate(this as any);
        }
      });

    if (options?.easing) tween.easing(options.easing);
    if (options?.delay) tween.delay(options.delay);
    if (options?.repeat != null) tween.repeat(options.repeat);
    if (options?.yoyo) tween.yoyo(true);

    (this._activeTweens ??= new Set()).add(tween);

    const cleanup = () => {
      this._activeTweens?.delete(tween);
    };

    const layer = this.layer;

    const promise = new Promise<void>((resolve) => {
      tween.onComplete(() => {
        cleanup();
        options?.onComplete?.(this);
        layer.tweenGroup.remove(tween);
        resolve();
      });
      tween.onStop(() => {
        cleanup();
        layer.tweenGroup.remove(tween);
        resolve();
      });
    }) as Promise<void> & { tween: Tween<any> };

    promise.tween = tween;

    tween.start();
    this.layer.requestRender();

    return promise;
  }

  stopAnimations() {
    if (!this._activeTweens) return;
    for (const tween of this._activeTweens) {
      tween.stop();
    }
    this._activeTweens.clear();
  }

  finishAnimations() {
    if (!this._activeTweens) return;
    for (const tween of this._activeTweens) {
      tween.end();
    }
  }

  pauseAnimations() {
    if (!this._activeTweens) return;
    for (const tween of this._activeTweens) {
      tween.pause();
    }
  }

  resumeAnimations() {
    if (!this._activeTweens) return;
    for (const tween of this._activeTweens) {
      tween.resume();
    }
    this.layer?.requestRender();
  }

  toJson(includeChildren = false): BaseElementOption {
    const json = {
      type: this.type,
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      angle: this.angle,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      skewX: this.skewX,
      skewY: this.skewY,
      originX: this.originX,
      originY: this.originY,
      visible: this.visible,
      cursor: this.cursor,
      selectctbale: this.selectctbale,
      silent: this.silent,
      pickable: this.pickable,
      enableRotation: this.enableRotation,
      enableMove: this.enableMove,
      enableResize: this.enableResize,
      enableAnchor: this.enableAnchor
    } as any;

    if (this._anchors?.length) {
      json.anchors = this._anchors.map((a: any) => ({ ...a }));
    }

    if (includeChildren && this.children && this.children.length > 0) {
      json.children = this.children
        .filter((c) => (c as any).type !== "anchor-indicator")
        .map((c) => c.toJson(true)) as any;
    }

    return json;
  }
}
