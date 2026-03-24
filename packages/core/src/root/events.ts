import { CustomEvent } from "../event";
import type { Root } from "./index";
import { applyCssTransform } from "./viewport";
import { checkHit } from "./hit-test";

export function initRootEvents(root: Root) {
  const abortController = new AbortController();
  const { signal } = abortController;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      root.isSpacePressed = true;
      root.container.style.cursor = "grab";
      if (root.currentElement) {
        root.currentElement = undefined;
        root.requestRender();
      }
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      root.isSpacePressed = false;
      root.isPanning = false;
      root.container.style.cursor = "default";
    }
  };

  document.addEventListener("keydown", onKeyDown, { signal });
  document.addEventListener("keyup", onKeyUp, { signal });

  document.addEventListener(
    "pointermove",
    (e) => {
      if (root.isPanning) {
        const dx = e.clientX - root.lastPointerPos.x;
        const dy = e.clientY - root.lastPointerPos.y;
        root.viewport.x += dx;
        root.viewport.y += dy;
        root.lastPointerPos.x = e.clientX;
        root.lastPointerPos.y = e.clientY;

        root.dispatchEvent(new CustomEvent("translation"));
        applyCssTransform(root);
      } else {
        root.lastPointerPos.x = e.clientX;
        root.lastPointerPos.y = e.clientY;
        checkHit(root);
        root._notify(e, "pointermove");
      }
    },
    { signal }
  );

  root.container.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;

      root.lastPointerPos.x = e.clientX;
      root.lastPointerPos.y = e.clientY;

      if (root.isSpacePressed) {
        root.isPanning = true;
        root.container.setPointerCapture(e.pointerId);
      } else {
        checkHit(root);
        root.hasLockPoint = true;
        root._notify(e, "pointerdown");
      }
    },
    { signal }
  );

  document.addEventListener(
    "pointerup",
    (e) => {
      if (root.isPanning) {
        root.isPanning = false;
        root.container.releasePointerCapture(e.pointerId);
      } else {
        root._notify(e, "pointerup");
        root.hasLockPoint = false;
      }
    },
    { signal }
  );

  root.container.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const el = root.currentElement?.element;
      const sc = el
        ? (el as any).isScrollContainer
          ? el
          : el.inject?.("scrollContainer")
        : null;
      if (sc && (sc as any).isScrollContainer) {
        (sc as any).scrollBy(e.deltaX, e.deltaY);
        root.lastPointerPos.x = e.clientX;
        root.lastPointerPos.y = e.clientY;
        checkHit(root);
        return;
      }

      const rect = root.containerRect;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const prevScale = root.viewport.scale;
      const newScale = Math.max(0.1, Math.min(10, prevScale * factor));

      root.viewport.x = cx - ((cx - root.viewport.x) * newScale) / prevScale;
      root.viewport.y = cy - ((cy - root.viewport.y) * newScale) / prevScale;
      root.viewport.scale = newScale;

      root.dispatchEvent(new CustomEvent("wheel"));

      applyCssTransform(root);

      root.lastPointerPos.x = e.clientX;
      root.lastPointerPos.y = e.clientY;
    },
    { signal, passive: false }
  );

  document.addEventListener("click", (e) => root._notify(e, "click"), {
    signal
  });

  root.container.addEventListener(
    "dblclick",
    () => {
      const select = root.keyElmenet?.get("select");
      if (select) return;
      const el = root.currentElement?.element as any;
      if (typeof el?.enterEditing === "function") {
        el.enterEditing();
      }
    },
    { signal }
  );

  root.addEventListener("unmounted", () => abortController.abort());
}
