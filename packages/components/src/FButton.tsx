import {
  defineComponent,
  ref,
  computed,
  type PropType
} from "@vue/runtime-core";
import { Display, Justify, Align } from "@fulate/yoga";
import { ColorUtil } from "@fulate/util";
import { MD3 } from "./theme";
import { measureText } from "./util";

type ButtonVariant = "filled" | "outlined" | "text";

function getRestBg(variant: ButtonVariant, color: string, disabled: boolean) {
  if (disabled)
    return variant === "filled" ? MD3.surfaceContainer : MD3.surface;
  if (variant === "filled") return color;
  if (variant === "outlined") return MD3.surface;
  return "rgba(255,255,255,0)";
}

function getHoverBg(variant: ButtonVariant, color: string) {
  if (variant === "filled")
    return ColorUtil.blend(color, "#ffffff", MD3.stateHoverOpacity);
  return ColorUtil.blend(MD3.surface, color, MD3.stateHoverOpacity);
}

function getPressBg(variant: ButtonVariant, color: string) {
  if (variant === "filled")
    return ColorUtil.blend(color, "#ffffff", MD3.statePressOpacity);
  return ColorUtil.blend(MD3.surface, color, MD3.statePressOpacity);
}

export const FButton = defineComponent({
  name: "FButton",
  props: {
    label: { type: String, default: "Button" },
    variant: { type: String as PropType<ButtonVariant>, default: "filled" },
    color: { type: String, default: MD3.primary },
    disabled: { type: Boolean, default: false },
    width: { type: Number, default: undefined },
    height: { type: Number, default: 40 },
    fontSize: { type: Number, default: MD3.fontSize }
  },
  emits: ["press"],
  setup(props, { emit }) {
    const divRef = ref<any>(null);
    const rippleRef = ref<any>(null);
    const hovered = ref(false);
    const isPressed = ref(false);

    const paddingH = computed(() => (props.variant === "text" ? 16 : 24));

    const autoWidth = computed(() => {
      if (props.width) return props.width;
      const textW = measureText(props.label, props.fontSize, 500);
      return Math.max(64, textW + paddingH.value * 2);
    });

    function animateEl(target: Record<string, any>, duration = 150) {
      const el = divRef.value;
      if (!el?.animate) return;
      el.stopAnimations?.();
      el.animate(target, { duration, paintOnly: true });
    }

    function getTextColor() {
      if (props.disabled) return MD3.onSurfaceVariant;
      if (props.variant === "filled") return "#ffffff";
      return props.color;
    }

    function getRestBorderColor() {
      if (props.variant === "outlined" && !props.disabled) return MD3.outline;
      if (props.variant === "outlined" && props.disabled)
        return MD3.outlineVariant;
      return null;
    }

    function getHoverBorderColor() {
      if (props.variant === "outlined") return props.color;
      return null;
    }

    function getRestState() {
      const bg = getRestBg(props.variant, props.color, props.disabled);
      const border = getRestBorderColor();
      return border ? { backgroundColor: bg, borderColor: border } : { backgroundColor: bg };
    }

    function getHoverState() {
      const bg = getHoverBg(props.variant, props.color);
      const border = getHoverBorderColor();
      return border ? { backgroundColor: bg, borderColor: border } : { backgroundColor: bg };
    }

    function getPressState() {
      const bg = getPressBg(props.variant, props.color);
      const border = props.variant === "outlined" ? props.color : null;
      return border ? { backgroundColor: bg, borderColor: border } : { backgroundColor: bg };
    }

    function getRippleColor() {
      if (props.variant === "filled") return "#ffffff";
      return props.color;
    }

    return () => (
      <f-div
        ref={divRef}
        display={Display.Flex}
        justifyContent={Justify.Center}
        alignItems={Align.Center}
        width={autoWidth.value}
        height={props.height}
        flexShrink={0}
        backgroundColor={getRestBg(props.variant, props.color, props.disabled)}
        borderColor={getRestBorderColor()}
        borderWidth={props.variant === "outlined" ? 1 : 0}
        radius={MD3.radiusFull}
        paddingLeft={paddingH.value}
        paddingRight={paddingH.value}
        cursor={props.disabled ? "default" : "pointer"}
        onClick={() => {
          if (!props.disabled) emit("press");
        }}
        onPointerdown={(e: any) => {
          if (props.disabled) return;
          isPressed.value = true;
          rippleRef.value?.trigger(e.detail.x, e.detail.y);
        }}
        onPointerup={() => {
          if (!isPressed.value) return;
          isPressed.value = false;
        }}
        onMouseenter={() => {
          if (props.disabled) return;
          hovered.value = true;
          if (!isPressed.value) {
            animateEl(getHoverState(), 150);
          }
        }}
        onMouseleave={() => {
          hovered.value = false;
          if (!isPressed.value) {
            animateEl(getRestState(), 200);
          }
        }}
      >
        <f-ripple
          ref={rippleRef}
          rippleColor={getRippleColor()}
          rippleOpacity={MD3.rippleOpacity}
          duration={400}
        />
        <f-text
          text={props.label}
          color={getTextColor()}
          fontSize={props.fontSize}
          fontFamily={MD3.fontFamily}
          fontWeight={500}
          textAlign="center"
          verticalAlign="middle"
        />
      </f-div>
    );
  }
});
