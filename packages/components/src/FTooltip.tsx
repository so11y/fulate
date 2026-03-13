import {
  defineComponent,
  ref,
  nextTick,
  inject,
  Teleport,
  onMounted,
  onUnmounted,
} from "@vue/runtime-core";
import { MD3 } from "./theme";
import { isDescendantOf, syncPosition } from "./util";

export const FTooltip = defineComponent({
  name: "FTooltip",
  props: {
    visible: { type: Boolean, default: false },
    triggerRef: { type: Object, default: null },
    width: { type: Number, default: 200 },
    maxHeight: { type: Number, default: undefined },
    gap: { type: Number, default: 4 },
  },
  emits: ["clickOutside"],
  setup(props, { emit, slots }) {
    const overlay = inject<any>("__fulate_overlay", null);
    const fulateRoot = inject<any>("__fulate_root", null);
    const floatingRef = ref<any>(null);

    let removeListener: (() => void) | null = null;

    function onRootPointerDown(e: any) {
      if (!props.visible) return;
      const target = e.detail?.target;
      if (!target) return;
      const triggerEl = props.triggerRef?.value ?? props.triggerRef;
      if (isDescendantOf(target, triggerEl)) return;
      if (isDescendantOf(target, floatingRef.value)) return;
      emit("clickOutside");
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

    return () => {
      if (!props.visible) return null;

      nextTick(() => {
        const triggerEl = props.triggerRef?.value ?? props.triggerRef;
        syncPosition(triggerEl, floatingRef.value, props.gap);
        const el = floatingRef.value;
        if (el) el.opacity = 1;
      });

      const panel = (
        <f-scrollview
          ref={floatingRef}
          width={props.width}
          maxHeight={props.maxHeight}
          opacity={0}
          backgroundColor={MD3.surface}
          radius={MD3.radiusSm}
          borderColor={MD3.outlineVariant}
          borderWidth={0.5}
          borderPosition="inside"
          scrollbarSize={4}
          scrollbarColor="rgba(0,0,0,0.15)"
        >
          {slots.default?.()}
        </f-scrollview>
      );

      return overlay
        ? <Teleport to={overlay}>{panel}</Teleport>
        : panel;
    };
  }
});
