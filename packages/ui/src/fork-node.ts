import { BaseElementOption, Element } from "@fulate/core";
import { Point } from "@fulate/util";

export interface ForkNodeOption extends BaseElementOption {}

export class ForkNode extends Element {
  type = "forkNode";
  immediatelyDraggable = true;

  /** Line whose tail anchors into this node (the "incoming" line). */
  parentLineId: string | null = null;
  /** Lines whose head anchors out of this node (the "outgoing" lines). */
  childLineIds: Set<string> = new Set();

  static isAnchoredTo(line: any, pointIndex: number): boolean {
    const anchor = line.linePoints?.[pointIndex]?.anchor;
    if (!anchor) return false;
    const el = line.root?.idElements.get(anchor.elementId);
    return el?.type === "forkNode";
  }

  getCascadeDeleteElements(): Element[] {
    const result: Element[] = [];
    for (const childId of this.childLineIds) {
      const line = this.root?.idElements.get(childId);
      if (line) result.push(line);
    }
    return result;
  }

  /**
   * Rebuild parentLineId / childLineIds from connectedLines + anchor data.
   * Safe to call at any time to ensure consistency.
   */
  rebuildRelations() {
    this.parentLineId = null;
    this.childLineIds.clear();
    for (const lineId of this.connectedLines ?? []) {
      const line = this.root?.idElements.get(lineId) as any;
      if (!line?.linePoints || line.linePoints.length < 2) continue;
      if (line.tailPoint?.anchor?.elementId === this.id) {
        this.parentLineId = lineId;
      }
      if (line.headPoint?.anchor?.elementId === this.id) {
        this.childLineIds.add(lineId);
      }
    }
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
