import { BaseElementOption, Element } from "@fulate/core";
import { Point } from "@fulate/util";

export interface ForkNodeOption extends BaseElementOption {}

export class ForkNode extends Element {
  type = "forkNode";
  immediatelyDraggable = true;

  static isAnchoredTo(line: any, pointIndex: number): boolean {
    const anchor = line.linePoints?.[pointIndex]?.anchor;
    if (!anchor) return false;
    const el = line.root?.idElements.get(anchor.elementId);
    return el?.type === "forkNode";
  }

  constructor(options?: ForkNodeOption) {
    super({
      width: 8,
      height: 8,
      enableRotation: false,
      enableResize: false,
      enableAnchor: false,
      anchorMultiLine: true,
      ...options
    });
  }

  hasPointHint(point: Point): boolean {
    if (!this.visible) return false;
    const scale = this.root?.viewport?.scale || 1;
    const hitRadius = 8 / scale;
    const m = this.getOwnMatrix();
    const cx = m.e + (this.width / 2) * m.a;
    const cy = m.f + (this.height / 2) * m.d;
    const dx = point.x - cx;
    const dy = point.y - cy;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (!this.visible) return;
    const scale = this.root.viewport.scale;
    const m = this.getOwnMatrix();
    const cx = m.e + (this.width / 2) * m.a;
    const cy = m.f + (this.height / 2) * m.d;

    ctx.save();
    this.root.applyViewPointTransform(ctx);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(cx, cy, 4 / scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    const m = this.getOwnMatrix();
    const cx = m.e + (this.width / 2) * m.a;
    const cy = m.f + (this.height / 2) * m.d;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#22c55e";
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 1.5 / scale;
    ctx.beginPath();
    ctx.arc(cx, cy, 5 / scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  getControlSchema() {
    return {
      controls: [],
      edges: [],
      enableRotation: false,
      enableBodyMove: true,
      bodyHitTest: (_select: any, point: Point) => this.hasPointHint(point),
      paintFrame: () => {},
      getSnapExcludes: () => {
        return { disableSnap: true };
      },
    };
  }

  getAnchorSchema() {
    return [
      {
        id: "center",
        localPosition: (el: any) => new Point(el.width / 2, el.height / 2)
      }
    ];
  }

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    json.type = "forkNode";
    return json;
  }
}
