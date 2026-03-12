import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp, registerElement } from "@fulate/vue";
import { defineComponent, h } from "@vue/runtime-core";

registerDemo("vue-basic", {
  title: "Vue 基础",
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const App = defineComponent({
      setup() {
        return () =>
          h("f-workspace", { width: 1920, height: 900 }, [
            h("f-artboard", null, [
              h("f-rectangle", {
                left: 60,
                top: 60,
                width: 120,
                height: 120,
                backgroundColor: "#e74c3c",
                radius: 10,
              }),
              h("f-circle", {
                left: 240,
                top: 60,
                width: 120,
                height: 120,
                backgroundColor: "#2ecc71",
              }),
              h("f-triangle", {
                left: 420,
                top: 60,
                width: 120,
                height: 120,
                backgroundColor: "#f39c12",
              }),
              h("f-text", {
                left: 60,
                top: 240,
                width: 200,
                height: 50,
                text: "Vue + Fulate!",
                textAlign: "center",
                verticalAlign: "middle",
                backgroundColor: "#3498db",
                color: "#fff",
              }),
              h("f-rectangle", {
                left: 320,
                top: 240,
                width: 200,
                height: 150,
                backgroundColor: "#ecf0f1",
                radius: 12,
              }, [
                h("f-circle", {
                  left: 20,
                  top: 20,
                  width: 40,
                  height: 40,
                  backgroundColor: "#9b59b6",
                }),
                h("f-circle", {
                  left: 80,
                  top: 20,
                  width: 40,
                  height: 40,
                  backgroundColor: "#1abc9c",
                }),
              ]),
            ]),
          ]);
      },
    });

    const app = createApp(App);
    app.mount(root);

    return () => root.unmounted();
  },
});
