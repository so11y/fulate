import { Point } from "@fulate/util";
import { degreesToRadians } from "@fulate/util";
import type { Select } from "./index";

const STROKE_COLOR = "#4F81FF";

function drawElementOutline(
  ctx: CanvasRenderingContext2D,
  coords: Point[],
  scale: number,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  for (let i = 1; i < coords.length; i++) {
    ctx.lineTo(coords[i].x, coords[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
  ctx.restore();
}

function drawSelectionBox(select: Select, ctx: CanvasRenderingContext2D) {
  const schema = select.getActiveSchema();
  if (schema.paintFrame) {
    schema.paintFrame(select, ctx);
    return;
  }
  const coords = select.getCoords();
  const scale = select.root.viewport.scale;
  drawElementOutline(ctx, coords, scale, STROKE_COLOR);
}

function drawChildBorders(select: Select, ctx: CanvasRenderingContext2D) {
  if (select.selectEls.length <= 1) return;
  const scale = select.root.viewport.scale;
  for (const el of select.selectEls) {
    ctx.save();
    select.root.applyViewPointTransform(ctx);
    el.paintHover(ctx, scale);
    ctx.restore();
  }
}

function drawControlPoints(select: Select, ctx: CanvasRenderingContext2D) {
  if (!select.selectEls.length) return;
  const schema = select.getActiveSchema();
  const scale = select.root.viewport.scale;
  const size = select.controlSize / scale;
  const angle = degreesToRadians(select.angle ?? 0);
  const coords = select.getControlCoords();

  for (let i = 0; i < coords.length; i++) {
    const point = coords[i];
    const cp = schema.controls[i];

    if (schema.paintControl) {
      schema.paintControl(ctx, point, cp, scale, angle);
      continue;
    }

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.fillStyle = STROKE_COLOR;

    if (cp.shape === "circle") {
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    } else {
      ctx.roundRect(-size / 2, -size / 2, size, size, 1 / scale);
    }

    ctx.fill();
    ctx.restore();
  }
}

function drawInfoPanel(select: Select, ctx: CanvasRenderingContext2D) {
  const vp = select.root.getViewPointMtrix();
  const dpr = select.root.dpr;
  const controlCoords = select.getControlCoords();
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of controlCoords) {
    const tp = p.matrixTransform(vp);
    if (tp.x < minX) minX = tp.x;
    if (tp.x > maxX) maxX = tp.x;
    if (tp.y > maxY) maxY = tp.y;
  }
  const centerX = (minX + maxX) / 2;

  const text = `x: ${Math.round(select.left)}  y: ${Math.round(
    select.top
  )}  ${Math.round(select.angle ?? 0)}°`;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = "12px Arial";
  const pw = ctx.measureText(text).width + 12;
  const ph = 22;
  const px = centerX - pw / 2;
  const py = maxY + 8;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 4);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.fillText(text, px + 6, py + 15);
  ctx.restore();
}

function drawHoverBorder(select: Select, ctx: CanvasRenderingContext2D) {
  const el = select.hoverElement;
  if (!el || select.selectEls.includes(el)) return;
  const scale = select.root.viewport.scale;

  ctx.save();
  select.root.applyViewPointTransform(ctx);
  el.paintHover(ctx, scale);
  ctx.restore();
}

export function paintSelect(select: Select) {
  const ctx = select.layer.ctx;

  drawHoverBorder(select, ctx);

  if (!select.width || !select.height) return;

  drawSelectionBox(select, ctx);
  drawChildBorders(select, ctx);
  drawControlPoints(select, ctx);
  drawInfoPanel(select, ctx);
}
