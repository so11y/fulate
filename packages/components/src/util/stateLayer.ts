import { ref } from "@vue/runtime-core";
import { colorWithAlpha } from "@fulate/util";
import { MD3 } from "../theme";

const STATE_HOVER_ALPHA = 0.08;
const STATE_PRESS_ALPHA = 0.12;

export function useStateLayer(
  disabled: () => boolean,
  color: () => string = () => MD3.primary
) {
  const layerRef = ref<any>(null);
  const hovered = ref(false);
  const pressed = ref(false);

  function animateTo(bg: string, duration = 150) {
    const el = layerRef.value;
    if (!el?.animate) return;
    el.stopAnimations?.();
    el.animate({ backgroundColor: bg }, { duration, paintOnly: true });
  }

  function onMouseEnter() {
    if (disabled()) return;
    hovered.value = true;
    if (!pressed.value) {
      animateTo(colorWithAlpha(color(), STATE_HOVER_ALPHA), 150);
    }
  }

  function onMouseLeave() {
    hovered.value = false;
    pressed.value = false;
    animateTo("transparent", 200);
  }

  function onPointerDown() {
    if (disabled()) return;
    pressed.value = true;
    animateTo(colorWithAlpha(color(), STATE_PRESS_ALPHA), 100);
  }

  function onPointerUp() {
    if (!pressed.value) return;
    pressed.value = false;
    if (hovered.value) {
      animateTo(colorWithAlpha(color(), STATE_HOVER_ALPHA), 150);
    } else {
      animateTo("transparent", 200);
    }
  }

  return {
    layerRef,
    handlers: {
      onMouseenter: onMouseEnter,
      onMouseleave: onMouseLeave,
      onPointerdown: onPointerDown,
      onPointerup: onPointerUp,
    },
  };
}
