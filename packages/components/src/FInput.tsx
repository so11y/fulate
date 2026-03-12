import { defineComponent, ref, computed, nextTick } from "@vue/runtime-core";
import { Display, FlexDirection, Align } from "@fulate/yoga";
import { MD3 } from "./theme";

export const FInput = defineComponent({
  name: "FInput",
  props: {
    modelValue: { type: String, default: "" },
    label: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    width: { type: Number, default: 280 },
    height: { type: Number, default: 52 },
    fontSize: { type: Number, default: 15 },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const focused = ref(false);
    const textRef = ref<any>(null);

    const hasValue = computed(() => props.modelValue.length > 0);
    const labelFloated = computed(() => focused.value || hasValue.value);

    function getBorderColor() {
      if (props.disabled) return MD3.outlineVariant;
      if (focused.value) return MD3.primary;
      return MD3.outline;
    }

    function getDisplayText() {
      if (props.modelValue) return props.modelValue;
      if (focused.value && props.placeholder) return props.placeholder;
      return props.modelValue;
    }

    function getTextColor() {
      if (props.disabled) return MD3.outline;
      if (!props.modelValue && focused.value && props.placeholder)
        return MD3.onSurfaceVariant;
      return MD3.onSurface;
    }

    function patchTextarea(el: any) {
      el.enterEditing();
      if (el._textarea) {
        el._textarea.style.border = "none";
        el._textarea.style.background = "transparent";
      }
    }

    function handleClick() {
      if (props.disabled) return;
      if (textRef.value?.enterEditing) {
        patchTextarea(textRef.value);
        focused.value = true;
      } else {
        focused.value = true;
        nextTick(() => {
          if (textRef.value?.enterEditing) patchTextarea(textRef.value);
        });
      }
    }

    return () => (
      <f-div
        width={props.width}
        height={props.height}
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        backgroundColor={MD3.surface}
        borderColor={getBorderColor()}
        borderWidth={focused.value ? 2 : 1}
        borderPosition="inside"
        radius={MD3.radiusMd}
        paddingLeft={14}
        paddingRight={14}
        cursor={props.disabled ? "default" : "text"}
        onClick={handleClick}
      >
        {/* Floating label */}
        <f-div
          height={labelFloated.value ? 18 : 0}
          paddingTop={labelFloated.value ? 6 : 0}
        >
          {labelFloated.value && props.label ? (
            <f-text
              text={props.label}
              fontSize={11}
              fontFamily={MD3.fontFamily}
              fontWeight={500}
              color={focused.value ? MD3.primary : MD3.onSurfaceVariant}
            />
          ) : null}
        </f-div>

        {/* Input text */}
        <f-div display={Display.Flex} alignItems={Align.Center} flex={1}>
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
              ref={textRef}
              text={getDisplayText()}
              fontSize={props.fontSize}
              fontFamily={MD3.fontFamily}
              color={getTextColor()}
              verticalAlign="middle"
              editable={!props.disabled}
              onInput={(e: any) => {
                emit("update:modelValue", e.detail);
              }}
              onChange={() => {
                focused.value = false;
              }}
            />
          )}
        </f-div>
      </f-div>
    );
  },
});
