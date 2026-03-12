import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp } from "@fulate/vue";
import { defineComponent, ref } from "@vue/runtime-core";
import { Display, FlexDirection, Justify, Align } from "@fulate/yoga";

const FCard = defineComponent({
  props: {
    title: { type: String, default: "" },
    color: { type: String, default: "#3498db" }
  },
  setup(props, { slots }) {
    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        width={220}
        padding={12}
        gap={10}
        backgroundColor={props.color}
        radius={12}
      >
        <f-div
          height={32}
          backgroundColor="rgba(0,0,0,0.15)"
          radius={6}
        >
          <f-text
            left={8} 
            text={props.title}
            color="#fff"
            verticalAlign="middle"
            textAlign="center"
          /> 
        </f-div>
        <f-div
          display={Display.Flex}
          flexDirection={FlexDirection.Column}
          gap={8}
        >
          {slots.default?.()}
        </f-div>
      </f-div>
    );
  }
});

const FButton = defineComponent({
  props: {
    label: { type: String, default: "Button" },
    color: { type: String, default: "#2ecc71" }
  },
  emits: ["press"],
  setup(props, { emit }) {
    return () => (
      <f-div
        height={36}
        backgroundColor={props.color}
        radius={6}
        onClick={() => emit("press")}
      >
        <f-text
          text={props.label}
          color="#fff"
          height={36}
          textAlign="center"
          verticalAlign="middle"
        />
      </f-div>
    );
  }
});

const App = defineComponent({
  setup() {
    const counter = ref(0);
    const colors = ["#3498db", "#e74c3c", "#2ecc71", "#9b59b6", "#f39c12"];
    const cardColor = ref("#3498db");

    function changeColor() {
      const idx = (colors.indexOf(cardColor.value) + 1) % colors.length;
      cardColor.value = colors[idx];
    }

    return () => (
      <f-workspace
        width={1920}
        height={900}
      >
        <f-artboard>
          <f-text
            left={60}
            top={20}
            width={500}
            height={36}
            text="Vue 组件化：FCard + FButton + Flex 布局"
            color="#333"
          /> 

          <f-div
            left={60}
            top={70}
            display={Display.Flex}
            gap={20}
            width={800}
          >
            <FCard
              title="计数器"
              color={cardColor.value}
            >
              <f-div
                display={Display.Flex}
                justifyContent={Justify.Center}
                alignItems={Align.Center}
                height={50}
              > 
                <f-text
                  text={`点击次数: ${counter.value}`}
                  textAlign="center"
                  verticalAlign="middle"
                />
              </f-div>
              <FButton
                label="+ 1"
                color="#27ae60"
                onPress={() => counter.value++}
              />
              <FButton
                label="换色"
                color="rgba(0,0,0,0.2)"
                onPress={changeColor}
              />
            </FCard>

            <FCard
              title="Flex 排列"
              color="#9b59b6"
            >
              <f-div
                display={Display.Flex}
                gap={8}
                justifyContent={Justify.Center}
              >
                <f-div
                  width={40}
                  height={40}
                  backgroundColor="rgba(255,255,255,0.3)"
                  radius={20}
                />
                <f-div
                  width={40}
                  height={40}
                  backgroundColor="rgba(255,255,255,0.3)"
                  radius={20}
                />
                <f-div
                  width={40}
                  height={40}
                  backgroundColor="rgba(255,255,255,0.3)"
                  radius={20}
                />
              </f-div>
              <f-div
                display={Display.Flex}
                gap={6}
              >
                <f-div
                  flex={1}
                  height={30}
                  backgroundColor="rgba(255,255,255,0.2)"
                  radius={4}
                />
                <f-div
                  flex={2}
                  height={30}
                  backgroundColor="rgba(255,255,255,0.15)"
                  radius={4}
                />
              </f-div>
            </FCard>

            <FCard
              title="嵌套组合"
              color="#e74c3c"
            >
              <f-div
                display={Display.Flex}
                flexDirection={FlexDirection.Column}
                gap={6}
              >
                <f-div
                  display={Display.Flex}
                  gap={8}
                  justifyContent={Justify.SpaceAround}
                  alignItems={Align.Center}
                  height={50}
                  backgroundColor="rgba(0,0,0,0.1)"
                  radius={6}
                >
                  <f-div
                    width={30}
                    height={30}
                    backgroundColor="rgba(255,255,255,0.4)"
                    radius={15}
                  />
                  <f-div
                    width={30}
                    height={30}
                    backgroundColor="rgba(255,255,255,0.4)"
                    radius={15}
                  />
                  <f-div
                    width={30}
                    height={30}
                    backgroundColor="rgba(255,255,255,0.4)"
                    radius={15}
                  />
                </f-div>
                <f-div
                  height={30}
                  backgroundColor="rgba(255,255,255,0.15)"
                  radius={4}
                />
                <f-div
                  height={30}
                  backgroundColor="rgba(255,255,255,0.1)"
                  radius={4}
                />
              </f-div>
            </FCard>
          </f-div>
        </f-artboard>
      </f-workspace>
    );
  }
});

registerDemo("vue-components", {
  title: "Vue 组件化",
  group: "Vue",
  order: 4,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  }
});
