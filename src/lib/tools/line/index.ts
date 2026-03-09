import { BaseElementOption, Element } from "../../node/element";
import { FulateEvent } from "../../../util/event";
import {
  Line,
  LinePointData,
  getElementAnchorPoints
} from "../../ui/line";
import { checkElement } from "../select/checkElement";

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

  private get _excludes() {
    const select = this.root.keyElmenet.get("select");
    return select ? [this, select] : [this];
  }

  private _detectAnchor(mx: number, my: number) {
    this.nearestAnchor = null;
    const threshold = this._anchorThreshold / this.root.viewport.scale;
    let bestDist = threshold * threshold;
    const excludes = this._excludes;

    this.root.searchArea(
      {
        left: mx - threshold,
        top: my - threshold,
        width: threshold * 2,
        height: threshold * 2
      },
      ({ element }) => {
        const resolved = checkElement(element, excludes);
        if (!resolved || resolved.type === "line") return;

        const anchors = getElementAnchorPoints(element);
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
              elementId: element.id,
              anchorType: a.type
            };
          }
        }
      }
    );
  }

  private _getDefaultContentLayer() {
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

  private _createLine() {
    const line = new Line({
      linePoints: [...this.tempPoints],
      strokeColor: "#333333",
      strokeWidth: 2
    });

    const startAnchor = this.tempPoints[0]?.anchor;
    const startEl = startAnchor
      ? this.root.idElements.get(startAnchor.elementId)
      : null;
    const parent = startEl?.layer ?? this._getDefaultContentLayer();
    this.root.history.snapshot([line]);
    parent.append(line);
    this.root.history.commit();
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

    const size = 3 / scale;
    const { x: vx, y: vy } = this.root.viewport;
    const vw = this.root.width / scale;
    const vh = this.root.height / scale;
    const viewLeft = -vx / scale;
    const viewTop = -vy / scale;

    const excludes = this._excludes;
    this.root.searchArea(
      { left: viewLeft, top: viewTop, width: vw, height: vh },
      ({ element }) => {
        const resolved = checkElement(element, excludes);
        if (!resolved || resolved.type === "line") return;

        const anchors = getElementAnchorPoints(element);
        for (const a of anchors) {
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
    );
  }

  hasInView(): boolean {
    return true;
  }
}
