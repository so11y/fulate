import { Point, Intersection } from "@fulate/util";
import { degreesToRadians } from "@fulate/util";
import { Element } from "@fulate/core";
import { FulateEvent } from "@fulate/core";
import type { Select } from "./index";
import type { ElementSnapshot } from "./controls";
import { checkElement } from "./checkElement";

function snapshotElements(els: Element[]): ElementSnapshot[] {
  return els.map((el) => {
    el.calcWorldMatrix();
    el.snapshotForGroup();
    return {
      el,
      matrix: DOMMatrix.fromMatrix(el.getOwnMatrix()),
      worldCenterPoint: el.getWorldCenterPoint(),
      width: el.width,
      height: el.height,
      scaleX: el.scaleX,
      scaleY: el.scaleY
    };
  });
}

function checkElementIntersects(
  select: Select,
  object: Element
): Element | undefined {
  const resolved = checkElement(object, [select]);
  if (!resolved || !object.visible) return;
  const [tl, , br] = select.getControlCoords();

  if (
    Intersection.isContainedInRect(object.getBoundingRect(), tl, br) ||
    Intersection.intersectPolygonRectangle(object.getCoords(), tl, br)
      .status === "Intersection" ||
    object.hasPointHint(tl) ||
    object.hasPointHint(br)
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

  const hitEls = Array.from(selectEls);
  if (hitEls.length === 1 && (hitEls[0] as any).immediatelyDraggable) {
    select.select([hitEls[0]]);
    handleSelectMove(select, e);
    return;
  }

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
        select.select(Array.from(selectEls));
      } else {
        const els = Array.from(selectEls);
        select.select(els.length ? [els[0]] : []);
      }
    },
    { once: true }
  );
}

function handleControl(select: Select, e: FulateEvent) {
  const { control, point } = select.currentControl;
  const schema = select.getActiveSchema();

  select.history.snapshot(select.selectEls);

  const theta = degreesToRadians(select.angle ?? 0);
  const snapshots = snapshotElements(select.selectEls);

  const selectPrevState = {
    theta,
    angle: select.angle ?? 0,
    width: select.width,
    height: select.height,
    left: select.left,
    top: select.top,
    worldCenterPoint: select.getWorldCenterPoint(),
    matrix: DOMMatrix.fromMatrix(select.getOwnMatrix()),
    snapshots
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
      const updated = new Set();
      for (const el of select.selectEls) {
        if (el.groupParent && !updated.has(el.groupParent)) {
          updated.add(el.groupParent);
          el.groupParent.markBoundingBoxDirty();
        }
      }
      select.history.commit();
    },
    { once: true }
  );
}

function handleSelectMove(select: Select, e: FulateEvent, forceDisableSnap = false) {
  const startPoint = new Point(e.detail.x, e.detail.y);

  select.history.snapshot(select.selectEls);
  const schema = select.getActiveSchema();
  const snapExcludes = schema.getSnapExcludes?.(select);
  const disableSnap = forceDisableSnap || snapExcludes?.disableSnap === true;
  if (!disableSnap) {
    const excludeEls = select.selectEls.concat(select as any);
    if (snapExcludes?.excludeElements) {
      excludeEls.push(...snapExcludes.excludeElements);
    }
    select.snapTool?.start(excludeEls, snapExcludes?.excludePoints);
  }

  const originalSelectLeft = select.left;
  const originalSelectTop = select.top;

  const originalPositions = select.selectEls.map((el) => ({
    el,
    left: el.left,
    top: el.top
  }));

  const coords =
    select.selectEls.length === 1
      ? select.selectEls[0].getSnapPoints()
      : select.getParentCoords();

  const pointermove = (ev: FulateEvent) => {
    let dx = ev.detail.x - startPoint.x;
    let dy = ev.detail.y - startPoint.y;

    if (!disableSnap) {
      const snapResult = select.snapTool?.detect(coords, dx, dy);
      if (snapResult) {
        dx += snapResult.dx;
        dy += snapResult.dy;
      }
    }

    for (const pos of originalPositions) {
      pos.el.setOptions({
        left: pos.left + dx,
        top: pos.top + dy
      });
    }
    select.updateSelectFrame({
      left: originalSelectLeft + dx,
      top: originalSelectTop + dy
    });
  };

  select.root.addEventListener("pointermove", pointermove);
  select.root.addEventListener(
    "pointerup",
    () => {
      select.root.removeEventListener("pointermove", pointermove);
      if (!disableSnap) select.snapTool?.stop();
      const updated = new Set();
      for (const el of select.selectEls) {
        (el as any).onSelectMoveEnd?.();
        if (el.groupParent && !updated.has(el.groupParent)) {
          updated.add(el.groupParent);
          el.groupParent.markBoundingBoxDirty();
        }
      }
      select.history.commit();
    },
    { once: true }
  );
}

