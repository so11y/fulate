import { Intersection } from "../../../util/Intersection";
import { Point } from "../../../util/point";
import { Controls, resizeObject, rotateCallback } from "./controls";
import type { Select } from "./index";

const rotateCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>') 9 9, crosshair`;

export function selectHitTest(select: Select, hintPoint: Point): boolean {
  if (!select.selectEls.length) return false;
  if (select.width === 0 || select.height === 0) return false;

  const coords = select.getControlCoords();
  select.currentControl = null;
  select.cursor = "default";

  const scale = select.root.viewport.scale;
  const scaledControlSize = select.controlSize / scale;
  const scaledRotatePadding = 8 / scale;

  for (let i = 0; i < coords.length; i++) {
    const point = coords[i];

    if (hintPoint.pointDistance(point, scaledControlSize)) {
      select.cursor = Controls[i].cursor;
      select.currentControl = { point: hintPoint, control: Controls[i] };
      return true;
    }

    if (
      hintPoint.pointDistance(point, scaledControlSize + scaledRotatePadding) &&
      !select.bodyHasPoint(hintPoint)
    ) {
      select.cursor = rotateCursor;
      select.currentControl = {
        point: hintPoint,
        control: {
          type: "rotate",
          actionName: "rotate",
          cursor: rotateCursor,
          callback: rotateCallback
        }
      };
      return true;
    }
  }

  const map = new Map<string, Point>();
  coords.forEach((c, i) => map.set(Controls[i].type, c));

  const tl = map.get("tl")!;
  const tr = map.get("tr")!;
  const br = map.get("br")!;
  const bl = map.get("bl")!;

  const edges = [
    { start: tl, end: tr, type: "mt", cursor: "ns-resize" },
    { start: tr, end: br, type: "mr", cursor: "ew-resize" },
    { start: br, end: bl, type: "mb", cursor: "ns-resize" },
    { start: bl, end: tl, type: "ml", cursor: "ew-resize" }
  ];

  const scaledHitPadding = select.hitPadding / scale;

  for (const edge of edges) {
    const dist = Intersection.pointToLineSegmentDistance(
      hintPoint,
      edge.start,
      edge.end
    );

    if (dist <= scaledHitPadding) {
      select.cursor = edge.cursor;
      select.currentControl = {
        point: hintPoint,
        control: {
          type: edge.type,
          actionName: "scale",
          cursor: edge.cursor,
          callback: (_selectEL: any, _point: any, preState: any, event: any) =>
            resizeObject(select, preState, event, edge.type)
        }
      };
      return true;
    }
  }

  if (select.bodyHasPoint(hintPoint)) {
    select.cursor = "move";
    return true;
  }

  return false;
}
