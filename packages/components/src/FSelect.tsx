import {
  defineComponent,
  ref,
  computed,
  nextTick,
  type PropType
} from "@vue/runtime-core";
import { Display, FlexDirection, Align, Justify } from "@fulate/yoga";
import { MD3 } from "./theme";
import { FTooltip } from "./FTooltip";
import { getBorderColor } from "./util";

export interface SelectOption {
  label: string;
  value: string;
}

const ITEM_HEIGHT = 44;
const MAX_VISIBLE = 5;

export const FSelect = defineComponent({
  name: "FSelect",
  props: {
    modelValue: { type: String, default: "" },
    label: { type: String, default: "" },
    options: { type: Array as PropType<SelectOption[]>, default: () => [] },
    placeholder: { type: String, default: "请选择" },
    disabled: { type: Boolean, default: false },
    width: { type: Number, default: 280 },
    height: { type: Number, default: 52 },
    fontSize: { type: Number, default: 15 }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const open = ref(false);
    const hoveredIndex = ref(-1);
    const triggerRef = ref<any>(null);
    const rippleRef = ref<any>(null);

    const selectedLabel = computed(() => {
      const found = props.options.find((o) => o.value === props.modelValue);
      return found ? found.label : "";
    });

    const hasValue = computed(() => !!props.modelValue);
    const labelFloated = computed(() => open.value || hasValue.value);

    const maxDropdownHeight = computed(
      () => Math.min(props.options.length, MAX_VISIBLE) * ITEM_HEIGHT + 12
    );

    function getDisplayText() {
      if (selectedLabel.value) return selectedLabel.value;
      return props.placeholder;
    }

    function getTextColor() {
      if (props.disabled) return MD3.outline;
      if (!selectedLabel.value) return MD3.onSurfaceVariant;
      return MD3.onSurface;
    }

    function doClose() {
      if (!open.value) return;
      open.value = false;
      hoveredIndex.value = -1;
    }

    function toggle(e?: any) {
      if (props.disabled) return;
      if (open.value) {
        doClose();
      } else {
        open.value = true;
        if (e?.detail) {
          rippleRef.value?.trigger(e.detail.x, e.detail.y);
        }
      }
    }

    function select(value: string) {
      emit("update:modelValue", value);
      nextTick(() => doClose());
    }

    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        width={props.width}
      >
        {/* Trigger */}
        <f-div
          ref={triggerRef}
          display={Display.Flex}
          flexDirection={FlexDirection.Row}
          alignItems={Align.Stretch}
          width={props.width}
          height={props.height}
          backgroundColor={MD3.surface}
          radius={MD3.radiusMd}
          borderColor={getBorderColor(props.disabled, open.value)}
          borderWidth={open.value ? 1.5 : 0.5}
          borderPosition="inside"
          paddingLeft={14}
          paddingRight={10}
          cursor={props.disabled ? "default" : "pointer"}
          onClick={toggle}
        >
          <f-ripple
            ref={rippleRef}
            rippleColor={MD3.primary}
            rippleOpacity={MD3.rippleOpacity}
            duration={400}
          />

          <f-div
            flex={1}
            display={Display.Flex}
            flexDirection={FlexDirection.Column}
            justifyContent={Justify.Center}
          >
            <f-div
              height={labelFloated.value ? 18 : 0}
              paddingTop={labelFloated.value ? 4 : 0}
            >
              {labelFloated.value && props.label ? (
                <f-text
                  text={props.label}
                  fontSize={11}
                  fontFamily={MD3.fontFamily}
                  fontWeight={500}
                  color={open.value ? MD3.primary : MD3.onSurfaceVariant}
                />
              ) : null}
            </f-div>

            <f-div flex={1}>
              {!labelFloated.value && props.label ? (
                <f-text
                  text={props.label}
                  fontSize={props.fontSize}
                  fontFamily={MD3.fontFamily}
                  color={MD3.onSurfaceVariant}
                  verticalAlign="middle"
                />
              ) : (
                <f-text
                  text={getDisplayText()}
                  fontSize={props.fontSize}
                  fontFamily={MD3.fontFamily}
                  color={getTextColor()}
                  verticalAlign="middle"
                />
              )}
            </f-div>
          </f-div>

          <f-div
            width={24}
            flexShrink={0}
          >
            <f-text
              text={open.value ? "▴" : "▾"}
              fontSize={16}
              color={open.value ? MD3.primary : MD3.onSurfaceVariant}
              textAlign="center"
              verticalAlign="middle"
            />
          </f-div>
        </f-div>

        <FTooltip
          visible={open.value}
          triggerRef={triggerRef}
          width={props.width}
          maxHeight={maxDropdownHeight.value}
          onClickOutside={doClose}
        >
          {props.options.map((opt, i) => (
            <f-rectangle
              key={opt.value}
              left={0}
              top={i * ITEM_HEIGHT + 6}
              width={props.width}
              height={ITEM_HEIGHT}
              backgroundColor={
                opt.value === props.modelValue
                  ? MD3.primaryContainer
                  : hoveredIndex.value === i
                    ? MD3.surfaceDim
                    : "transparent"
              }
              cursor="pointer"
              onClick={() => select(opt.value)}
              onPointermove={() => {
                hoveredIndex.value = i;
              }}
            >
              <f-text
                left={14}
                text={opt.label}
                fontSize={props.fontSize}
                fontFamily={MD3.fontFamily}
                color={
                  opt.value === props.modelValue ? MD3.primary : MD3.onSurface
                }
                fontWeight={opt.value === props.modelValue ? 600 : 400}
                verticalAlign="middle"
              />
            </f-rectangle>
          ))}
        </FTooltip>
      </f-div>
    );
  }
});