export function setupInteraction(select: Select): () => void {
  const container = select.root.container;
  if (!container.hasAttribute("tabindex")) {
    container.tabIndex = -1;
    container.style.outline = "none";
  }

  const pointerdown = (e: FulateEvent) => {
    container.focus({ preventScroll: true });

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
    if (e.detail.target === select) return;

    let resolved = checkElement(e.detail.target, [select]);

    if (!resolved) {
      let p = e.detail.target.parent;
      while (p) {
        if ((p as any).isLayer || p === (select as any)) break;
        resolved = checkElement(p as Element, [select]);
        if (resolved) break;
        p = p.parent;
      }
    }

    const prev = select.hoverElement;
    select.hoverElement = resolved ?? null;
    if (select.hoverElement !== prev) {
      select.markPaintDirty();
    }
  };

  const mouseleave = () => {
    if (!select.hoverElement) return;
    if (select.root.getCurrnetEelement()) return;
    select.hoverElement = null;
    select.markPaintDirty();
  };

  const keydown = (e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && (e.key === "z" || e.key === "y")) {
      e.preventDefault();
      if (e.key === "y") {
        select.history.redo();
      } else {
        select.history.undo();
      }
      return;
    }

    if (isCtrl && e.key === "g") {
      e.preventDefault();
      if (e.shiftKey) {
        select.unGroup();
      } else {
        select.doGroup();
      }
      return;
    }

    if (isCtrl && e.key === "c") {
      e.preventDefault();
      select.copy();
      return;
    }

    if (isCtrl && e.key === "v") {
      e.preventDefault();
      select.paste();
      return;
    }

    if (isCtrl && e.key === "a") {
      e.preventDefault();
      const allElements = new Set<Element>();
      for (const layer of select.root.layers) {
        const items = layer.rbush.all();
        for (const item of items) {
          const el = item.element;
          if (!el.isActiveed || !el.visible) continue;
          const resolved = checkElement(el, [select]);
          if (resolved) allElements.add(resolved);
        }
      }
      select.select(Array.from(allElements));
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      select.select([]);
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      select.delete();
      return;
    }

    if (
      (e.key === "ArrowUp" || e.key === "ArrowDown" ||
       e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      select.selectEls.length > 0
    ) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;

      handleSelectMove(select, { detail: { x: 0, y: 0 } } as any, true);
      select.root.dispatchEvent("pointermove", { x: dx, y: dy });
      select.root.dispatchEvent("pointerup", { x: dx, y: dy });
    }
  };

  const dblclick = () => {
    if (select.selectEls.length !== 1) return;
    const el = select.selectEls[0];

    if (select.canDiveIn(el)) {
      const point = select.root.viewport.getLogicalPosition(
        select.root.lastPointerPos.x,
        select.root.lastPointerPos.y
      );
      let hitChild: Element | undefined;
      select.root.searchHitElements(point, ({ element }) => {
        const container =
          element.groupParent ?? element.inject("diveInContainer");
        if (container === el) {
          hitChild = element;
          return true;
        }
      });
      if (hitChild) {
        select.select([hitChild]);
        return;
      }
    }

    if (typeof (el as any).enterEditing === "function") {
      (el as any).enterEditing();
      select.select([]);
    }
  };

  select.root.addEventListener("pointerdown", pointerdown);
  select.root.addEventListener("mouseenter", mouseenter);
  select.root.addEventListener("mouseleave", mouseleave);
  select.root.container.addEventListener("keydown", keydown);
  select.root.container.addEventListener("dblclick", dblclick);

  return () => {
    select.root.removeEventListener("pointerdown", pointerdown);
    select.root.removeEventListener("mouseenter", mouseenter);
    select.root.removeEventListener("mouseleave", mouseleave);
    select.root.container.removeEventListener("keydown", keydown);
    select.root.container.removeEventListener("dblclick", dblclick);
  };
}
