import { Point } from "../../../util/point";
import { degreesToRadians } from "../../../util/radiansDegreesConversion";
import { Element } from "../../node/element";
import { FulateEvent } from "../../../util/event";
import { Layer } from "../../layer";
import type { Select } from "./index";

function checkElement(object: Element, select: Select) {
  if (
    object === select ||
    object.selectctbale === false ||
    object.inject("selectctbale") === false
  )
    return;

  if (object.inject("group")) {
    return;
  }

  if (object.inject("layer").type !== "artboard") {
    if (
      object.inject("layer").parent.type === "artboard" &&
      !(object.parent as Layer).isLayer
    ) {
      return;
    }
  }

  return true;
}

function checkElementIntersects(
  select: Select,
  object: Element
): Element | undefined {
  if (!checkElement(object, select)) {
    return;
  }
  const [tl, , br] = select.getControlCoords();
  if (
    object.visible &&
    (object.intersectsWithRect(tl, br) ||
      object.isContainedWithinRect(tl, br) ||
      object.hasPointHint(tl) ||
      object.hasPointHint(br))
  ) {
    return object;
  }
}

function handleSelect(select: Select, e: FulateEvent) {
  select.selectEls = [];
  const startPoint = new Point(e.detail.x, e.detail.y);
  select.setOptionsSync({
    left: startPoint.x,
    top: startPoint.y,
    width: 0,
    height: 0,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0
  });

  const selectEls = new Set<Element>();

  select.root.searchHitElements(startPoint, ({ element }) => {
    const intersected = checkElementIntersects(select, element);
    if (intersected) selectEls.add(intersected);
  });

  let hasMove = false;
  const pointermove = (e: FulateEvent) => {
    hasMove = true;
    const endPoint = new Point(e.detail.x, e.detail.y);
    select.setOptions({
      left: Math.min(startPoint.x, endPoint.x),
      top: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y)
    });
  };

  select.root.addEventListener("pointermove", pointermove);
  select.root.addEventListener(
    "pointerup",
    () => {
      select.root.removeEventListener("pointermove", pointermove);
      if (hasMove) {
        select.root.searchArea(select, ({ element }) => {
          const intersected = checkElementIntersects(select, element);
          if (intersected) selectEls.add(intersected);
        });
      }
      select.select(Array.from(selectEls));
    },
    { once: true }
  );
}

function handleControl(select: Select, e: FulateEvent) {
  const { control, point } = select.currentControl;

  select.root.history.snapshot(select.selectEls);

  const theta = degreesToRadians(select.angle ?? 0);
  const selectPrevState = {
    theta,
    angle: select.angle ?? 0,
    width: select.width,
    height: select.height,
    left: select.left,
    top: select.top,
    worldCenterPoint: select.getWorldCenterPoint(),
    matrix: DOMMatrix.fromMatrix(select.getOwnMatrix())
  };

  const pointermove = (e: FulateEvent) => {
    control.onDrag(select, point, selectPrevState, e);
  };

  select.root.addEventListener("pointermove", pointermove);
  select.root.addEventListener(
    "pointerup",
    () => {
      select.root.removeEventListener("pointermove", pointermove);
      select.root.history.commit();
    },
    { once: true }
  );
}

function handleSelectMove(select: Select, e: FulateEvent) {
  const startPoint = new Point(e.detail.x, e.detail.y);

  select.root.history.snapshot(select.selectEls);
  select.snapTool?.start(select.selectEls.concat(select as any));

  const originalSelectLeft = select.left;
  const originalSelectTop = select.top;
  const coords = select.getParentCoords();

  const pointermove = (ev: FulateEvent) => {
    const current = new Point(ev.detail.x, ev.detail.y);
    let dx = current.x - startPoint.x;
    let dy = current.y - startPoint.y;

    const snapResult = select.snapTool?.detect(coords, dx, dy);
    if (snapResult) {
      dx += snapResult.dx;
      dy += snapResult.dy;
    }

    select.setOptions({
      left: originalSelectLeft + dx,
      top: originalSelectTop + dy
    });
  };

  select.root.addEventListener("pointermove", pointermove);
  select.root.addEventListener(
    "pointerup",
    () => {
      select.root.removeEventListener("pointermove", pointermove);
      select.snapTool?.stop();
      select.root.history.commit();
    },
    { once: true }
  );
}

export function setupInteraction(select: Select): () => void {
  const pointerdown = (e: FulateEvent) => {
    const hasSelection =
      select.selectEls.length > 0 &&
      select.root.getCurrnetEelement()?.element === select;
    select.hoverElement = null;

    if (!hasSelection) {
      handleSelect(select, e);
      return;
    }

    if (select.currentControl) {
      handleControl(select, e);
    } else {
      handleSelectMove(select, e);
    }
  };

  const mouseenter = (e: FulateEvent) => {
    select.hoverElement = e.detail.target;
    select.markDirty();
  };

  const mouseleave = () => {
    const prev = select.hoverElement;
    select.hoverElement = null;
    if (prev) {
      select.markDirty();
    }
  };

  select.root.addEventListener("pointerdown", pointerdown);
  select.root.addEventListener("mouseenter", mouseenter);
  select.root.addEventListener("mouseleave", mouseleave);

  return () => {
    select.root.removeEventListener("pointerdown", pointerdown);
    select.root.removeEventListener("mouseenter", mouseenter);
    select.root.removeEventListener("mouseleave", mouseleave);
  };
}
