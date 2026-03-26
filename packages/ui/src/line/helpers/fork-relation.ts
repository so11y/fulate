import { Element } from "@fulate/core";
import type { BaseLine } from "../base";
import type { ForkNode } from "../../fork-node";

export function getTailForkNode(line: BaseLine): ForkNode | null {
  const anchor = line.tailPoint?.anchor;
  if (!anchor) return null;
  const el = line.root?.idElements.get(anchor.elementId);
  return el?.type === "forkNode" ? (el as unknown as ForkNode) : null;
}

export function getHeadForkNode(line: BaseLine): ForkNode | null {
  const anchor = line.headPoint?.anchor;
  if (!anchor) return null;
  const el = line.root?.idElements.get(anchor.elementId);
  return el?.type === "forkNode" ? (el as unknown as ForkNode) : null;
}

export function getParentLine(line: BaseLine): BaseLine | null {
  const fk = getHeadForkNode(line);
  if (!fk?.parentLineId) return null;
  return (line.root?.idElements.get(fk.parentLineId) as unknown as BaseLine) ?? null;
}

export function getChildLines(line: BaseLine): BaseLine[] {
  const fk = getTailForkNode(line);
  if (!fk) return [];
  const children: BaseLine[] = [];
  for (const childId of fk.childLineIds) {
    const el = line.root?.idElements.get(childId);
    if (el) children.push(el as unknown as BaseLine);
  }
  return children;
}

export function getCascadeDeleteElements(line: BaseLine): Element[] {
  const result: Element[] = [];
  const tailFork = getTailForkNode(line);
  if (tailFork) result.push(tailFork as unknown as Element);

  const headFork = getHeadForkNode(line);
  if (headFork) {
    const remaining = [...headFork.childLineIds].filter(
      (id) => id !== line.id
    );
    if (remaining.length === 0) {
      result.push(headFork as unknown as Element);
    }
  }
  return result;
}
