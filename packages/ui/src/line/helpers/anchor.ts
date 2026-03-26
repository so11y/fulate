import { Element, getElementAnchorPoint } from "@fulate/core";
import type { BaseLine, LineAnchor, LinePointData } from "../base";
import type { ForkNode } from "../../fork-node";

// ---------------------------------------------------------------------------
//  Connect / disconnect a single element
// ---------------------------------------------------------------------------

export function connectToElement(
  line: BaseLine,
  el: Element,
  onTransformUpdated: () => void
) {
  (el.connectedLines ??= new Set()).add(line.id);
  el.addEventListener("transformUpdated", onTransformUpdated);
  syncForkRelation(line, el);
}

export function disconnectFromElement(
  line: BaseLine,
  el: Element,
  onTransformUpdated: () => void
) {
  el.connectedLines?.delete(line.id);
  el.removeEventListener("transformUpdated", onTransformUpdated);
  if (el.type === "forkNode") {
    const fk = el as unknown as ForkNode;
    if (fk.parentLineId === line.id) fk.parentLineId = null;
    fk.childLineIds.delete(line.id);
  }
}

// ---------------------------------------------------------------------------
//  ForkNode relation sync
// ---------------------------------------------------------------------------

export function syncForkRelation(line: BaseLine, el: Element) {
  if (el.type !== "forkNode" || line.linePoints.length < 2) return;
  const fk = el as unknown as ForkNode;
  if (line.tailPoint?.anchor?.elementId === el.id) {
    fk.parentLineId = line.id;
  }
  if (line.headPoint?.anchor?.elementId === el.id) {
    fk.childLineIds.add(line.id);
  }
}

export function syncAllForkRelations(line: BaseLine) {
  for (const p of [line.headPoint, line.tailPoint]) {
    if (!p?.anchor) continue;
    const el = line.root?.idElements.get(p.anchor.elementId);
    if (el) syncForkRelation(line, el);
  }
}

// ---------------------------------------------------------------------------
//  Anchor registration / unregistration
// ---------------------------------------------------------------------------

export function unregisterAnchor(
  line: BaseLine,
  elementId: string,
  disconnectFn: (el: Element) => void
) {
  if (!line.root) return;
  const stillConnected =
    line.headPoint.anchor?.elementId === elementId ||
    line.tailPoint.anchor?.elementId === elementId;
  if (!stillConnected) {
    const el = line.root.idElements.get(elementId);
    if (el) disconnectFn(el);
  }
}

// ---------------------------------------------------------------------------
//  Sync anchor point position
// ---------------------------------------------------------------------------

export function syncAnchorPoint(line: BaseLine, p: LinePointData): boolean {
  if (!p.anchor) return false;
  const el = line.root!.idElements.get(p.anchor.elementId);
  if (!el) return false;
  const pos = getElementAnchorPoint(el, p.anchor.anchorType);
  const local = line.worldToLocal(pos.x, pos.y);
  if (Math.abs(local.x - p.x) > 0.01 || Math.abs(local.y - p.y) > 0.01) {
    p.x = local.x;
    p.y = local.y;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
//  Batch endpoint bind / unbind
// ---------------------------------------------------------------------------

export function bindEndpoints(
  line: BaseLine,
  connect: boolean,
  connectFn: (el: Element) => void,
  disconnectFn: (el: Element) => void
) {
  const action = connect ? connectFn : disconnectFn;
  for (const p of [line.headPoint, line.tailPoint]) {
    if (!p.anchor) continue;
    const el = line.root?.idElements.get(p.anchor.elementId);
    if (el) action(el);
  }
}

// ---------------------------------------------------------------------------
//  onSelectMoveEnd logic
// ---------------------------------------------------------------------------

export function handleSelectMoveEnd(
  line: BaseLine,
  unregisterFn: (elementId: string) => void
): boolean {
  if (!line.root) return false;
  let boundsChanged = false;
  for (const p of [line.headPoint, line.tailPoint]) {
    if (!p.anchor) continue;
    const el = line.root.idElements.get(p.anchor.elementId);
    if (!el) {
      p.anchor = undefined;
      continue;
    }

    if (el.type === "forkNode") {
      const pos = getElementAnchorPoint(el, p.anchor.anchorType);
      const local = line.worldToLocal(pos.x, pos.y);
      p.x = local.x;
      p.y = local.y;
      boundsChanged = true;
      continue;
    }

    const pos = getElementAnchorPoint(el, p.anchor.anchorType);
    const local = line.worldToLocal(pos.x, pos.y);
    if (Math.abs(local.x - p.x) > 0.01 || Math.abs(local.y - p.y) > 0.01) {
      unregisterFn(p.anchor.elementId);
      p.anchor = undefined;
    }
  }
  return boundsChanged;
}

// ---------------------------------------------------------------------------
//  Sync connected lines on linePoints change (history restore)
// ---------------------------------------------------------------------------

export function syncConnectedLines(
  line: BaseLine,
  oldPoints: LinePointData[],
  newPoints: LinePointData[],
  unregisterFn: (elementId: string) => void,
  connectFn: (el: Element) => void
) {
  if (!line.root) return;
  if (oldPoints[0]?.anchor)
    unregisterFn(oldPoints[0].anchor.elementId);
  const oldTail =
    oldPoints.length > 1 ? oldPoints[oldPoints.length - 1] : undefined;
  if (oldTail?.anchor) unregisterFn(oldTail.anchor.elementId);

  for (const p of [
    newPoints[0],
    newPoints.length > 1 ? newPoints[newPoints.length - 1] : undefined
  ]) {
    if (!p?.anchor) continue;
    const el = line.root.idElements.get(p.anchor.elementId);
    if (el) connectFn(el);
  }
}
