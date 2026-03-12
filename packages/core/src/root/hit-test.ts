import type { Root } from "./index";
import type { RBushItem } from "@fulate/core";
import type { Element } from "../node/element";
import { Point } from "@fulate/util";
import { CustomEvent } from "@fulate/util";
import { RectWithCenter } from "@fulate/util";

function dispatchHitEvent(
  root: Root,
  name: string,
  detail: any,
  target: Element,
  editMode: boolean
) {
  detail.target = target;
  if (editMode) {
    root.dispatchEvent(new CustomEvent(name, { detail: { ...detail } }));
  } else {
    target.dispatchEvent(name, detail);
  }
}

export function checkHit(root: Root, point?: Point) {
  if (root.isSpacePressed || root.isPanning) return;
  if (root.hasLockPoint) return;

  if (!point) {
    point = root.getLogicalPosition(
      root.lastPointerPos.x,
      root.lastPointerPos.y
    );
  }

  const prevElement = root.currentElement;
  root.currentElement = undefined;

  searchHitElements(root, point, (element) => {
    root.currentElement = element;
    return true;
  });

  if (
    root.currentElement &&
    (root.currentElement.element?.isSubscribed ||
      root.currentElement.element?.cursor)
  ) {
    root.container.style.cursor =
      root.currentElement.element.cursor || "pointer";
  } else {
    root.container.style.cursor = "default";
  }

  if (root.currentElement?.element !== prevElement?.element) {
    const detail = {
      target: undefined as any,
      x: point.x,
      y: point.y,
      buttons: 0,
      deltaY: 0,
      deltaX: 0
    };
    const isEditMode = root.keyElmenet?.has("select");

    if (prevElement?.element && prevElement.element.isActiveed) {
      dispatchHitEvent(root, "mouseleave", detail, prevElement.element, isEditMode);
    }
    if (
      root.currentElement?.element &&
      root.currentElement.element.isActiveed
    ) {
      dispatchHitEvent(root, "mouseenter", detail, root.currentElement.element, isEditMode);
    }
  }
}

export function searchHitElements(
  root: Root,
  point: Point,
  callback: (element: RBushItem) => any
) {
  const area = {
    left: point.x,
    top: point.y,
    width: 0,
    height: 0
  };
  return searchArea(root, area, (item) => {
    const element = item.element;
    if (element.hasPointHint?.(point)) {
      return callback(item);
    }
  });
}

export function searchArea(
  root: Root,
  area: RectWithCenter,
  callback: (element: RBushItem) => any
) {
  for (let i = root.layers.length - 1; i >= 0; i--) {
    const layer = root.layers[i];
    const hitElements = layer.searchAreaElements(area);
    if (hitElements.length > 0) {
      hitElements.sort((a, b) => b.element.uIndex - a.element.uIndex);
      for (const item of hitElements) {
        const element = item.element;
        if (
          element.isActiveed &&
          element.selectctbale !== false &&
          element.visible
        ) {
          const sc = element.inject("scrollContainer");
          if (sc && sc !== element && !sc.isChildInScrollView(element)) {
            continue;
          }
          const result = callback(item);
          if (result) {
            return result;
          }
        }
      }
    }
  }
}
