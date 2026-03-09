import { Element } from "../../node/element";

/** A single named anchor point on an element. */
export interface AnchorPoint {
  /** Unique id within the schema (e.g. "tl", "top", "right", …). */
  id: string;
  /** Returns the anchor's world-space position for the given element. */
  getPosition(el: Element): { x: number; y: number };
}

/** Default 8-point anchor schema (no center). Elements may override via getAnchorSchema(). */
export const DEFAULT_ANCHOR_SCHEMA: AnchorPoint[] = [
  {
    id: "tl",
    getPosition(el) {
      const c = el.getCoords();
      return c?.[0] ?? fallbackCenter(el);
    }
  },
  {
    id: "top",
    getPosition(el) {
      const c = el.getCoords();
      if (!c || c.length < 4) return fallbackCenter(el);
      return { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
    }
  },
  {
    id: "tr",
    getPosition(el) {
      const c = el.getCoords();
      return c?.[1] ?? fallbackCenter(el);
    }
  },
  {
    id: "right",
    getPosition(el) {
      const c = el.getCoords();
      if (!c || c.length < 4) return fallbackCenter(el);
      return { x: (c[1].x + c[2].x) / 2, y: (c[1].y + c[2].y) / 2 };
    }
  },
  {
    id: "br",
    getPosition(el) {
      const c = el.getCoords();
      return c?.[2] ?? fallbackCenter(el);
    }
  },
  {
    id: "bottom",
    getPosition(el) {
      const c = el.getCoords();
      if (!c || c.length < 4) return fallbackCenter(el);
      return { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 };
    }
  },
  {
    id: "bl",
    getPosition(el) {
      const c = el.getCoords();
      return c?.[3] ?? fallbackCenter(el);
    }
  },
  {
    id: "left",
    getPosition(el) {
      const c = el.getCoords();
      if (!c || c.length < 4) return fallbackCenter(el);
      return { x: (c[3].x + c[0].x) / 2, y: (c[3].y + c[0].y) / 2 };
    }
  }
];

function fallbackCenter(el: Element): { x: number; y: number } {
  const r = el.getBoundingRect();
  return {
    x: r.centerX ?? r.left + r.width / 2,
    y: r.centerY ?? r.top + r.height / 2
  };
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
  if (anchor) return anchor.getPosition(el);
  return fallbackCenter(el);
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
  return schema.map((a) => ({ type: a.id, ...a.getPosition(el) }));
}
