import { Point } from "../../../util/point";
import { degreesToRadians } from "../../../util/radiansDegreesConversion";
import { Element } from "../../node/element";
import { FulateEvent } from "../../../util/event";
import type { Select } from "./index";
import { checkElement } from "./checkElement";

function checkElementIntersects(
  select: Select,
  object: Element
): Element | undefined {
  const resolved = checkElement(object, [select]);
  if (!resolved) return;
  const [tl, , br] = select.getControlCoords();
  if (
    object.visible &&
    (object.intersectsWithRect(tl, br) ||
      object.isContainedWithinRect(tl, br) ||
      object.hasPointHint(tl) ||
      object.hasPointHint(br))
  ) {
    return resolved;
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
  const schema = select.getActiveSchema();

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

  let dragStarted = false;
  const pointermove = (e: FulateEvent) => {
    if (!dragStarted) {
      schema.onDragStart?.(select, control);
      dragStarted = true;
    }
    control.onDrag(select, point, selectPrevState, e);
  };

  select.root.addEventListener("pointermove", pointermove);
  select.root.addEventListener(
    "pointerup",
    () => {
      select.root.removeEventListener("pointermove", pointermove);
      if (dragStarted) {
        schema.onDragEnd?.(select, control);
      }
      select.root.history.commit();
    },
    { once: true }
  );
}

function handleSelectMove(select: Select, e: FulateEvent) {
  const startPoint = new Point(e.detail.x, e.detail.y);

  select.root.history.snapshot(select.selectEls);
  const schema = select.getActiveSchema();
  const snapExcludes = schema.getSnapExcludes?.(select);
  select.snapTool?.start(
    select.selectEls.concat(select as any),
    snapExcludes?.excludePoints
  );

  const originalSelectLeft = select.left;
  const originalSelectTop = select.top;
  const coords =
    select.selectEls.length === 1
      ? select.selectEls[0].getSnapPoints()
      : select.getParentCoords();

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
    const lineTool = select.root.keyElmenet?.get("lineTool") as any;
    if (lineTool?.isDrawingMode) return;

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
    // const element = checkElement(e.detail.target);
    if (e.detail.target === select) {
      return;
    }
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
