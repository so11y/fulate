import { defineComponent, ref, computed, nextTick } from "@vue/runtime-core";
import { Display, FlexDirection, Align } from "@fulate/yoga";
import { MD3 } from "./theme";
import { getBorderColor } from "./util";

export const FInput = defineComponent({
  name: "FInput",
  props: {
    modelValue: { type: String, default: "" },
    label: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    width: { type: Number, default: 280 },
    height: { type: Number, default: 52 },
    fontSize: { type: Number, default: 15 }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const focused = ref(false);
    const textRef = ref<any>(null);
    const divRef = ref<any>(null);

    const hasValue = computed(() => props.modelValue.length > 0);
    const labelFloated = computed(() => focused.value || hasValue.value);

    function animateBorder(toColor: string, toWidth: number, duration = 150) {
      const el = divRef.value;
      if (!el?.animate) return;
      el.stopAnimations?.();
      el.animate({ borderColor: toColor, borderWidth: toWidth }, { duration });
    }

    function setFocused(value: boolean) {
      focused.value = value;
      if (props.disabled) return;
      if (value) {
        animateBorder(MD3.primary, 1.5, 150);
      } else {
        animateBorder(MD3.outline, 0.5, 200);
      }
    }

    function handleClick() {
      if (props.disabled) return;
      if (textRef.value?.enterEditing) {
        textRef.value.enterEditing();
        setFocused(true);
      } else {
        setFocused(true);
        nextTick(() => {
          textRef.value?.enterEditing?.();
        });
      }
    }

    return () => (
      <f-div
        ref={divRef}
        width={props.width}
        height={props.height}
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        backgroundColor={MD3.surface}
        borderColor={getBorderColor(props.disabled, focused.value)}
        borderWidth={focused.value ? 1.5 : 0.5}
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
            <f-span
              text={props.label}
              fontSize={11}
              fontFamily={MD3.fontFamily}
              fontWeight={500}
              color={focused.value ? MD3.primary : MD3.onSurfaceVariant}
            />
          ) : null}
        </f-div>

        {/* Input text */}
        <f-div
          display={Display.Flex}
          alignItems={Align.Center}
          flex={1}
        >
          {!labelFloated.value && props.label ? (
            <f-span
              text={props.label}
              fontSize={props.fontSize}
              fontFamily={MD3.fontFamily}
              color={MD3.onSurfaceVariant}
            />
          ) : (
            <f-span
              ref={textRef}
              text={props.modelValue}
              placeholder={props.placeholder}
              placeholderColor={MD3.onSurfaceVariant}
              fontSize={props.fontSize}
              fontFamily={MD3.fontFamily}
              color={props.disabled ? MD3.outline : MD3.onSurface}
              editable={!props.disabled}
              wordWrap={false}
              onInput={(e: any) => {
                emit("update:modelValue", e.detail);
              }}
              onChange={() => {
                setFocused(false);
              }}
            />
          )}
        </f-div>
      </f-div>
    );
  }
});
