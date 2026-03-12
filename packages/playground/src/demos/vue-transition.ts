import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp, FTransition } from "@fulate/vue";
import { defineComponent, h, ref } from "@vue/runtime-core";

registerDemo("vue-transition", {
  title: "Vue 过渡动画",
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const App = defineComponent({
      setup() {
        const showRect = ref(true);
        const showCircle = ref(true);

        function toggleRect() {
          console.log("---");
          showRect.value = !showRect.value;
        }

        function toggleCircle() {
          showCircle.value = !showCircle.value;
        }

        return () =>
          h("f-workspace", { width: 1920, height: 900 }, [
            h("f-artboard", null, [
              h("f-text", {
                left: 60,
                top: 20,
                width: 500,
                height: 36,
                text: "点击按钮切换显隐，观察过渡动画效果",
                color: "#333",
                verticalAlign: "middle"
              }),

              // 切换按钮 1
              h(
                "f-rectangle",
                {
                  left: 60,
                  top: 80,
                  width: 120,
                  height: 36,
                  backgroundColor: showRect.value ? "#e74c3c" : "#95a5a6",
                  radius: 6
                },
                [
                  h("f-text", {
                    width: 120,
                    height: 36,
                    text: showRect.value ? "隐藏矩形" : "显示矩形",
                    color: "#fff",
                    textAlign: "center",
                    verticalAlign: "middle",
                    onClick: toggleRect
                  })
                ]
              ),

              // 切换按钮 2
              h(
                "f-rectangle",
                {
                  left: 220,
                  top: 80,
                  width: 120,
                  height: 36,
                  backgroundColor: showCircle.value ? "#3498db" : "#95a5a6",
                  radius: 6,
                  onClick: toggleCircle
                },
                [
                  h("f-text", {
                    width: 120,
                    height: 36,
                    text: showCircle.value ? "隐藏圆形" : "显示圆形",
                    color: "#fff",
                    textAlign: "center",
                    verticalAlign: "middle"
                  })
                ]
              ),

              // 过渡动画 - 矩形（缩放+淡入淡出）
              h(
                FTransition,
                {
                  enterFrom: { opacity: 0, scaleX: 0.3, scaleY: 0.3 },
                  enterTo: { opacity: 1, scaleX: 1, scaleY: 1 },
                  leaveTo: { opacity: 0, scaleX: 0.3, scaleY: 0.3 },
                  duration: 400
                },
                () =>
                  showRect.value
                    ? h("f-rectangle", {
                        left: 100,
                        top: 180,
                        width: 120,
                        height: 120,
                        backgroundColor: "#e74c3c",
                        radius: 12
                      })
                    : null
              ),

              // 过渡动画 - 圆形（淡入淡出）
              h(
                FTransition,
                {
                  enterFrom: { opacity: 0 },
                  enterTo: { opacity: 1 },
                  leaveTo: { opacity: 0 },
                  duration: 600
                },
                () =>
                  showCircle.value
                    ? h("f-circle", {
                        left: 300,
                        top: 180,
                        width: 120,
                        height: 120,
                        backgroundColor: "#3498db"
                      })
                    : null
              )
            ])
          ]);
      }
    });

    const app = createApp(App);
    app.mount(root);

    return () => root.unmounted();
  }
});
