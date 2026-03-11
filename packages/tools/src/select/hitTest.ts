import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { rotateCallback } from "./controls";
import type { Select } from "./index";

const rotateCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>') 9 9, crosshair`;

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
      select.cursor = cp.cursor;
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
        select.cursor = edge.cursor;
        select.currentControl = {
          point: hintPoint,
          control: {
            id: `edge_${edge.from}_${edge.to}`,
            cursor: edge.cursor,
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
