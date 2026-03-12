import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Text } from "@fulate/ui";

registerDemo("animation", {
  title: "动画",
  group: "基础",
  order: 3,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const label = new Text({
      left: 60,
      top: 30,
      width: 300,
      height: 36,
      text: "点击矩形播放动画",
      color: "#333",
      verticalAlign: "middle",
    });

    const rect1 = new Rectangle({
      left: 80,
      top: 100,
      width: 80,
      height: 80,
      backgroundColor: "#e74c3c",
      radius: 8,
      onclick() {
        this.animate(
          { left: 400, angle: 360 },
          {
            duration: 800,
            onComplete: () => {
              this.animate({ left: 80, angle: 0 }, { duration: 800 });
            },
          }
        );
      },
    });

    const rect2 = new Rectangle({
      left: 80,
      top: 220,
      width: 80,
      height: 80,
      backgroundColor: "#3498db",
      radius: 40,
      onclick() {
        this.animate(
          { backgroundColor: "#e74c3c", width: 160, height: 160 },
          {
            duration: 500,
            onComplete: () => {
              this.animate(
                { backgroundColor: "#3498db", width: 80, height: 80 },
                { duration: 500 }
              );
            },
          }
        );
      },
    });

    const rect3 = new Rectangle({
      left: 80,
      top: 350,
      width: 60,
      height: 60,
      backgroundColor: "#2ecc71",
      onclick() {
        this.animate(
          { scaleX: 2, scaleY: 2, opacity: 0.3 },
          {
            duration: 600,
            onComplete: () => {
              this.animate(
                { scaleX: 1, scaleY: 1, opacity: 1 },
                { duration: 600 }
              );
            },
          }
        );
      },
    });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [label, rect1, rect2, rect3],
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  },
});
