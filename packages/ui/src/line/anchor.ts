import { Element } from "@fulate/core";
import { Point } from "@fulate/util";

/** A single named anchor point on an element. */
export interface AnchorPoint {
  /** Unique id within the schema (e.g. "tl", "top", "right", …). */
  id: string;
  /** Return the anchor position in the element's local coordinate space. */
  localPosition(element: any, dim: Point): Point;
}

/** Default 8-point anchor schema (no center). Elements may override via getAnchorSchema(). */
export const DEFAULT_ANCHOR_SCHEMA: AnchorPoint[] = [
  { id: "top", localPosition: (_el, dim) => new Point(dim.x * 0.5, 0) },
  { id: "right", localPosition: (_el, dim) => new Point(dim.x, dim.y * 0.5) },
  { id: "bottom", localPosition: (_el, dim) => new Point(dim.x * 0.5, dim.y) },
  { id: "left", localPosition: (_el, dim) => new Point(0, dim.y * 0.5) }
];

function anchorToWorld(
  el: Element,
  anchor: AnchorPoint
): { x: number; y: number } {
  const dim = (el as any)._getTransformedDimensions();
  const m = el.getOwnMatrix();
  const local = anchor.localPosition(el, dim);
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
