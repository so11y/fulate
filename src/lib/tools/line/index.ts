import { BaseElementOption, Element } from "../../node/element";
import { FulateEvent } from "../../../util/event";
import { Point } from "../../../util/point";
import {
  Line,
  LineAnchor,
  LinePointData,
  getElementAnchorPoints
} from "../../ui/line";
import { Node } from "../../node/node";

export class LineTool extends Element {
  type = "lineTool";
  key = "lineTool";
  silent = true;

  isDrawingMode = false;
  tempPoints: LinePointData[] = [];
  mousePos: { x: number; y: number } | null = null;
  nearestAnchor: {
    x: number;
    y: number;
    elementId: string;
    anchorType: string;
  } | null = null;

  private _anchorThreshold = 10;
  private _cleanups: Array<() => void> = [];

  constructor(options?: BaseElementOption) {
    super({ width: 0, height: 0, ...options });
  }

  get targetParent(): Node {
    const workspace = this.root.keyElmenet.get("workspace");
    if (workspace?.children?.length) {
      for (const child of workspace.children) {
        if ((child as any).type === "artboard") {
          if (child.children?.length) {
            for (const c of child.children) {
              if ((c as any).isLayer) return c;
            }
          }
          return child;
        }
      }
    }
    return workspace ?? this.root;
  }

  startDrawing() {
    this.isDrawingMode = true;
    this.tempPoints = [];
    this.mousePos = null;
    this.nearestAnchor = null;
    this.root.container.style.cursor = "crosshair";
    this.markDirty();
  }

  stopDrawing() {
    if (this.tempPoints.length >= 2) {
      this._createLine();
    }
    this.isDrawingMode = false;
    this.tempPoints = [];
    this.mousePos = null;
    this.nearestAnchor = null;
    this.root.container.style.cursor = "default";
    this.markDirty();
  }

  mounted() {
    super.mounted();
    this._setupEvents();
  }

  unmounted() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    super.unmounted();
  }

  private _setupEvents() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "l" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (!this.isDrawingMode) {
          const select = this.root.keyElmenet.get("select") as any;
          select?.select?.([]);
          this.startDrawing();
        }
        return;
      }
      if (e.key === "Escape" && this.isDrawingMode) {
        this.stopDrawing();
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    this._cleanups.push(() =>
      document.removeEventListener("keydown", onKeyDown)
    );

    const onPointerDown = (e: FulateEvent) => {
      if (!this.isDrawingMode) return;

      const x = e.detail.x;
      const y = e.detail.y;

      let pointData: LinePointData;
      if (this.nearestAnchor) {
        pointData = {
          x: this.nearestAnchor.x,
          y: this.nearestAnchor.y,
          anchor: {
            elementId: this.nearestAnchor.elementId,
            anchorType: this.nearestAnchor.anchorType
          }
        };
      } else {
        pointData = { x, y };
      }

      this.tempPoints.push(pointData);
      this.markDirty();

      if (this.nearestAnchor && this.tempPoints.length >= 2) {
        this.stopDrawing();
      }
    };

    this.root.addEventListener("pointerdown", onPointerDown);
    this._cleanups.push(() =>
      this.root.removeEventListener("pointerdown", onPointerDown)
    );

    const onPointerMove = (e: FulateEvent) => {
      if (!this.isDrawingMode) return;
      this.mousePos = { x: e.detail.x, y: e.detail.y };
      this._detectAnchor(e.detail.x, e.detail.y);
      this.markDirty();
    };

    this.root.addEventListener("pointermove", onPointerMove);
    this._cleanups.push(() =>
      this.root.removeEventListener("pointermove", onPointerMove)
    );
  }

  private _detectAnchor(mx: number, my: number) {
    this.nearestAnchor = null;
    const threshold = this._anchorThreshold / this.root.viewport.scale;
    let bestDist = threshold * threshold;

    const workspace = this.root.keyElmenet.get("workspace");
    if (!workspace) return;

    const visitChildren = (node: any) => {
      if (!node.children) return;
      for (const child of node.children) {
        if (child === this || child.type === "line" || child.silent) {
          if ((child as any).isLayer) visitChildren(child);
          continue;
        }
        if (child.type === "artboard" || (child as any).isLayer) {
          visitChildren(child);
          continue;
        }
        if (!child.visible || !child.width || !child.height) continue;

        const anchors = getElementAnchorPoints(child);
        for (const a of anchors) {
          if (a.type === "center") continue;
          const dx = a.x - mx;
          const dy = a.y - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestDist) {
            bestDist = d2;
            this.nearestAnchor = {
              x: a.x,
              y: a.y,
              elementId: child.id,
              anchorType: a.type
            };
          }
        }
      }
    };

    visitChildren(workspace);
  }

  private _createLine() {
    const line = new Line({
      linePoints: [...this.tempPoints],
      strokeColor: "#333333",
      strokeWidth: 2
    });

    const parent = this.targetParent;
    parent.append(line);
  }

  paint() {
    if (!this.isDrawingMode) return;

    const ctx = this.layer.ctx;
    const dpr = window.devicePixelRatio || 1;
    const vp = this.root.getViewPointMtrix();
    ctx.save();
    ctx.setTransform(
      vp.a * dpr,
      vp.b * dpr,
      vp.c * dpr,
      vp.d * dpr,
      vp.e * dpr,
      vp.f * dpr
    );

    const scale = this.root.viewport.scale;
    const pointSize = 4 / scale;

    if (this.tempPoints.length > 0) {
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 2 / scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(this.tempPoints[0].x, this.tempPoints[0].y);
      for (let i = 1; i < this.tempPoints.length; i++) {
        ctx.lineTo(this.tempPoints[i].x, this.tempPoints[i].y);
      }

      if (this.mousePos) {
        const snapPos = this.nearestAnchor ?? this.mousePos;
        ctx.lineTo(snapPos.x, snapPos.y);
      }
      ctx.stroke();

      ctx.fillStyle = "#4F81FF";
      for (const p of this.tempPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, pointSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.nearestAnchor) {
      const a = this.nearestAnchor;
      const size = 6 / scale;

      ctx.strokeStyle = "#4F81FF";
      ctx.lineWidth = 2 / scale;
      ctx.fillStyle = "rgba(79, 129, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(a.x, a.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this._drawAllAnchors(ctx, scale);

    ctx.restore();
  }

  private _drawAllAnchors(ctx: CanvasRenderingContext2D, scale: number) {
    if (!this.isDrawingMode) return;

    const workspace = this.root.keyElmenet.get("workspace");
    if (!workspace) return;

    const size = 3 / scale;

    const visitChildren = (node: any) => {
      if (!node.children) return;
      for (const child of node.children) {
        if (child === this || child.type === "line" || child.silent) {
          if ((child as any).isLayer) visitChildren(child);
          continue;
        }
        if (child.type === "artboard" || (child as any).isLayer) {
          visitChildren(child);
          continue;
        }
        if (!child.visible || !child.width || !child.height) continue;

        const anchors = getElementAnchorPoints(child);
        for (const a of anchors) {
          if (a.type === "center") continue;
          const isNearest =
            this.nearestAnchor &&
            Math.abs(a.x - this.nearestAnchor.x) < 0.1 &&
            Math.abs(a.y - this.nearestAnchor.y) < 0.1;
          if (isNearest) continue;

          ctx.fillStyle = "rgba(79, 129, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(a.x, a.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    visitChildren(workspace);
  }

  hasInView(): boolean {
    return true;
  }
}
