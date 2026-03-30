import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { rotateCallback } from "./controls";
import type { Select } from "./index";

const rotateCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>') 9 9, crosshair`;

const ROTATE_CURSORS = [
  "ns-resize",
  "nesw-resize",
  "ew-resize",
  "nwse-resize",
  "ns-resize",
  "nesw-resize",
  "ew-resize",
  "nwse-resize",
] as const;

function getRotatedCursor(baseCursor: string, angle: number): string {
  const baseIndex = ROTATE_CURSORS.indexOf(baseCursor as any);
  if (baseIndex === -1) return baseCursor;
  const offset = Math.round((((angle % 360) + 360) % 360) / 45) % 8;
  return ROTATE_CURSORS[(baseIndex + offset) % 8];
}

export function selectHitTest(select: Select, hintPoint: Point): boolean {
  if (!select.selectEls.length) return false;
  if (select.width === 0 || select.height === 0) return false;

  const schema = select.getActiveSchema();
  const coords = select.getControlCoords();
  select.currentControl = null;
  select.cursor = "default";

  const scale = select.root.viewport.scale;
  const scaledControlSize = select.controlSize / scale;
  const scaledRotatePadding = 8 / scale;

  for (let i = 0; i < coords.length; i++) {
    const point = coords[i];
    const cp = schema.controls[i];

    if (hintPoint.pointDistance(point, scaledControlSize)) {
      select.cursor = getRotatedCursor(cp.cursor, select.angle ?? 0);
      select.currentControl = { point: hintPoint, control: cp };
      return true;
    }

    if (
      schema.enableRotation !== false &&
      hintPoint.pointDistance(point, scaledControlSize + scaledRotatePadding) &&
      !select.bodyHasPoint(hintPoint)
    ) {
      select.cursor = rotateCursor;
      select.currentControl = {
        point: hintPoint,
        control: {
          id: "rotate",
          cursor: rotateCursor,
          onDrag: rotateCallback
        }
      };
      return true;
    }
  }

  if (schema.edges && schema.edges.length > 0) {
    const idToCoord = new Map<string, Point>();
    schema.controls.forEach((cp, i) => idToCoord.set(cp.id, coords[i]));

    const scaledHitPadding = select.hitPadding / scale;

    for (const edge of schema.edges) {
      const start = idToCoord.get(edge.from);
      const end = idToCoord.get(edge.to);
      if (!start || !end) continue;

      const dist = Intersection.pointToLineSegmentDistance(
        hintPoint,
        start,
        end
      );

      if (dist <= scaledHitPadding) {
        const rotatedCursor = getRotatedCursor(edge.cursor, select.angle ?? 0);
        select.cursor = rotatedCursor;
        select.currentControl = {
          point: hintPoint,
          control: {
            id: `edge_${edge.from}_${edge.to}`,
            cursor: rotatedCursor,
            onDrag: edge.onDrag
          }
        };
        return true;
      }
    }
  }

  if (schema.enableBodyMove !== false) {
    const bodyHit = schema.bodyHitTest
      ? schema.bodyHitTest(select, hintPoint)
      : select.bodyHasPoint(hintPoint);
    if (bodyHit) {
      select.cursor = "move";
      return true;
    }
  }

  return false;
}
