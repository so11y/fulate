import { Point } from "@fulate/util";
import type { Element } from "../node/element";

export interface AnchorPoint {
  id: string;
  localPosition(element: any): Point;
}

export interface AnchorLabelStyle {
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface AnchorSnapContext {
  lineId: string;
  elementId: string;
  anchorId: string;
}

export interface AnchorPointData {
  /** 用户可选的显示名称，方便自己区分 */
  name?: string;
  label: string;
  edge: "top" | "right" | "bottom" | "left";
  labelWidth?: number;
  labelStyle?: AnchorLabelStyle;
  /** 是否允许多条线连接到此锚点，默认 false（只能一条线） */
  multiLine?: boolean;
  validateSnap?: (context: AnchorSnapContext) => Promise<boolean>;
}

/**
 * Generate a stable anchor id from edge and its index on that edge.
 * e.g. "top_0", "bottom_1", "left_0"
 */
export function resolveAnchorId(edge: string, indexOnEdge: number): string {
  return `${edge}_${indexOnEdge}`;
}

/**
 * Build a map from generated anchor id to AnchorPointData for a given list.
 */
export function buildAnchorIdMap(data: AnchorPointData[]): Map<string, AnchorPointData> {
  const map = new Map<string, AnchorPointData>();
  const counters = new Map<string, number>();
  for (const d of data) {
    const idx = counters.get(d.edge) ?? 0;
    counters.set(d.edge, idx + 1);
    map.set(resolveAnchorId(d.edge, idx), d);
  }
  return map;
}

export function resolveAnchors(data: AnchorPointData[]): AnchorPoint[] {
  const groups = new Map<string, { item: AnchorPointData; anchorId: string }[]>();
  const counters = new Map<string, number>();

  for (const d of data) {
    const idx = counters.get(d.edge) ?? 0;
    counters.set(d.edge, idx + 1);
    let list = groups.get(d.edge);
    if (!list) { list = []; groups.set(d.edge, list); }
    list.push({ item: d, anchorId: resolveAnchorId(d.edge, idx) });
  }

  const result: AnchorPoint[] = [];
  for (const [edge, items] of groups) {
    const total = items.length;
    items.forEach(({ anchorId }, i) => {
      const ratio = (i + 1) / (total + 1);
      result.push({
        id: anchorId,
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

export function getElementAnchorPoints(
  el: Element
): Array<{ type: string; x: number; y: number }> {
  const schema: AnchorPoint[] =
    (el as any).getAnchorSchema?.() ?? DEFAULT_ANCHOR_SCHEMA;
  return schema.map((a) => ({ type: a.id, ...anchorToWorld(el, a) }));
}

export function syncAnchorIndicators(
  host: Element,
  data: AnchorPointData[] | null,
  indicators: Map<string, Element> | null,
  createIndicator: (data: AnchorPointData, anchorId: string) => Element
): Map<string, Element> | null {
  if (!data?.length) {
    if (indicators) {
      for (const indicator of indicators.values()) {
        host.removeChild(indicator);
      }
    }
    return null;
  }

  const idMap = buildAnchorIdMap(data);
  const map = indicators ?? new Map<string, Element>();
  const currentIds = new Set(idMap.keys());

  for (const [id, indicator] of map) {
    if (!currentIds.has(id)) {
      host.removeChild(indicator);
      map.delete(id);
    }
  }

  const groups = new Map<string, AnchorPointData[]>();
  for (const d of data) {
    let list = groups.get(d.edge);
    if (!list) { list = []; groups.set(d.edge, list); }
    list.push(d);
  }

  for (const [anchorId, d] of idMap) {
    const sameEdge = groups.get(d.edge)!;
    const idx = sameEdge.indexOf(d);
    const ratio = (idx + 1) / (sameEdge.length + 1);

    let indicator = map.get(anchorId);
    if (!indicator) {
      indicator = createIndicator(d, anchorId);
      map.set(anchorId, indicator);
      host.append(indicator);
    } else {
      (indicator as any).anchorLabel = d.label;
      (indicator as any).edge = d.edge;
      if (d.labelWidth != null) (indicator as any).labelWidth = d.labelWidth;
      if (d.labelStyle != null) (indicator as any).labelStyle = d.labelStyle;
    }

    (indicator as any).anchorRatio = ratio;
    indicator.markNeedsLayout();
  }

  return map;
}

export function serializeAnchors(data: AnchorPointData[]): any[] {
  return data.map((a) => {
    const out: any = { label: a.label, edge: a.edge };
    if (a.name != null) out.name = a.name;
    if (a.labelWidth != null) out.labelWidth = a.labelWidth;
    if (a.labelStyle != null) out.labelStyle = { ...a.labelStyle };
    if (a.multiLine) out.multiLine = true;
    return out;
  });
}

/**
 * Check if an anchor on an element is available for a new line connection.
 * Returns false if the anchor is single-line (default) and already occupied.
 */
export function isAnchorAvailable(
  element: Element,
  anchorId: string,
  excludeLineId?: string
): boolean {
  const anchorDataList: AnchorPointData[] | null = (element as any).anchors;
  let anchorData: AnchorPointData | undefined;
  if (anchorDataList) {
    const idMap = buildAnchorIdMap(anchorDataList);
    anchorData = idMap.get(anchorId);
  }
  const multiLine = anchorData?.multiLine ?? (element as any).anchorMultiLine ?? false;
  if (multiLine) return true;

  for (const lineId of (element as any).connectedLines ?? []) {
    if (lineId === excludeLineId) continue;
    const line = element.root?.idElements.get(lineId) as any;
    if (!line?.linePoints) continue;
    for (const p of line.linePoints) {
      if (p.anchor?.elementId === element.id && p.anchor?.anchorType === anchorId) {
        return false;
      }
    }
  }
  return true;
}
