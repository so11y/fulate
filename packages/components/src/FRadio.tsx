import {
  defineComponent,
  computed,
  inject,
  provide,
  type PropType
} from "@vue/runtime-core";
import { Display, FlexDirection, Align, Justify } from "@fulate/yoga";
import { MD3 } from "./theme";
import { useStateLayer } from "./util";

const RADIO_SIZE = 20;
const RADIO_INNER = 10;
const STATE_LAYER_SIZE = 40;

export const FRadioGroup = defineComponent({
  name: "FRadioGroup",
  props: {
    modelValue: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    direction: {
      type: String as PropType<"row" | "column">,
      default: "column"
    },
    gap: { type: Number, default: 4 }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, slots }) {
    provide(
      "__fulate_radio_value",
      computed(() => props.modelValue)
    );
    provide(
      "__fulate_radio_disabled",
      computed(() => props.disabled)
    );
    provide("__fulate_radio_change", (val: string) => {
      emit("update:modelValue", val);
    });

    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={
          props.direction === "row" ? FlexDirection.Row : FlexDirection.Column
        }
        gap={props.gap}
      >
        {slots.default?.()}
      </f-div>
    );
  }
});

export const FRadio = defineComponent({
  name: "FRadio",
  props: {
    value: { type: String, required: true },
    label: { type: String, default: "" },
    disabled: { type: Boolean, default: false }
  },
  setup(props) {
    const groupValue = inject<any>("__fulate_radio_value", null);
    const groupDisabled = inject<any>("__fulate_radio_disabled", null);
    const groupChange = inject<any>("__fulate_radio_change", null);

    const isDisabled = computed(() => props.disabled || groupDisabled?.value);
    const isSelected = computed(() => groupValue?.value === props.value);

    const { layerRef, handlers } = useStateLayer(
      () => isDisabled.value,
      () => (isSelected.value ? MD3.primary : MD3.onSurface)
    );

    function onClick() {
      if (isDisabled.value) return;
      groupChange?.(props.value);
    }

    function getCircleColor() {
      if (isDisabled.value) return MD3.outlineVariant;
      if (isSelected.value) return MD3.primary;
      return MD3.outline;
    }

    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        alignItems={Align.Center}
        gap={0}
        height={STATE_LAYER_SIZE}
        cursor={isDisabled.value ? "default" : "pointer"}
        onClick={onClick}
      >
        {/* State layer + indicator */}
        <f-div
          ref={layerRef}
          width={STATE_LAYER_SIZE}
          height={STATE_LAYER_SIZE}
          flexShrink={0}
          radius={STATE_LAYER_SIZE / 2}
          backgroundColor="transparent"
          {...handlers}
        >
          <f-rectangle
            left={(STATE_LAYER_SIZE - RADIO_SIZE) / 2}
            top={(STATE_LAYER_SIZE - RADIO_SIZE) / 2}
            width={RADIO_SIZE}
            height={RADIO_SIZE}
            radius={RADIO_SIZE / 2}
            borderColor={getCircleColor()}
            borderWidth={isSelected.value ? 2 : 1.5}
            borderPosition="inside"
            backgroundColor="transparent"
          />
          {isSelected.value && (
            <f-rectangle
              left={(STATE_LAYER_SIZE - RADIO_INNER) / 2}
              top={(STATE_LAYER_SIZE - RADIO_INNER) / 2}
              width={RADIO_INNER}
              height={RADIO_INNER}
              radius={RADIO_INNER / 2}
              backgroundColor={
                isDisabled.value ? MD3.outlineVariant : MD3.primary
              }
            />
          )}
        </f-div>

        {props.label && (
          <f-span
            text={props.label}
            fontSize={MD3.fontSize}
            fontFamily={MD3.fontFamily}
            color={isDisabled.value ? MD3.onSurfaceVariant : MD3.onSurface}
          />
        )}
      </f-div>
    );
  }
});
