import { Point } from "@fulate/util";
import { BaseLine, LineAnchor, LineOption } from "./base";
import { ForkNode } from "../fork-node";
import { drawDecoration } from "./helpers";

export class Line extends BaseLine {
  type = "line";

  constructor(options?: LineOption) {
    super(options);
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.linePoints.length < 2 || !this.visible) return;

    ctx.save();
    this.root.viewport.applyViewPointTransform(ctx);

    const scale = this.root.viewport.scale;
    const wp = this.getWorldLinePoints();

    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }
    ctx.stroke();

    if (!ForkNode.isAnchoredTo(this, 0)) {
      drawDecoration(ctx, this.headDecoration, wp[1], wp[0], scale, this.strokeColor);
    }

    const lastIdx = this.linePoints.length - 1;
    if (!ForkNode.isAnchoredTo(this, lastIdx)) {
      drawDecoration(ctx, this.tailDecoration, wp[wp.length - 2], wp[wp.length - 1], scale, this.strokeColor);
    }

    ctx.restore();
  }

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    if (this.linePoints.length < 2) return;
    const wp = this.getWorldLinePoints();
    ctx.save();
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = Math.max(this.strokeWidth, 1) / scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  getControlSchema() {
    return getLineControlSchema(this);
  }
}

// ---------------------------------------------------------------------------
//  Control schema for straight-line vertex / midpoint editing
// ---------------------------------------------------------------------------

function getLineControlSchema(line: Line) {
  const controls: any[] = [];

  for (let i = 0; i < line.linePoints.length; i++) {
    const ptIndex = i;
    const isEndpoint = ptIndex === 0 || ptIndex === line.linePoints.length - 1;

    if (isEndpoint && ForkNode.isAnchoredTo(line, ptIndex)) {
      continue;
    }

    controls.push({
      id: `v${i}`,
      cursor: "move",
      shape: "circle",
      localPosition: (_select: any, el: any) => {
        const rect = el.getBoundingRect();
        const wp = el.getWorldLinePoints();
        const p = wp[ptIndex];
        return new Point(p.x - rect.left, p.y - rect.top);
      },
      onDelete: isEndpoint
        ? undefined
        : (select) => {
            const lineEl = select.selectEls[0] as Line;
            lineEl.removePoint(ptIndex);
            return true;
          },
      onDrag: async (select, _point, _state, event) => {
        const lineEl = select.selectEls[0] as Line;
        const snap = select.snapTool;

        let targetX = event.detail.x;
        let targetY = event.detail.y;

        const isEndpoint =
          ptIndex === 0 || ptIndex === lineEl.linePoints.length - 1;
        let newAnchor: LineAnchor | undefined;

        if (snap) {
          if (isEndpoint) {
            const anchorHit = await snap.detectAnchorSnap(
              targetX, targetY,
              [lineEl, select as any],
              lineEl.id
            );
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

        const local = lineEl.worldToLocal(targetX, targetY);
        lineEl.linePoints[ptIndex].x = local.x;
        lineEl.linePoints[ptIndex].y = local.y;
        lineEl.linePoints[ptIndex].anchor = isEndpoint
          ? newAnchor
          : undefined;
        if (prevAnchor?.elementId !== newAnchor?.elementId) {
          lineEl.rebindAnchors();
        }
        lineEl.markNeedsLayout();

        const rect = lineEl.getBoundingRect();
        Object.assign(select, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
        (select as any).snapshotChildren?.();
        select.markNeedsLayout();
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
      localPosition: (_select: any, el: any) => {
        const rect = el.getBoundingRect();
        const wp = el.getWorldLinePoints();
        const p1 = wp[segIndex];
        const p2 = wp[segIndex + 1];
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
          const local = lineEl.worldToLocal(targetX, targetY);
          lineEl.linePoints[insertedIndex].x = local.x;
          lineEl.linePoints[insertedIndex].y = local.y;
          lineEl.markNeedsLayout();
        }

        const rect = lineEl.getBoundingRect();
        Object.assign(select, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
        (select as any).snapshotChildren?.();
        select.markNeedsLayout();
      }
    });
  }

  const hasForkConnection =
    ForkNode.isAnchoredTo(line, 0) ||
    ForkNode.isAnchoredTo(line, line.linePoints.length - 1);

  return {
    controls,
    enableRotation: false,
    enableBodyMove: !hasForkConnection,
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
      const wp = el.getWorldLinePoints();

      ctx.save();
      select.root.viewport.applyViewPointTransform(ctx);

      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) {
        ctx.lineTo(wp[i].x, wp[i].y);
      }
      ctx.stroke();

      if (!ForkNode.isAnchoredTo(el, 0)) {
        drawDecoration(ctx, el.headDecoration, wp[1], wp[0], scale, el.strokeColor);
      }
      const lastIdx = el.linePoints.length - 1;
      if (!ForkNode.isAnchoredTo(el, lastIdx)) {
        drawDecoration(ctx, el.tailDecoration, wp[wp.length - 2], wp[wp.length - 1], scale, el.strokeColor);
      }

      ctx.strokeStyle = "#4F81FF";
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([4 / scale, 4 / scale]);
      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) {
        ctx.lineTo(wp[i].x, wp[i].y);
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

