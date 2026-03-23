import { Element } from "@fulate/core";
import { Point } from "@fulate/util";

/** A single named anchor point on an element. */
export interface AnchorPoint {
  /** Unique id within the schema (e.g. "tl", "top", "right", …). */
  id: string;
  /** Return the anchor position in the element's local coordinate space. */
  localPosition(element: any): Point;
}

/** User-configurable anchor point data (no ratio — position auto-calculated). */
export interface AnchorPointData {
  id: string;
  label: string;
  edge: "top" | "right" | "bottom" | "left";
}

/** Resolve user-configured anchor data into positioned AnchorPoint[]. */
export function resolveAnchors(data: AnchorPointData[]): AnchorPoint[] {
  const groups = new Map<string, AnchorPointData[]>();
  for (const d of data) {
    let list = groups.get(d.edge);
    if (!list) { list = []; groups.set(d.edge, list); }
    list.push(d);
  }
  const result: AnchorPoint[] = [];
  for (const [edge, items] of groups) {
    const total = items.length;
    items.forEach((item, i) => {
      const ratio = (i + 1) / (total + 1);
      result.push({
        id: item.id,
        localPosition(el: any) {
          switch (edge) {
            case "top":    return new Point(el.width * ratio, 0);
            case "bottom": return new Point(el.width * ratio, el.height);
            case "left":   return new Point(0, el.height * ratio);
            case "right":  return new Point(el.width, el.height * ratio);
            default:       return new Point(el.width * 0.5, el.height * 0.5);
          }
        }
      });
    });
  }
  return result;
}

/** Default 4-point anchor schema. Elements may override via getAnchorSchema(). */
export const DEFAULT_ANCHOR_SCHEMA: AnchorPoint[] = [
  { id: "top", localPosition: (el) => new Point(el.width * 0.5, 0) },
  { id: "right", localPosition: (el) => new Point(el.width, el.height * 0.5) },
  { id: "bottom", localPosition: (el) => new Point(el.width * 0.5, el.height) },
  { id: "left", localPosition: (el) => new Point(0, el.height * 0.5) }
];

function anchorToWorld(
  el: Element,
  anchor: AnchorPoint
): { x: number; y: number } {
  const m = el.getOwnMatrix();
  const local = anchor.localPosition(el);
  const pt = m.transformPoint(local);
  return { x: pt.x, y: pt.y };
}

/**
 * Get the world-space position of a named anchor on an element.
 * Uses the element's own AnchorSchema if it overrides getAnchorSchema().
 */
export function getElementAnchorPoint(
  el: Element,
  anchorType: string
): { x: number; y: number } {
  const schema: AnchorPoint[] =
    (el as any).getAnchorSchema?.() ?? DEFAULT_ANCHOR_SCHEMA;
  const anchor = schema.find((a) => a.id === anchorType);
  if (anchor) return anchorToWorld(el, anchor);
  const r = el.getBoundingRect();
  return {
    x: r.centerX ?? r.left + r.width / 2,
    y: r.centerY ?? r.top + r.height / 2
  };
}

/**
 * Get all anchor points of an element as typed position objects.
 * Uses the element's own AnchorSchema if it overrides getAnchorSchema().
 */
export function getElementAnchorPoints(
  el: Element
): Array<{ type: string; x: number; y: number }> {
  const schema: AnchorPoint[] =
    (el as any).getAnchorSchema?.() ?? DEFAULT_ANCHOR_SCHEMA;
  return schema.map((a) => ({ type: a.id, ...anchorToWorld(el, a) }));
}
