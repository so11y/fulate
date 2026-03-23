import type { Root } from "./index";
import type { RectWithCenter } from "@fulate/util";
import { Tween, Easing } from "@tweenjs/tween.js";

export function applyCssTransform(root: Root) {
  if (root.viewport.scale >= root.cssTransformThreshold) {
    syncPaintedViewport(root);
    root.requestRender();
    return;
  }

  const pv = root._paintedViewport;
  const vp = root.viewport;

  const relScale = vp.scale / pv.scale;
  const dx = vp.x - pv.x * relScale;
  const dy = vp.y - pv.y * relScale;

  for (const layer of root.layers) {
    if (!layer.cssTransformable) {
      layer.requestRender();
      continue;
    }
    layer.canvasEl.style.transformOrigin = "0 0";
    layer.canvasEl.style.transform =
      `translate(${dx}px, ${dy}px) scale(${relScale})`;
  }

  root._isCssTransforming = true;

  if (root._cssTransformTimer) clearTimeout(root._cssTransformTimer);
  root._cssTransformTimer = setTimeout(() => {
    flushCssTransform(root);
  }, 150);
}

export function flushCssTransform(root: Root) {
  root._cssTransformTimer = null;
  root._isCssTransforming = false;

  for (const layer of root.layers) {
    if (!layer.cssTransformable) continue;
    layer.canvasEl.style.transform = "";
  }

  syncPaintedViewport(root);
  root.requestRender();
}

export function syncPaintedViewport(root: Root) {
  root._paintedViewport.x = root.viewport.x;
  root._paintedViewport.y = root.viewport.y;
  root._paintedViewport.scale = root.viewport.scale;
}

export function focusNode(
  root: Root,
  rect: RectWithCenter,
  {
    padding = 10,
    animate
  }: {
    padding?: number;
    animate?: { duration?: number; easing?: (amount: number) => number };
  }
): Promise<void> {
  const rulerSize = root.find<{ rulerSize?: number }>("rule")?.rulerSize ?? 0;
  const activeWidth = root.width - rulerSize;
  const activeHeight = root.height - rulerSize;

  const scaleX = (activeWidth - padding * 2) / rect.width;
  const scaleY = (activeHeight - padding * 2) / rect.height;
  const bestScale = Math.min(scaleX, scaleY, 1);

  const visualCenterX = rulerSize + activeWidth / 2;
  const visualCenterY = rulerSize + activeHeight / 2;

  const cx = rect.centerX ?? rect.left + rect.width / 2;
  const cy = rect.centerY ?? rect.top + rect.height / 2;

  const targetX = visualCenterX - cx * bestScale;
  const targetY = visualCenterY - cy * bestScale;

  if (!animate) {
    root.viewport.scale = bestScale;
    root.viewport.x = targetX;
    root.viewport.y = targetY;
    syncPaintedViewport(root);
    root.requestRender();
    return Promise.resolve();
  }

  root._viewportTweenGroup.removeAll();

  const duration = animate.duration ?? 600;
  const easing = animate.easing ?? Easing.Quadratic.InOut;

  return new Promise<void>((resolve) => {
    new Tween(root.viewport, root._viewportTweenGroup)
      .to({ x: targetX, y: targetY, scale: bestScale }, duration)
      .easing(easing)
      .onUpdate(() => root.requestRender())
      .onComplete(() => {
        syncPaintedViewport(root);
        resolve();
        root._viewportTweenGroup.removeAll();
      })
      .start();

    root.requestRender();
  });
}
