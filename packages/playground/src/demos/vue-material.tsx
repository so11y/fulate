import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp } from "@fulate/vue";
import { defineComponent, ref } from "@vue/runtime-core";
import { Display, FlexDirection, Justify, Align } from "@fulate/yoga";
import { FButton, FInput, FSelect, MD3 } from "@fulate/components";

const App = defineComponent({
  setup() {
    const inputName = ref("");
    const inputEmail = ref("");
    const selected = ref("");
    const submitCount = ref(0);

    const frameworks: { label: string; value: string }[] = [
      { label: "Vue.js", value: "vue" },
      { label: "React", value: "react" },
      { label: "Angular", value: "angular" },
      { label: "Svelte", value: "svelte" },
      { label: "Solid", value: "solid" },
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
      <f-workspace width={1920} height={900}>
        <f-artboard>
          {/* Page title */}
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

          <f-div
            left={48}
            top={110}
            display={Display.Flex}
            gap={32}
            width={780}
          >
            {/* Left: Form card */}
            <f-div
              display={Display.Flex}
              flexDirection={FlexDirection.Column}
              gap={18}
              width={340}
              padding={28}
              backgroundColor={MD3.surface}
              radius={MD3.radiusLg}
              borderColor={MD3.outlineVariant}
              borderWidth={1}
            >
              <f-text
                text="表单示例"
                fontSize={17}
                fontWeight={600}
                fontFamily={MD3.fontFamily}
                color={MD3.onSurface}
                height={24}
                verticalAlign="middle"
              />

              <FInput
                modelValue={inputName.value}
                onUpdate:modelValue={(v: string) => (inputName.value = v)}
                label="姓名"
                placeholder="请输入姓名"
                width={284}
              />

              <FInput
                modelValue={inputEmail.value}
                onUpdate:modelValue={(v: string) => (inputEmail.value = v)}
                label="邮箱"
                placeholder="name@example.com"
                width={284}
              />

              <FSelect
                modelValue={selected.value}
                onUpdate:modelValue={(v: string) => (selected.value = v)}
                label="框架"
                options={frameworks}
                width={284}
              />

              <f-div display={Display.Flex} gap={12} paddingTop={4}>
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
            </f-div>

            {/* Right: Button showcase */}
            <f-div
              display={Display.Flex}
              flexDirection={FlexDirection.Column}
              gap={18}
              width={340}
              padding={28}
              backgroundColor={MD3.surface}
              radius={MD3.radiusLg}
              borderColor={MD3.outlineVariant}
              borderWidth={1}
            >
              <f-text
                text="Button 变体"
                fontSize={17}
                fontWeight={600}
                fontFamily={MD3.fontFamily}
                color={MD3.onSurface}
                height={24}
                verticalAlign="middle"
              />

              <f-div display={Display.Flex} gap={10} alignItems={Align.Center}>
                <FButton label="Filled" variant="filled" />
                <FButton label="Outlined" variant="outlined" />
                <FButton label="Text" variant="text" />
              </f-div>

              <f-div display={Display.Flex} gap={10} alignItems={Align.Center}>
                <FButton label="Primary" variant="filled" color="#1565C0" />
                <FButton label="Error" variant="filled" color="#D32F2F" />
                <FButton label="Success" variant="filled" color="#2E7D32" />
              </f-div>

              <f-div display={Display.Flex} gap={10} alignItems={Align.Center}>
                <FButton label="Disabled" variant="filled" disabled />
                <FButton label="Disabled" variant="outlined" disabled />
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
            </f-div>
          </f-div>
        </f-artboard>
      </f-workspace>
    );
  },
});

registerDemo("vue-material", {
  title: "Material Design 组件",
  group: "Vue",
  order: 10,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  },
});
