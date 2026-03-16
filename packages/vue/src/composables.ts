import { inject, onMounted, onUnmounted, type Ref } from "@vue/runtime-core";

export function useOverlay() {
  return {
    overlay: inject<any>("__fulate_overlay", null),
    fulateRoot: inject<any>("__fulate_root", null),
  };
}

export function useVueShapeSize() {
  return inject<{ width: number; height: number }>("__vueShapeSize", {
    width: 0,
    height: 0,
  });
}

export function isDescendantOf(node: any, ancestor: any): boolean {
  let cur = node;
  while (cur) {
    if (cur === ancestor) return true;
    cur = cur.parent;
  }
  return false;
}

export function useOutsideClick(
  open: Ref<boolean>,
  excludeRefs: Ref<any>[],
  onClose: () => void
) {
  const { fulateRoot } = useOverlay();
  let removeListener: (() => void) | null = null;

  function onRootPointerDown(e: any) {
    if (!open.value) return;
    const target = e.detail?.target;
    if (!target) return;
    for (const r of excludeRefs) {
      if (isDescendantOf(target, r.value)) return;
    }
    onClose();
  }

  onMounted(() => {
    removeListener = fulateRoot?.addEventListener(
      "pointerdown",
      onRootPointerDown
    );
  });

  onUnmounted(() => {
    removeListener?.();
    removeListener = null;
  });
}

export function syncPosition(
  triggerEl: any,
  floatingEl: any,
  gap: number = 4
) {
  if (!triggerEl || !floatingEl) return;
  const m = triggerEl.getOwnMatrix?.();
  if (!m) return;
  floatingEl.left = m.e;
  floatingEl.top = m.f + (triggerEl.height ?? 0) + gap;
  floatingEl.markDirty?.();
}
