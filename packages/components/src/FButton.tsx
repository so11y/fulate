import {
  defineComponent,
  ref,
  computed,
  type PropType
} from "@vue/runtime-core";
import { Display, Justify, Align } from "@fulate/yoga";
import { ColorUtil } from "@fulate/util";
import { MD3 } from "./theme";

type ButtonVariant = "filled" | "outlined" | "text";

let _measureCtx: CanvasRenderingContext2D | null = null;
function measureText(
  text: string,
  fontSize: number,
  fontWeight: number = 500
): number {
  if (!_measureCtx)
    _measureCtx = document.createElement("canvas").getContext("2d")!;
  _measureCtx.font = `${fontWeight} ${fontSize}px ${MD3.fontFamily}`;
  return Math.ceil(_measureCtx.measureText(text).width);
}

function getRestBg(variant: ButtonVariant, color: string, disabled: boolean) {
  if (disabled)
    return variant === "filled" ? MD3.surfaceContainer : MD3.surface;
  if (variant === "filled") return color;
  if (variant === "outlined") return MD3.surface;
  return "rgba(0,0,0,0)";
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
    const hovered = ref(false);
    const isPressed = ref(false);

    const paddingH = computed(() => (props.variant === "text" ? 16 : 24));

    const autoWidth = computed(() => {
      if (props.width) return props.width;
      const textW = measureText(props.label, props.fontSize, 500);
      return Math.max(64, textW + paddingH.value * 2);
    });

    function animateBg(target: string, duration = 150) {
      const el = divRef.value;
      if (!el?.animate) return;
      el.stopAnimations?.();
      el.animate({ backgroundColor: target }, { duration });
    }

    function getTextColor() {
      if (props.disabled) return MD3.onSurfaceVariant;
      if (props.variant === "filled") return "#ffffff";
      return props.color;
    }

    function getBorder() {
      if (props.variant === "outlined" && !props.disabled) return MD3.outline;
      if (props.variant === "outlined" && props.disabled)
        return MD3.outlineVariant;
      return null;
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
        borderColor={getBorder()}
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
          animateBg(getPressBg(props.variant, props.color), 100);
        }}
        onPointerup={() => {
          if (!isPressed.value) return;
          isPressed.value = false;
          const target = hovered.value
            ? getHoverBg(props.variant, props.color)
            : getRestBg(props.variant, props.color, props.disabled);
          animateBg(target, 200);
        }}
        onMouseenter={() => {
          if (props.disabled) return;
          hovered.value = true;
          if (!isPressed.value) {
            animateBg(getHoverBg(props.variant, props.color), 150);
          }
        }}
        onMouseleave={() => {
          hovered.value = false;
          if (!isPressed.value) {
            animateBg(
              getRestBg(props.variant, props.color, props.disabled),
              200
            );
          }
        }}
      >
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
