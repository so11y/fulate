import type { LineDecoration } from "../base";

export function drawDecoration(
  ctx: CanvasRenderingContext2D,
  decoration: LineDecoration,
  from: { x: number; y: number },
  to: { x: number; y: number },
  scale: number,
  color: string
) {
  if (decoration === "none") return;

  ctx.fillStyle = color;

  if (decoration === "dot") {
    const radius = 3 / scale;
    ctx.beginPath();
    ctx.arc(to.x, to.y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (decoration === "arrow") {
    const arrowLen = 10 / scale;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLen * Math.cos(angle - Math.PI / 6),
      to.y - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - arrowLen * Math.cos(angle + Math.PI / 6),
      to.y - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }
}
