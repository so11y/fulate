import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp } from "@fulate/vue";
import { defineComponent, ref } from "@vue/runtime-core";
import { Display, FlexDirection, Justify, Align } from "@fulate/yoga";
import {
  FButton,
  FInput,
  FSelect,
  FRadio,
  FRadioGroup,
  FCheckbox,
  FCheckboxGroup,
  FSwitch,
  MD3
} from "@fulate/components";

const SectionTitle = defineComponent({
  props: { text: { type: String, required: true } },
  setup(props) {
    return () => (
      <f-text
        text={props.text}
        fontSize={17}
        fontWeight={600}
        fontFamily={MD3.fontFamily}
        color={MD3.onSurface}
        height={24}
        verticalAlign="middle"
      />
    );
  }
});

const Card = defineComponent({
  props: {
    width: { type: Number, default: 340 }
  },
  setup(props, { slots }) {
    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        gap={18}
        width={props.width}
        padding={28}
        backgroundColor={MD3.surface}
        radius={MD3.radiusLg}
        borderColor={MD3.outlineVariant}
        borderWidth={1}
      >
        {slots.default?.()}
      </f-div>
    );
  }
});

const App = defineComponent({
  setup() {
    const inputName = ref("");
    const inputEmail = ref("");
    const selected = ref("");
    const submitCount = ref(0);

    const radioValue = ref("vue");
    const checkValues = ref<string[]>(["ts"]);
    const darkMode = ref(false);
    const notifications = ref(true);
    const autoSave = ref(false);

    const frameworks: { label: string; value: string }[] = [
      { label: "Vue.js", value: "vue" },
      { label: "React", value: "react" },
      { label: "Angular", value: "angular" },
      { label: "Svelte", value: "svelte" },
      { label: "Solid", value: "solid" }
    ];

    function handleSubmit() {
      submitCount.value++;
    }

    function handleReset() {
      inputName.value = "";
      inputEmail.value = "";
      selected.value = "";
      submitCount.value = 0;
    }

    return () => (
      <f-workspace
        width={1920}
        height={900}
      >
        <f-artboard>
          <f-text
            left={48}
            top={32}
            width={600}
            height={36}
            text="Material Design 3"
            fontSize={26}
            fontWeight={700}
            fontFamily={MD3.fontFamily}
            color={MD3.onSurface}
          />
          <f-text
            left={48}
            top={68}
            width={600}
            height={20}
            text="Component Library Demo"
            fontSize={14}
            fontWeight={400}
            fontFamily={MD3.fontFamily}
            color={MD3.onSurfaceVariant}
          />

          {/* Row 1: Form + Button showcase */}
          <f-div
            left={48}
            top={110}
            display={Display.Flex}
            gap={32}
            width={1100}
          >
            {/* Form card */}
            <Card>
              <SectionTitle text="表单示例" />

              <FInput
                v-model={inputName.value}
                label="姓名"
                placeholder="请输入姓名"
                width={284}
              />

              <FInput
                v-model={inputEmail.value}
                label="邮箱"
                placeholder="name@example.com"
                width={284}
              />

              <FSelect
                v-model={selected.value}
                label="框架"
                options={frameworks}
                width={284}
              />

              <f-div
                display={Display.Flex}
                gap={12}
                paddingTop={4}
              >
                <FButton
                  label="提交"
                  variant="filled"
                  onPress={handleSubmit}
                />
                <FButton
                  label="重置"
                  variant="outlined"
                  onPress={handleReset}
                />
              </f-div>

              {submitCount.value > 0 ? (
                <f-div
                  height={36}
                  backgroundColor="#E8F5E9"
                  radius={MD3.radiusSm}
                  paddingLeft={14}
                  display={Display.Flex}
                  alignItems={Align.Center}
                >
                  <f-text
                    text={`已提交 ${submitCount.value} 次  ·  ${inputName.value || "—"}  ·  ${selected.value || "—"}`}
                    fontSize={13}
                    fontFamily={MD3.fontFamily}
                    color="#2E7D32"
                    verticalAlign="middle"
                  />
                </f-div>
              ) : null}
            </Card>

            {/* Button showcase */}
            <Card>
              <SectionTitle text="Button 变体" />

              <f-div
                display={Display.Flex}
                gap={10}
                alignItems={Align.Center}
              >
                <FButton
                  label="Filled"
                  variant="filled"
                />
                <FButton
                  label="Outlined"
                  variant="outlined"
                />
                <FButton
                  label="Text"
                  variant="text"
                />
              </f-div>

              <f-div
                display={Display.Flex}
                gap={10}
                alignItems={Align.Center}
              >
                <FButton
                  label="Primary"
                  variant="filled"
                  color="#1565C0"
                />
                <FButton
                  label="Error"
                  variant="filled"
                  color="#D32F2F"
                />
                <FButton
                  label="Success"
                  variant="filled"
                  color="#2E7D32"
                />
              </f-div>

              <f-div
                display={Display.Flex}
                gap={10}
                alignItems={Align.Center}
              >
                <FButton
                  label="Disabled"
                  variant="filled"
                  disabled
                />
                <FButton
                  label="Disabled"
                  variant="outlined"
                  disabled
                />
              </f-div>

              <f-div
                height={32}
                backgroundColor={MD3.surfaceDim}
                radius={MD3.radiusSm}
                paddingLeft={12}
                display={Display.Flex}
                alignItems={Align.Center}
              >
                <f-text
                  text="hover / press 状态有颜色过渡动画"
                  fontSize={12}
                  fontFamily={MD3.fontFamily}
                  color={MD3.onSurfaceVariant}
                  verticalAlign="middle"
                />
              </f-div>
            </Card>

            {/* Switch card */}
            <Card width={260}>
              <SectionTitle text="Switch 开关" />

              <FSwitch
                v-model={darkMode.value}
                label="深色模式"
              />

              <FSwitch
                v-model={notifications.value}
                label="推送通知"
              />

              <FSwitch
                v-model={autoSave.value}
                label="自动保存"
              />

              <FSwitch
                modelValue={true}
                disabled
                label="已锁定（禁用）"
              />

              <f-div
                height={32}
                backgroundColor={MD3.surfaceDim}
                radius={MD3.radiusSm}
                paddingLeft={12}
                display={Display.Flex}
                alignItems={Align.Center}
              >
                <f-text
                  text={`深色:${darkMode.value ? "开" : "关"} · 通知:${notifications.value ? "开" : "关"} · 保存:${autoSave.value ? "开" : "关"}`}
                  fontSize={12}
                  fontFamily={MD3.fontFamily}
                  color={MD3.onSurfaceVariant}
                  verticalAlign="middle"
                />
              </f-div>
            </Card>
          </f-div>

          {/* Row 2: Radio + Checkbox */}
          <f-div
            left={48}
            top={530}
            display={Display.Flex}
            gap={32}
            width={1100}
          >
            {/* Radio card */}
            <Card>
              <SectionTitle text="Radio 单选" />

              <FRadioGroup
                v-model={radioValue.value}
                gap={6}
              >
                <FRadio
                  value="vue"
                  label="Vue.js"
                />
                <FRadio
                  value="react"
                  label="React"
                />
                <FRadio
                  value="angular"
                  label="Angular"
                />
                <FRadio
                  value="svelte"
                  label="Svelte"
                />
              </FRadioGroup>

              <f-div
                display={Display.Flex}
                flexDirection={FlexDirection.Column}
                gap={6}
              >
                <f-div height={20}>
                  <f-text
                    text="横向排列"
                    fontSize={13}
                    fontFamily={MD3.fontFamily}
                    color={MD3.onSurfaceVariant}
                  />
                </f-div>
                <FRadioGroup
                  v-model={radioValue.value}
                  direction="row"
                  gap={16}
                >
                  <FRadio
                    value="vue"
                    label="Vue"
                  />
                  <FRadio
                    value="react"
                    label="React"
                  />
                  <FRadio
                    value="svelte"
                    label="Svelte"
                  />
                </FRadioGroup>
              </f-div>

              <f-div
                height={32}
                backgroundColor={MD3.surfaceDim}
                radius={MD3.radiusSm}
                paddingLeft={12}
                display={Display.Flex}
                alignItems={Align.Center}
              >
                <f-text
                  text={`当前选中: ${radioValue.value}`}
                  fontSize={12}
                  fontFamily={MD3.fontFamily}
                  color={MD3.onSurfaceVariant}
                  verticalAlign="middle"
                />
              </f-div>
            </Card>

            {/* Checkbox card */}
            <Card>
              <SectionTitle text="Checkbox 多选" />

              <FCheckboxGroup
                v-model={checkValues.value}
                gap={6}
              >
                <FCheckbox
                  value="ts"
                  label="TypeScript"
                />
                <FCheckbox
                  value="js"
                  label="JavaScript"
                />
                <FCheckbox
                  value="rust"
                  label="Rust"
                />
                <FCheckbox
                  value="go"
                  label="Go"
                />
              </FCheckboxGroup>

              <f-div
                display={Display.Flex}
                flexDirection={FlexDirection.Column}
                gap={6}
              >
                <f-div height={20}>
                  <f-text
                    text="横向排列"
                    fontSize={13}
                    fontFamily={MD3.fontFamily}
                    color={MD3.onSurfaceVariant}
                  />
                </f-div>

                <FCheckboxGroup
                  v-model={checkValues.value}
                  direction="row"
                  gap={16}
                >
                  <FCheckbox
                    value="ts"
                    label="TS"
                  />
                  <FCheckbox
                    value="js"
                    label="JS"
                  />
                  <FCheckbox
                    value="rust"
                    label="Rust"
                  />
                </FCheckboxGroup>
              </f-div>

              <f-div
                height={32}
                backgroundColor={MD3.surfaceDim}
                radius={MD3.radiusSm}
                paddingLeft={12}
                display={Display.Flex}
                alignItems={Align.Center}
              >
                <f-text
                  text={`已选: ${checkValues.value.join(", ") || "无"}`}
                  fontSize={12}
                  fontFamily={MD3.fontFamily}
                  color={MD3.onSurfaceVariant}
                  verticalAlign="middle"
                />
              </f-div>
            </Card>

            {/* Disabled states card */}
            <Card width={260}>
              <SectionTitle text="禁用状态" />

              <FRadioGroup
                modelValue="a"
                disabled
                gap={6}
              >
                <FRadio
                  value="a"
                  label="选项 A（选中禁用）"
                />
                <FRadio
                  value="b"
                  label="选项 B（禁用）"
                />
              </FRadioGroup>

              <FCheckboxGroup
                modelValue={["x"]}
                disabled
                gap={6}
              >
                <FCheckbox
                  value="x"
                  label="选中 & 禁用"
                />
                <FCheckbox
                  value="y"
                  label="未选 & 禁用"
                />
              </FCheckboxGroup>

              <FSwitch
                modelValue={false}
                disabled
                label="禁用关"
              />
              <FSwitch
                modelValue={true}
                disabled
                label="禁用开"
              />
            </Card>
          </f-div>
        </f-artboard>
      </f-workspace>
    );
  }
});

registerDemo("vue-material", {
  title: "Material Design 组件",
  group: "Vue",
  order: 10,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  }
});
