import {
  defineComponent,
  computed,
  inject,
  provide,
  type PropType
} from "@vue/runtime-core";
import { Display, FlexDirection, Align } from "@fulate/yoga";
import { MD3 } from "./theme";
import { useStateLayer } from "./util";

const CHECK_SIZE = 18;
const STATE_LAYER_SIZE = 40;

export const FCheckboxGroup = defineComponent({
  name: "FCheckboxGroup",
  props: {
    modelValue: {
      type: Array as PropType<string[]>,
      default: () => []
    },
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
      "__fulate_checkbox_value",
      computed(() => props.modelValue)
    );
    provide(
      "__fulate_checkbox_disabled",
      computed(() => props.disabled)
    );
    provide("__fulate_checkbox_toggle", (val: string) => {
      const current = [...props.modelValue];
      const idx = current.indexOf(val);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(val);
      }
      emit("update:modelValue", current);
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

export const FCheckbox = defineComponent({
  name: "FCheckbox",
  props: {
    value: { type: String, default: "" },
    label: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    modelValue: { type: Boolean, default: undefined }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const groupValue = inject<any>("__fulate_checkbox_value", null);
    const groupDisabled = inject<any>("__fulate_checkbox_disabled", null);
    const groupToggle = inject<any>("__fulate_checkbox_toggle", null);

    const isDisabled = computed(() => props.disabled || groupDisabled?.value);

    const isChecked = computed(() => {
      if (groupValue) {
        return groupValue.value?.includes(props.value) ?? false;
      }
      return !!props.modelValue;
    });

    const { layerRef, handlers } = useStateLayer(
      () => isDisabled.value,
      () => (isChecked.value ? MD3.primary : MD3.onSurface)
    );

    function onClick() {
      if (isDisabled.value) return;
      if (groupToggle) {
        groupToggle(props.value);
      } else {
        emit("update:modelValue", !props.modelValue);
      }
    }

    function getBoxBorderColor() {
      if (isDisabled.value) return MD3.outlineVariant;
      if (isChecked.value) return MD3.primary;
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
            left={(STATE_LAYER_SIZE - CHECK_SIZE) / 2}
            top={(STATE_LAYER_SIZE - CHECK_SIZE) / 2}
            width={CHECK_SIZE}
            height={CHECK_SIZE}
            radius={MD3.radiusSm}
            borderColor={getBoxBorderColor()}
            borderWidth={isChecked.value ? 0 : 1.5}
            borderPosition="inside"
            backgroundColor={
              isChecked.value
                ? isDisabled.value
                  ? MD3.outlineVariant
                  : MD3.primary
                : "transparent"
            }
          />
          {isChecked.value && (
            <f-text
              left={(STATE_LAYER_SIZE - CHECK_SIZE) / 2}
              top={(STATE_LAYER_SIZE - CHECK_SIZE) / 2}
              width={CHECK_SIZE}
              height={CHECK_SIZE}
              text={"\ue5ca"}
              fontFamily={MD3.iconFamily}
              fontSize={16}
              color={MD3.onPrimary}
              textAlign="center"
              verticalAlign="middle"
              overflow="visible"
            />
          )}
        </f-div>

        {props.label && (
          <f-div
            flex={1}
            paddingLeft={4}
          >
            <f-span
              text={props.label}
              fontSize={MD3.fontSize}
              fontFamily={MD3.fontFamily}
              color={isDisabled.value ? MD3.onSurfaceVariant : MD3.onSurface}
            />
          </f-div>
        )}
      </f-div>
    );
  }
});
