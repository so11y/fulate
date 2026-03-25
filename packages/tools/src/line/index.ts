import { BaseElementOption, Element } from "@fulate/core";
import { FulateEvent } from "@fulate/core";
import { getElementAnchorPoints, isAnchorAvailable } from "@fulate/core";
import { Line, LinePointData, ForkNode } from "@fulate/ui";
import { checkElement } from "../select/checkElement";

export class LineTool extends Element {
  type = "lineTool";
  key = "lineTool";
  selectctbale = false;

  isDrawingMode = false;
  tempPoints: LinePointData[] = [];
  mousePos: { x: number; y: number } | null = null;
  nearestAnchor: {
    x: number;
    y: number;
    elementId: string;
    anchorType: string;
  } | null = null;

  disabledAnchorStyle: {
    fillStyle: string;
    strokeStyle: string;
  } = {
    fillStyle: "rgba(180, 180, 180, 0.4)",
    strokeStyle: "rgba(180, 180, 180, 0.6)"
  };

  private _disabledAnchors: Array<{ x: number; y: number }> = [];
  private _anchorThreshold = 10;
  private _cleanups: Array<() => void> = [];

  private _forkMode = false;
  private _forkSourceLine: Line | null = null;
  private _forkNode: ForkNode | null = null;

  constructor(options?: BaseElementOption) {
    super({ width: 0, height: 0, ...options });
  }

  startDrawing() {
    this.isDrawingMode = true;
    this.tempPoints = [];
    this.mousePos = null;
    this.nearestAnchor = null;
    this.root.container.style.cursor = "crosshair";
    this.markNeedsLayout();
  }

  stopDrawing() {
    if (this._forkMode && this.tempPoints.length >= 2) {
      this._finishFork();
    } else if (this.tempPoints.length >= 2) {
      this._createLine();
    }
    this.isDrawingMode = false;
    this.tempPoints = [];
    this.mousePos = null;
    this.nearestAnchor = null;
    this._forkMode = false;
    this._forkSourceLine = null;
    this._forkNode = null;
    this.root.container.style.cursor = "default";
    this.markNeedsLayout();
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
          if (select?.selectEls?.length === 1 && select.selectEls[0].type === "line") {
            this._startForkMode(select.selectEls[0] as Line);
          } else {
            select?.select?.([]);
            this.startDrawing();
          }
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

      if (this._forkMode && this.tempPoints.length === 0 && this._forkSourceLine) {
        this._createForkNodeOnFirstClick();
      }

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
      this.markNeedsLayout();

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
      this.markNeedsLayout();
    };

    this.root.addEventListener("pointermove", onPointerMove);
    this._cleanups.push(() =>
      this.root.removeEventListener("pointermove", onPointerMove)
    );
  }

  private _startForkMode(sourceLine: Line) {
    this._forkMode = true;
    this._forkSourceLine = sourceLine;
    this._forkNode = null;

    const select = this.root.keyElmenet.get("select") as any;
    select?.select?.([]);

    this.isDrawingMode = true;
    this.tempPoints = [];
    this.mousePos = null;
    this.nearestAnchor = null;
    this.root.container.style.cursor = "crosshair";
    this.markNeedsLayout();
  }

  private _createForkNodeOnFirstClick() {
    const sourceLine = this._forkSourceLine!;
    const wp = sourceLine.getWorldLinePoints();
    const tailWorld = wp[wp.length - 1];
    const tailIdx = sourceLine.linePoints.length - 1;
    const existingAnchor = sourceLine.linePoints[tailIdx].anchor;
    const select = this.root.keyElmenet.get("select") as any;

    if (existingAnchor) {
      const el = this.root?.idElements.get(existingAnchor.elementId);
      if (el?.type === "forkNode") {
        this._forkNode = el as ForkNode;
        select?.history?.snapshot([sourceLine, el]);
        this.tempPoints.push({
          x: tailWorld.x,
          y: tailWorld.y,
          anchor: { elementId: el.id, anchorType: "center" }
        });
        return;
      }
    }

    const forkNode = new ForkNode({
      left: tailWorld.x - 4,
      top: tailWorld.y - 4
    });
    this._forkNode = forkNode;

    select?.history?.snapshot([sourceLine, forkNode]);

    const parent = sourceLine.parent ?? this._getDefaultContentLayer();
    parent.append(forkNode);

    sourceLine.linePoints[tailIdx].anchor = {
      elementId: forkNode.id,
      anchorType: "center"
    };
    sourceLine.rebindAnchors();
    sourceLine._syncBoundsFromPoints();
    sourceLine.markNeedsLayout();

    this.tempPoints.push({
      x: tailWorld.x,
      y: tailWorld.y,
      anchor: { elementId: forkNode.id, anchorType: "center" }
    });
  }

  private _finishFork() {
    if (!this._forkSourceLine || !this._forkNode) return;

    const childLine = new Line({
      linePoints: [...this.tempPoints],
      strokeColor: this._forkSourceLine.strokeColor,
      strokeWidth: this._forkSourceLine.strokeWidth
    });

    const parent =
      this._forkSourceLine.parent ?? this._getDefaultContentLayer();
    const select = this.root.keyElmenet.get("select") as any;

    select?.history?.addSnapshot([childLine]);
    parent.append(childLine);
    select?.history?.commit();
  }

  private get _excludes() {
    const select = this.root.keyElmenet.get("select");
    return select ? [this, select] : [this];
  }

  private _detectAnchor(mx: number, my: number) {
    this.nearestAnchor = null;
    this._disabledAnchors = [];
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
          if (!isAnchorAvailable(element, a.type)) {
            this._disabledAnchors.push({ x: a.x, y: a.y });
            continue;
          }
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
          return child;
        }
      }
    }
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
    const select = this.root.keyElmenet.get("select") as any;
    select?.history?.snapshot([line]);
    parent.append(line);
    select?.history?.commit();
  }

  paint() {
    if (!this.isDrawingMode) return;

    const ctx = this.layer.ctx;
    ctx.save();
    this.root.applyViewPointTransform(ctx);

    const scale = this.root.viewport.scale;
    const pointSize = 4 / scale;

    if (this._forkMode && this.tempPoints.length === 0 && this.mousePos && this._forkSourceLine) {
      const wp = this._forkSourceLine.getWorldLinePoints();
      const tail = wp[wp.length - 1];
      const snapPos = this.nearestAnchor ?? this.mousePos;

      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 2 / scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(snapPos.x, snapPos.y);
      ctx.stroke();

      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(tail.x, tail.y, pointSize, 0, Math.PI * 2);
      ctx.fill();
    }

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
    const excludes = this._excludes;
    this.root.searchArea(this.root.getViewportRect(), ({ element }) => {
      const resolved = checkElement(element, excludes);
      if (!resolved || resolved.type === "line") return;

      const anchors = getElementAnchorPoints(element);
      for (const a of anchors) {
        const isNearest =
          this.nearestAnchor &&
          Math.abs(a.x - this.nearestAnchor.x) < 0.1 &&
          Math.abs(a.y - this.nearestAnchor.y) < 0.1;
        if (isNearest) continue;

        const available = isAnchorAvailable(element, a.type);
        if (!available) {
          ctx.fillStyle = this.disabledAnchorStyle.fillStyle;
          ctx.strokeStyle = this.disabledAnchorStyle.strokeStyle;
          ctx.lineWidth = 1 / scale;
          ctx.beginPath();
          ctx.arc(a.x, a.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(79, 129, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(a.x, a.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  hasInView(): boolean {
    return true;
  }
}
