import { Element } from "@fulate/core";
import { Layer } from "@fulate/core";

/**
 * Resolve the selectable/interactable element from a leaf node.
 * If the element is inside a group, resolves to the root group via inject.
 * Returns the resolved element or undefined if the element should be skipped.
 */
export function checkElement(
  object: Element,
  excludes: Element[] = []
): Element | undefined {
  if (
    excludes.includes(object) ||
    object.selectctbale === false ||
    object.inject("selectctbale") === false
  )
    return;

  if ((object as any).isLayer || object.type === "artboard") return;

  let resolved: Element = object;
  let group = resolved.inject("group") as Element | undefined;
  while (group) {
    resolved = group;
    group = resolved.inject("group") as Element | undefined;
  }

  const layer = object.inject("layer") as any;
  if (layer?.type !== "artboard") {
    if (
      layer?.parent?.type === "artboard" &&
      !(object.parent as Layer).isLayer
    ) {
      return;
    }
  } else {
    if (object.parent !== layer) {
      return;
    }
  }

  return resolved;
}
