import { reactive, markRaw } from "vue";
import type { Root, Artboard, Element } from "@fulate/core";
import { isGradient } from "@fulate/core";
import type { Select } from "@fulate/tools";

export const store = reactive({
  root: null as Root | null,
  artboard: null as Artboard | null,
  select: null as Select | null,

  selectedElements: [] as Element[],
  selectedProps: null as Record<string, any> | null,

  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
  },

  viewportScale: 1,
});

export function refreshSelection() {
  const select = store.select;
  if (!select) return;

  store.selectedElements = [...select.selectEls];
  store.viewportScale = store.root?.viewport.scale ?? 1;

  if (select.selectEls.length === 1) {
    const el = select.selectEls[0];
    const bg = (el as any).backgroundColor ?? null;
    const bgIsGradient = bg !== null && isGradient(bg);
    store.selectedProps = {
      type: el.type,
      left: Math.round(el.left),
      top: Math.round(el.top),
      width: Math.round(el.width ?? 0),
      height: Math.round(el.height ?? 0),
      angle: Math.round(el.angle ?? 0),
      opacity: (el as any).opacity ?? 1,
      backgroundColor: bgIsGradient ? null : bg,
      backgroundGradient: bgIsGradient ? bg : null,
      borderColor: (el as any).borderColor ?? null,
      borderWidth: (el as any).borderWidth ?? 0,
      radius: (el as any).radius ?? 0,
      text: (el as any).text,
      fontSize: (el as any).fontSize,
      color: (el as any).color,
      visible: el.visible,
    };
  } else if (select.selectEls.length > 1) {
    store.selectedProps = {
      type: `${select.selectEls.length} 个元素`,
      left: Math.round(select.left),
      top: Math.round(select.top),
      width: Math.round(select.width ?? 0),
      height: Math.round(select.height ?? 0),
    };
  } else {
    store.selectedProps = null;
  }
}
