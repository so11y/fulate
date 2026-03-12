import { Point } from "@fulate/util";
import type { ControlPoint, ControlSchema } from "@fulate/tools";
import { BaseLine, LineAnchor, LineOption } from "./base";

export class Line extends BaseLine {
  type = "line";

  constructor(options?: LineOption) {
    super(options);
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.linePoints.length < 2 || !this.visible) return;

    ctx.save();
    this.root.applyViewPointTransform(ctx);

    const scale = this.root.viewport.scale;

    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth / scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(this.linePoints[0].x, this.linePoints[0].y);
    for (let i = 1; i < this.linePoints.length; i++) {
      ctx.lineTo(this.linePoints[i].x, this.linePoints[i].y);
    }
    ctx.stroke();

    const pointSize = 3 / scale;
    const first = this.linePoints[0];
    const last = this.linePoints[this.linePoints.length - 1];
    for (const p of [first, last]) {
      ctx.fillStyle = p.anchor ? "#4F81FF" : this.strokeColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pointSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    if (this.linePoints.length < 2) return;
    ctx.save();
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = Math.max(this.strokeWidth, 1) / scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.linePoints[0].x, this.linePoints[0].y);
    for (let i = 1; i < this.linePoints.length; i++) {
      ctx.lineTo(this.linePoints[i].x, this.linePoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  getControlSchema(): ControlSchema {
    return getLineControlSchema(this);
  }
}

// ---------------------------------------------------------------------------
//  Control schema for straight-line vertex / midpoint editing
// ---------------------------------------------------------------------------

function getLineControlSchema(line: Line): ControlSchema {
  const controls: ControlPoint[] = [];

  for (let i = 0; i < line.linePoints.length; i++) {
    const ptIndex = i;
    const isEndpoint = ptIndex === 0 || ptIndex === line.linePoints.length - 1;
    controls.push({
      id: `v${i}`,
      cursor: "move",
      shape: "circle",
      localPosition: (el: any, _dim: Point) => {
        const rect = el.getBoundingRect();
        const p = el.linePoints[ptIndex];
        return new Point(p.x - rect.left, p.y - rect.top);
      },
      onDelete: isEndpoint
        ? undefined
        : (select) => {
            const lineEl = select.selectEls[0] as Line;
            lineEl.removePoint(ptIndex);
            return true;
          },
      onDrag: (select, _point, _state, event) => {
        const lineEl = select.selectEls[0] as Line;
        const snap = select.snapTool;

        let targetX = event.detail.x;
        let targetY = event.detail.y;

        const isEndpoint =
          ptIndex === 0 || ptIndex === lineEl.linePoints.length - 1;
        let newAnchor: LineAnchor | undefined;

        if (snap) {
          if (isEndpoint) {
            const anchorHit = snap.detectAnchorSnap(targetX, targetY, [
              lineEl,
              select as any
            ]);
            if (anchorHit) {
              targetX = anchorHit.x;
              targetY = anchorHit.y;
              newAnchor = {
                elementId: anchorHit.elementId,
                anchorType: anchorHit.anchorType
              };
            } else {
              const result = snap.detect([{ x: targetX, y: targetY }], 0, 0);
              if (result) {
                targetX += result.dx;
                targetY += result.dy;
              }
            }
          } else {
            const result = snap.detect([{ x: targetX, y: targetY }], 0, 0);
            if (result) {
              targetX += result.dx;
              targetY += result.dy;
            }
          }
        }

        const prevAnchor = lineEl.linePoints[ptIndex].anchor;
        if (prevAnchor?.elementId !== newAnchor?.elementId && lineEl.root) {
          if (prevAnchor) {
            lineEl._unregisterAnchor(prevAnchor.elementId);
          }
          if (newAnchor) {
            const el = lineEl.root.idElements.get(newAnchor.elementId);
            if (el) (el.connectedLines ??= new Set()).add(lineEl.id);
          }
        }

        lineEl.linePoints[ptIndex].x = targetX;
        lineEl.linePoints[ptIndex].y = targetY;
        lineEl.linePoints[ptIndex].anchor = isEndpoint
          ? newAnchor
          : undefined;
        lineEl._syncBoundsFromPoints();
        lineEl.markDirty();

        const rect = lineEl.getBoundingRect();
        Object.assign(select, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
        (select as any).snapshotChildren?.();
        select.markDirty();
      }
    });
  }

  for (let i = 0; i < line.linePoints.length - 1; i++) {
    const segIndex = i;
    let insertedIndex = -1;
    controls.push({
      id: `m${i}`,
      cursor: "pointer",
      shape: "circle",
      localPosition: (el: any, _dim: Point) => {
        const rect = el.getBoundingRect();
        const p1 = el.linePoints[segIndex];
        const p2 = el.linePoints[segIndex + 1];
        return new Point(
          (p1.x + p2.x) / 2 - rect.left,
          (p1.y + p2.y) / 2 - rect.top
        );
      },
      onDrag: (select, _point, _state, event) => {
        const lineEl = select.selectEls[0] as Line;
        const snap = select.snapTool;

        let targetX = event.detail.x;
        let targetY = event.detail.y;

        if (snap) {
          const singlePoint = [{ x: targetX, y: targetY }];
          const result = snap.detect(singlePoint, 0, 0);
          if (result) {
            targetX += result.dx;
            targetY += result.dy;
          }
        }

        if (insertedIndex < 0) {
          lineEl.insertPoint(segIndex + 1, targetX, targetY);
          insertedIndex = segIndex + 1;
        } else {
          lineEl.linePoints[insertedIndex].x = targetX;
          lineEl.linePoints[insertedIndex].y = targetY;
          lineEl._syncBoundsFromPoints();
          lineEl.markDirty();
        }

        const rect = lineEl.getBoundingRect();
        Object.assign(select, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
        (select as any).snapshotChildren?.();
        select.markDirty();
      }
    });
  }

  return {
    controls,
    enableRotation: false,
    enableBodyMove: true,
    onDragStart(select, control) {
      const lineEl = select.selectEls[0] as Line;
      if (control.id.startsWith("v")) {
        const idx = parseInt(control.id.slice(1), 10);
        select.snapTool?.start(
          [select as any],
          [{ element: lineEl, indices: [idx] }]
        );
      } else {
        select.snapTool?.start([lineEl, select as any]);
      }
    },
    onDragEnd(select) {
      select.snapTool?.stop();
    },
    bodyHitTest: (_select, point) => line.hasPointHint(point),
    paintFrame: (select, ctx) => {
      const el = select.selectEls[0] as Line;
      if (!el || el.linePoints.length < 2) return;
      const scale = select.root.viewport.scale;

      ctx.save();
      select.root.applyViewPointTransform(ctx);

      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth / scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(el.linePoints[0].x, el.linePoints[0].y);
      for (let i = 1; i < el.linePoints.length; i++) {
        ctx.lineTo(el.linePoints[i].x, el.linePoints[i].y);
      }
      ctx.stroke();

      ctx.strokeStyle = "#4F81FF";
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([4 / scale, 4 / scale]);
      ctx.beginPath();
      ctx.moveTo(el.linePoints[0].x, el.linePoints[0].y);
      for (let i = 1; i < el.linePoints.length; i++) {
        ctx.lineTo(el.linePoints[i].x, el.linePoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    },
    paintControl: (ctx, point, cp, scale, _angle) => {
      const size = 5 / scale;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.beginPath();

      if (cp.id.startsWith("m")) {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#4F81FF";
        ctx.lineWidth = 1.5 / scale;
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = "#4F81FF";
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };
}
