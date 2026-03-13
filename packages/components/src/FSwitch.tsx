import {
  defineComponent,
  ref,
  computed,
  watch,
} from "@vue/runtime-core";
import { Display, FlexDirection, Align } from "@fulate/yoga";
import { MD3 } from "./theme";
import { useStateLayer } from "./util";

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 24;
const THUMB_OFFSET = 4;
const STATE_LAYER_SIZE = 40;

export const FSwitch = defineComponent({
  name: "FSwitch",
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    activeColor: { type: String, default: MD3.primary },
    label: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const thumbRef = ref<any>(null);

    const thumbLeft = computed(() =>
      props.modelValue
        ? TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET
        : THUMB_OFFSET
    );

    const stateLayerLeft = computed(() =>
      props.modelValue
        ? TRACK_WIDTH - STATE_LAYER_SIZE / 2 - THUMB_SIZE / 2 - THUMB_OFFSET
        : THUMB_OFFSET + THUMB_SIZE / 2 - STATE_LAYER_SIZE / 2
    );

    const { layerRef, handlers } = useStateLayer(
      () => props.disabled,
      () => props.modelValue ? props.activeColor : MD3.onSurface
    );

    watch(
      () => props.modelValue,
      () => {
        const el = thumbRef.value;
        if (!el?.animate) return;
        el.stopAnimations?.();
        el.animate({ left: thumbLeft.value }, { duration: 150 });

        const layer = layerRef.value;
        if (!layer?.animate) return;
        layer.stopAnimations?.();
        layer.animate({ left: stateLayerLeft.value }, { duration: 150 });
      }
    );

    function toggle() {
      if (props.disabled) return;
      emit("update:modelValue", !props.modelValue);
    }

    function getTrackBg() {
      if (props.disabled) {
        return props.modelValue ? MD3.outlineVariant : MD3.surfaceContainer;
      }
      return props.modelValue ? props.activeColor : MD3.surfaceContainer;
    }

    function getTrackBorder() {
      if (props.disabled) return MD3.outlineVariant;
      return props.modelValue ? props.activeColor : MD3.outline;
    }

    function getThumbBg() {
      if (props.disabled) {
        return props.modelValue ? MD3.surface : MD3.outlineVariant;
      }
      return props.modelValue ? MD3.onPrimary : MD3.outline;
    }

    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={FlexDirection.Row}
        alignItems={Align.Center}
        gap={props.label ? 10 : 0}
        cursor={props.disabled ? "default" : "pointer"}
        onClick={toggle}
      >
        <f-div
          width={TRACK_WIDTH}
          height={STATE_LAYER_SIZE}
          flexShrink={0}
        >
          {/* Track */}
          <f-rectangle
            left={0}
            top={(STATE_LAYER_SIZE - TRACK_HEIGHT) / 2}
            width={TRACK_WIDTH}
            height={TRACK_HEIGHT}
            radius={TRACK_HEIGHT / 2}
            backgroundColor={getTrackBg()}
            borderColor={getTrackBorder()}
            borderWidth={props.modelValue ? 0 : 2}
            borderPosition="inside"
          />

          {/* State layer on thumb */}
          <f-rectangle
            ref={layerRef}
            left={stateLayerLeft.value}
            top={0}
            width={STATE_LAYER_SIZE}
            height={STATE_LAYER_SIZE}
            radius={STATE_LAYER_SIZE / 2}
            backgroundColor="transparent"
            {...handlers}
          />

          {/* Thumb */}
          <f-rectangle
            ref={thumbRef}
            left={thumbLeft.value}
            top={(STATE_LAYER_SIZE - THUMB_SIZE) / 2}
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            radius={THUMB_SIZE / 2}
            backgroundColor={getThumbBg()}
          />
        </f-div>

        {props.label && (
          <f-div flex={1}>
            <f-span
              text={props.label}
              fontSize={MD3.fontSize}
              fontFamily={MD3.fontFamily}
              color={
                props.disabled ? MD3.onSurfaceVariant : MD3.onSurface
              }
              verticalAlign="middle"
            />
          </f-div>
        )}
      </f-div>
    );
  },
});
