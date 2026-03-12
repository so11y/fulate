import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp } from "@fulate/vue";
import { defineComponent } from "@vue/runtime-core";

const App = defineComponent({
  setup() {
    return () => (
      <f-workspace width={1920} height={900}>
        <f-artboard>
          <f-rectangle
            left={60} top={60} width={120} height={120}
            backgroundColor="#e74c3c" radius={10}
          />
          <f-circle
            left={240} top={60} width={120} height={120}
            backgroundColor="#2ecc71"
          />
          <f-triangle
            left={420} top={60} width={120} height={120}
            backgroundColor="#f39c12"
          />
          <f-text
            left={60} top={240} width={200} height={50}
            text="Vue + Fulate!"
            textAlign="center" verticalAlign="middle"
            backgroundColor="#3498db" color="#fff"
          />
          <f-rectangle
            left={320} top={240} width={200} height={150}
            backgroundColor="#ecf0f1" radius={12}
          >
            <f-circle
              left={20} top={20} width={40} height={40}
              backgroundColor="#9b59b6"
            />
            <f-circle
              left={80} top={20} width={40} height={40}
              backgroundColor="#1abc9c"
            />
          </f-rectangle>
        </f-artboard>
      </f-workspace>
    );
  },
});

registerDemo("vue-basic", {
  title: "Vue 基础",
  group: "Vue",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  },
});
