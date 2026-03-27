import { Point } from "@fulate/util";
import { FulateEvent } from "../event";
import { Transformable, TransformableOptions } from "./transformable";
import { Tween, Easing } from "@tweenjs/tween.js";
import { parseColor, formatColor } from "@fulate/util";
import { qrDecompose } from "@fulate/util";
import {
  resolveAnchors,
  syncAnchorIndicators,
  serializeAnchors,
  buildAnchorIdMap
} from "../utils/anchor";
import type { AnchorPointData } from "../utils/anchor";

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
  enableDiveIn?: boolean;
  immediatelyDraggable?: boolean;
  anchorMultiLine?: boolean;

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
  enableDiveIn?: boolean;
  immediatelyDraggable?: boolean;
  /** 默认锚点是否允许多线连接，默认 false（单线） */
  anchorMultiLine?: boolean;
  groupParent?: any;
  /** IDs of lines that have an anchor point connected to this element */
  connectedLines?: Set<string>;
  /** User-configured anchor point data (edge + label). */
  private _anchors: AnchorPointData[] | null = null;
  private _anchorIndicators: Map<string, Element> | null = null;

  get anchors(): AnchorPointData[] | null {
    return this._anchors;
  }
  set anchors(value: AnchorPointData[] | null) {
    const oldIds = this._anchors ? new Set(buildAnchorIdMap(this._anchors).keys()) : new Set<string>();
    this._anchors = value;
    const newIds = value ? new Set(buildAnchorIdMap(value).keys()) : new Set<string>();

    if (this.isActiveed && this.connectedLines) {
      for (const removedId of oldIds) {
        if (newIds.has(removedId)) continue;
        for (const lineId of [...this.connectedLines]) {
          const line = this.root?.idElements.get(lineId) as any;
          if (!line?.linePoints) continue;
          for (const p of line.linePoints) {
            if (
              p.anchor?.elementId === this.id &&
              p.anchor?.anchorType === removedId
            ) {
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

  getCascadeDeleteElements(): Element[] {
    return [];
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
    if (this._anchors?.length) return resolveAnchors(this._anchors);
    return null;
  }

  _syncAnchorIndicators() {
    this._anchorIndicators = syncAnchorIndicators(
      this,
      this._anchors,
      this._anchorIndicators,
      Element._createAnchorIndicator
    );
  }

  static _createAnchorIndicator: (data: AnchorPointData, anchorId: string) => Element = (
    data, anchorId
  ) => {
    const el = new Element({ width: 8, height: 8, visible: true });
    el.id = `__anchor_${anchorId}`;
    el.selectctbale = false;
    el.enableMove = false;
    el.enableResize = false;
    el.enableAnchor = false;
    el.silent = true;
    el.pickable = false;
    (el as any).edge = data.edge;
    if (data.labelWidth != null) (el as any).labelWidth = data.labelWidth;
    if (data.labelStyle != null) (el as any).labelStyle = data.labelStyle;
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
    const worldCenter = new Point(
      localCenter.matrixTransform(groupWorldMatrix)
    );
    this.applyTransformMatrix(targetMatrix, worldCenter);
  }

  applyTransformMatrix(
    targetMatrix: DOMMatrix,
    worldCenter: Point,
    snap?: { width: number; height: number; scaleX: number; scaleY: number }
  ): void {
    const s = snap ?? this._groupSnapshot;
    if (!s) return;

    const { angle, scaleX, scaleY, skewX } = qrDecompose(targetMatrix);

    const ratioX = Math.abs(scaleX) / Math.abs(s.scaleX);
    const ratioY = Math.abs(scaleY) / Math.abs(s.scaleY);
    const newWidth = s.width * ratioX;
    const newHeight = s.height * ratioY;

    this.width = newWidth;
    this.height = newHeight;

    const pos = this.getPositionByOrigin(worldCenter);

    this.setOptions({
      angle,
      width: newWidth,
      height: newHeight,
      scaleX: Math.sign(scaleX) * Math.abs(s.scaleX),
      scaleY: Math.sign(scaleY) * Math.abs(s.scaleY),
      skewX,
      left: pos.x,
      top: pos.y
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

    const { left: viewLeft, top: viewTop, width: vw, height: vh } = root.viewport.getWorldRect();

    const m = this._ownMatrixCache;
    let inRootViewport: boolean;

    if (m.b === 0 && m.c === 0) {
      const w = this.width * Math.abs(m.a);
      const h = this.height * Math.abs(m.d);
      const left = m.a >= 0 ? m.e : m.e - w;
      const top = m.d >= 0 ? m.f : m.f - h;

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
    const json = { type: this.type, id: this.id } as any;

    if (this.left !== 0) json.left = this.left;
    if (this.top !== 0) json.top = this.top;
    if (this.width !== undefined) json.width = this.width;
    if (this.height !== undefined) json.height = this.height;
    if (this.angle !== 0) json.angle = this.angle;
    if (this.scaleX !== 1) json.scaleX = this.scaleX;
    if (this.scaleY !== 1) json.scaleY = this.scaleY;
    if (this.skewX !== 0) json.skewX = this.skewX;
    if (this.skewY !== 0) json.skewY = this.skewY;
    if (this.originX !== "center") json.originX = this.originX;
    if (this.originY !== "center") json.originY = this.originY;
    if (this.visible !== true) json.visible = this.visible;
    if (this.cursor !== undefined) json.cursor = this.cursor;
    if (this.selectctbale !== undefined) json.selectctbale = this.selectctbale;
    if (this.silent !== false) json.silent = this.silent;
    if (this.pickable !== true) json.pickable = this.pickable;
    if (this.enableRotation !== undefined)
      json.enableRotation = this.enableRotation;
    if (this.enableMove !== undefined) json.enableMove = this.enableMove;
    if (this.enableResize !== undefined) json.enableResize = this.enableResize;
    if (this.enableAnchor !== undefined) json.enableAnchor = this.enableAnchor;
    if (this.anchorMultiLine !== undefined)
      json.anchorMultiLine = this.anchorMultiLine;

    if (this._anchors?.length) {
      json.anchors = serializeAnchors(this._anchors);
    }

    if (includeChildren && this.children && this.children.length > 0) {
      json.children = this.children
        .filter((c) => (c as any).type !== "anchor-indicator")
        .map((c) => c.toJson(true)) as any;
    }

    return json;
  }
}
