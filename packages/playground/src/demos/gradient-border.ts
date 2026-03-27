import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Triangle, Text } from "@fulate/ui";

registerDemo("gradient-border", {
  title: "渐变边框 & 文本描边渐变",
  group: "基础",
  order: 4,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        // ========== 第一行：渐变边框 ==========

        new Text({
          left: 60, top: 16, width: 400, height: 24,
          text: "渐变边框（Shape borderColor 支持 GradientOption）",
          color: "#333", fontSize: 13,
        }),

        new Rectangle({
          left: 60, top: 50, width: 160, height: 110, radius: 12,
          backgroundColor: "#fff",
          borderWidth: 3,
          borderColor: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#667eea", position: 0 },
              { color: "#764ba2", position: 1 },
            ],
          },
        }),

        new Rectangle({
          left: 260, top: 50, width: 160, height: 110, radius: 12,
          backgroundColor: "#fff",
          borderWidth: 3,
          borderColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#f093fb", position: 0 },
              { color: "#f5576c", position: 1 },
            ],
          },
        }),

        new Circle({
          left: 460, top: 50, width: 110, height: 110,
          backgroundColor: "#fff",
          borderWidth: 3,
          borderColor: {
            type: "linear",
            angle: 45,
            stops: [
              { color: "#43e97b", position: 0 },
              { color: "#38f9d7", position: 1 },
            ],
          },
        }),

        new Triangle({
          left: 610, top: 50, width: 120, height: 110,
          backgroundColor: "#fff",
          borderWidth: 3,
          borderColor: {
            type: "linear",
            from: { x: 0, y: 0 },
            to: { x: 1, y: 1 },
            stops: [
              { color: "#fa709a", position: 0 },
              { color: "#fee140", position: 1 },
            ],
          },
        }),

        // ========== 第二行：渐变填充 + 渐变边框 ==========

        new Text({
          left: 60, top: 186, width: 400, height: 24,
          text: "渐变填充 + 渐变边框",
          color: "#333", fontSize: 13,
        }),

        new Rectangle({
          left: 60, top: 220, width: 200, height: 110, radius: 16,
          borderWidth: 3,
          backgroundColor: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#0acffe", position: 0 },
              { color: "#495aff", position: 1 },
            ],
          },
          borderColor: {
            type: "linear",
            angle: 0,
            stops: [
              { color: "#ffd700", position: 0 },
              { color: "#ff6b6b", position: 1 },
            ],
          },
        }),

        new Rectangle({
          left: 300, top: 220, width: 200, height: 110, radius: 16,
          borderWidth: 4,
          backgroundColor: {
            type: "radial",
            center: { x: 0.5, y: 0.5 },
            radius: 0.5,
            stops: [
              { color: "#fff", position: 0 },
              { color: "#e0e0e0", position: 1 },
            ],
          },
          borderColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#06d6a0", position: 0 },
              { color: "#118ab2", position: 0.5 },
              { color: "#ef476f", position: 1 },
            ],
          },
        }),

        new Circle({
          left: 540, top: 220, width: 110, height: 110,
          borderWidth: 4,
          backgroundColor: {
            type: "linear",
            angle: 45,
            stops: [
              { color: "#a18cd1", position: 0 },
              { color: "#fbc2eb", position: 1 },
            ],
          },
          borderColor: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#ff0844", position: 0 },
              { color: "#ffb199", position: 1 },
            ],
          },
        }),

        // ========== 第三行：文本描边渐变 ==========

        new Text({
          left: 60, top: 356, width: 400, height: 24,
          text: "文本描边渐变（textStrokeColor 支持 GradientOption）",
          color: "#333", fontSize: 13,
        }),

        new Text({
          left: 60, top: 390, width: 300, height: 60,
          text: "渐变描边",
          fontSize: 42, fontWeight: "bold",
          color: "#fff",
          textStrokeWidth: 3,
          textStrokeColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#667eea", position: 0 },
              { color: "#764ba2", position: 1 },
            ],
          },
        }),

        new Text({
          left: 370, top: 390, width: 360, height: 60,
          text: "Gradient Stroke",
          fontSize: 42, fontWeight: "bold",
          color: "#222",
          textStrokeWidth: 2,
          textStrokeColor: {
            type: "linear",
            angle: 0,
            stops: [
              { color: "#f093fb", position: 0 },
              { color: "#f5576c", position: 1 },
            ],
          },
        }),

        new Text({
          left: 60, top: 470, width: 400, height: 50,
          text: "多色渐变描边",
          fontSize: 36, fontWeight: "bold",
          color: "transparent",
          textStrokeWidth: 2,
          textStrokeColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#ff0844", position: 0 },
              { color: "#43e97b", position: 0.5 },
              { color: "#4facfe", position: 1 },
            ],
          },
        }),

        // ========== 第四行：渐变边框的 Text ==========

        new Text({
          left: 60, top: 540, width: 400, height: 24,
          text: "Text 元素自带渐变边框 + 渐变描边",
          color: "#333", fontSize: 13,
        }),

        new Text({
          left: 60, top: 574, width: 280, height: 70, radius: 12,
          text: "Fulate",
          fontSize: 36, fontWeight: "bold",
          textAlign: "center",
          verticalAlign: "middle",
          backgroundColor: "#1a1a2e",
          color: "#06d6a0",
          borderWidth: 2,
          borderColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#06d6a0", position: 0 },
              { color: "#118ab2", position: 1 },
            ],
          },
          textStrokeWidth: 1,
          textStrokeColor: {
            type: "linear",
            angle: 90,
            stops: [
              { color: "#06d6a0", position: 0 },
              { color: "#118ab2", position: 1 },
            ],
          },
        }),

        new Text({
          left: 380, top: 574, width: 280, height: 70, radius: 12,
          text: "Hello World",
          fontSize: 32, fontWeight: "bold",
          textAlign: "center",
          verticalAlign: "middle",
          backgroundColor: "#fff",
          shadow: { color: "rgba(0,0,0,0.1)", blur: 16, offsetY: 4 },
          color: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#fa709a", position: 0 },
              { color: "#fee140", position: 1 },
            ],
          },
          borderWidth: 2,
          borderColor: {
            type: "linear",
            angle: 135,
            stops: [
              { color: "#fa709a", position: 0 },
              { color: "#fee140", position: 1 },
            ],
          },
        }),
      ],
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  },
});
