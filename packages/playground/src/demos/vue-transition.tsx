import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp, FTransition } from "@fulate/vue";
import { defineComponent, ref } from "@vue/runtime-core";

const App = defineComponent({
  setup() {
    const showRect = ref(true);
    const showCircle = ref(true);

    return () => (
      <f-workspace width={1920} height={900}>
        <f-artboard enableDirtyRect={false}>
          <f-text
            left={60} top={20} width={500} height={36}
            text="点击按钮切换显隐，观察过渡动画效果"
            color="#333" verticalAlign="middle"
          />

          <f-rectangle
            left={60} top={80} width={120} height={36}
            backgroundColor={showRect.value ? "#e74c3c" : "#95a5a6"} radius={6}
            onClick={() => { showRect.value = !showRect.value; }}
          >
            <f-text
              width={120} height={36}
              text={showRect.value ? "隐藏矩形" : "显示矩形"}
              color="#fff" textAlign="center" verticalAlign="middle"
            />
          </f-rectangle>

          <f-rectangle
            left={220} top={80} width={120} height={36}
            backgroundColor={showCircle.value ? "#3498db" : "#95a5a6"} radius={6}
            onClick={() => { showCircle.value = !showCircle.value; }}
          >
            <f-text
              width={120} height={36}
              text={showCircle.value ? "隐藏圆形" : "显示圆形"}
              color="#fff" textAlign="center" verticalAlign="middle"
            />
          </f-rectangle>

          <FTransition
            enterFrom={{ opacity: 0, scaleX: 0.3, scaleY: 0.3 }}
            enterTo={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            leaveTo={{ opacity: 0, scaleX: 0.3, scaleY: 0.3 }}
            duration={400}
          >
            {showRect.value ? (
              <f-rectangle
                left={100} top={180} width={120} height={120}
                backgroundColor="#e74c3c" radius={12}
              />
            ) : null}
          </FTransition>

          <FTransition
            enterFrom={{ opacity: 0 }}
            enterTo={{ opacity: 1 }}
            leaveTo={{ opacity: 0 }}
            duration={600}
          >
            {showCircle.value ? (
              <f-circle
                left={300} top={180} width={120} height={120}
                backgroundColor="#3498db"
              />
            ) : null}
          </FTransition>
        </f-artboard>
      </f-workspace>
    );
  },
});

registerDemo("vue-transition", {
  title: "Vue 过渡动画",
  group: "Vue",
  order: 3,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  },
});
