import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Triangle, Text } from "@fulate/ui";

registerDemo("gradient", {
  title: "渐变填充",
  group: "基础",
  order: 3,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        // --- 线性渐变（角度） ---
        new Rectangle({
          left: 60,
          top: 40,
          width: 160,
          height: 120,
          radius: 12,
          backgroundColor: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#667eea", position: 0 },
              { color: "#764ba2", position: 1 },
            ],
          },
        }),

        new Rectangle({
          left: 260,
          top: 40,
          width: 160,
          height: 120,
          radius: 12,
          backgroundColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#f093fb", position: 0 },
              { color: "#f5576c", position: 1 },
            ],
          },
        }),

        new Rectangle({
          left: 460,
          top: 40,
          width: 160,
          height: 120,
          radius: 12,
          backgroundColor: {
            type: "linear",
            angle: 0,
            stops: [
              { color: "#4facfe", position: 0 },
              { color: "#00f2fe", position: 1 },
            ],
          },
        }),

        // --- 多色渐变 ---
        new Rectangle({
          left: 60,
          top: 200,
          width: 260,
          height: 100,
          radius: 16,
          backgroundColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#ff0844", position: 0 },
              { color: "#ffb199", position: 0.5 },
              { color: "#ffd700", position: 1 },
            ],
          },
        }),

        new Rectangle({
          left: 360,
          top: 200,
          width: 260,
          height: 100,
          radius: 16,
          backgroundColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#a18cd1", position: 0 },
              { color: "#fbc2eb", position: 0.33 },
              { color: "#f6d365", position: 0.66 },
              { color: "#fda085", position: 1 },
            ],
          },
        }),

        // --- 径向渐变 ---
        new Circle({
          left: 60,
          top: 340,
          width: 150,
          height: 150,
          backgroundColor: {
            type: "radial",
            center: { x: 0.5, y: 0.5 },
            radius: 0.5,
            stops: [
              { color: "#fff", position: 0 },
              { color: "#43e97b", position: 0.5 },
              { color: "#38f9d7", position: 1 },
            ],
          },
        }),

        new Circle({
          left: 260,
          top: 340,
          width: 150,
          height: 150,
          backgroundColor: {
            type: "radial",
            center: { x: 0.3, y: 0.3 },
            radius: 0.6,
            stops: [
              { color: "#ffe259", position: 0 },
              { color: "#ffa751", position: 1 },
            ],
          },
        }),

        // --- from/to 方式 ---
        new Triangle({
          left: 460,
          top: 340,
          width: 150,
          height: 150,
          backgroundColor: {
            type: "linear",
            from: { x: 0, y: 0 },
            to: { x: 1, y: 1 },
            stops: [
              { color: "#fa709a", position: 0 },
              { color: "#fee140", position: 1 },
            ],
          },
        }),

        // --- 渐变 + 阴影 + 透明度 ---
        new Rectangle({
          left: 60,
          top: 530,
          width: 200,
          height: 120,
          radius: 20,
          opacity: 0.85,
          shadow: { color: "rgba(102,126,234,0.4)", blur: 24, offsetX: 0, offsetY: 10 },
          backgroundColor: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#667eea", position: 0 },
              { color: "#764ba2", position: 1 },
            ],
          },
        }),

        new Rectangle({
          left: 300,
          top: 530,
          width: 200,
          height: 120,
          radius: 20,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.4)",
          shadow: { color: "rgba(0,0,0,0.15)", blur: 16, offsetY: 6 },
          backgroundColor: {
            type: "linear",
            angle: 45,
            stops: [
              { color: "#0acffe", position: 0 },
              { color: "#495aff", position: 1 },
            ],
          },
        }),

        // --- 文字标注 ---
        new Text({
          left: 60,
          top: 10,
          width: 200,
          height: 24,
          text: "线性渐变 (angle)",
          color: "#666",
          fontSize: 12,
        }),
        new Text({
          left: 60,
          top: 175,
          width: 200,
          height: 24,
          text: "多色渐变",
          color: "#666",
          fontSize: 12,
        }),
        new Text({
          left: 60,
          top: 315,
          width: 200,
          height: 24,
          text: "径向渐变 & from/to",
          color: "#666",
          fontSize: 12,
        }),
        new Text({
          left: 60,
          top: 505,
          width: 300,
          height: 24,
          text: "渐变 + 阴影 + 圆角",
          color: "#666",
          fontSize: 12,
        }),
      ],
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  },
});
