import {
  defineComponent,
  ref,
  computed,
  nextTick,
  inject,
  Teleport,
  type PropType,
  onMounted,
  onUnmounted
} from "@vue/runtime-core";
import { Display, FlexDirection, Align, Justify } from "@fulate/yoga";
import { MD3 } from "./theme";

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
    const overlay = inject<any>("__fulate_overlay", null);
    const fulateRoot = inject<any>("__fulate_root", null);
    const open = ref(false);
    const showDropdown = ref(false);
    const hoveredIndex = ref(-1);
    const triggerRef = ref<any>(null);
    const dropdownRef = ref<any>(null);
    const rippleRef = ref<any>(null);

    let removeRootListener: (() => void) | null = null;

    onMounted(() => {
      removeRootListener = fulateRoot.addEventListener(
        "pointerdown",
        onRootPointerDown
      );
    });

    onUnmounted(() => {
      removeRootListener?.();
      removeRootListener = null;
    });

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

    function getBorderColor() {
      if (props.disabled) return MD3.outlineVariant;
      if (open.value) return MD3.primary;
      return MD3.outline;
    }

    function syncDropdownPosition() {
      const trigger = triggerRef.value;
      const dropdown = dropdownRef.value;
      if (!trigger || !dropdown) return;
      const m = trigger.getOwnMatrix?.();
      if (!m) return;
      dropdown.left = m.e;
      dropdown.top = m.f + (trigger.height ?? props.height) + 4;
      dropdown.markDirty?.();
    }

    function isDescendantOf(node: any, ancestor: any): boolean {
      let cur = node;
      while (cur) {
        if (cur === ancestor) return true;
        cur = cur.parent;
      }
      return false;
    }

    function onRootPointerDown(e: any) {
      if (!open.value) return;
      const target = e.detail?.target;
      if (!target) return;
      if (isDescendantOf(target, triggerRef.value)) return;
      if (isDescendantOf(target, dropdownRef.value)) return;
      doClose();
    }

    function doOpen() {
      open.value = true;
      showDropdown.value = true;
      nextTick(() => {
        syncDropdownPosition();
        const el = dropdownRef.value;
        if (el) el.opacity = 1;
      });
    }

    function doClose() {
      if (!open.value) return;
      open.value = false;
      hoveredIndex.value = -1;
      showDropdown.value = false;
    }

    function toggle(e?: any) {
      if (props.disabled) return;
      if (open.value) {
        doClose();
      } else {
        doOpen();
        if (e?.detail) {
          rippleRef.value?.trigger(e.detail.x, e.detail.y);
        }
      }
    }

    function select(value: string) {
      emit("update:modelValue", value);
      nextTick(() => doClose());
    }

    const renderDropdown = () => {
      if (!showDropdown.value) return null;

      const dropdown = (
        <f-scrollview
          ref={dropdownRef}
          width={props.width}
          maxHeight={maxDropdownHeight.value}
          opacity={0}
          backgroundColor={MD3.surface}
          radius={MD3.radiusSm}
          borderColor={MD3.outlineVariant}
          borderWidth={0.5}
          borderPosition="inside"
          scrollbarSize={4}
          scrollbarColor="rgba(0,0,0,0.15)"
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
        </f-scrollview>
      );

      if (overlay) {
        return <Teleport to={overlay}>{dropdown}</Teleport>;
      }
      return dropdown;
    };

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
          borderColor={getBorderColor()}
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

          {/* Content column: label + text */}
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

          {/* Arrow - always vertically centered */}
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

        {renderDropdown()}
      </f-div>
    );
  }
});
