import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Triangle, Image } from "@fulate/ui";

registerDemo("opacity-shadow", {
  title: "透明度 & 阴影",
  group: "基础",
  order: 2,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        // --- 透明度 ---
        new Rectangle({
          left: 60,
          top: 40,
          width: 120,
          height: 120,
          backgroundColor: "#e74c3c",
          radius: 8,
          opacity: 1
        }),
        new Rectangle({
          left: 140,
          top: 80,
          width: 120,
          height: 120,
          backgroundColor: "#3498db",
          radius: 8,
          opacity: 0.7
        }),
        new Rectangle({
          left: 220,
          top: 120,
          width: 120,
          height: 120,
          backgroundColor: "#2ecc71",
          radius: 8,
          opacity: 0.4
        }),

        // --- 阴影 ---
        new Rectangle({
          left: 450,
          top: 60,
          width: 140,
          height: 100,
          backgroundColor: "#fff",
          radius: 12,
          shadow: { color: "rgba(0,0,0,0.15)", blur: 12, offsetX: 0, offsetY: 4 }
        }),
        new Circle({
          left: 640,
          top: 60,
          width: 100,
          height: 100,
          backgroundColor: "#fff",
          shadow: { color: "rgba(0,0,0,0.25)", blur: 20, offsetX: 0, offsetY: 8 }
        }),
        new Triangle({
          left: 450,
          top: 210,
          width: 120,
          height: 110,
          backgroundColor: "#fff",
          shadow: { color: "rgba(0,0,0,0.2)", blur: 16, offsetX: 4, offsetY: 4 }
        }),

        // --- 透明度 + 阴影 ---
        new Rectangle({
          left: 640,
          top: 210,
          width: 140,
          height: 100,
          backgroundColor: "#9b59b6",
          radius: 16,
          opacity: 0.8,
          shadow: { color: "rgba(155,89,182,0.4)", blur: 24, offsetX: 0, offsetY: 10 }
        }),
        new Image({
          left: 60,
          top: 300,
          width: 150,
          height: 150,
          src: "https://picsum.photos/300/300",
          radius: 16,
          opacity: 0.6,
          shadow: { color: "rgba(0,0,0,0.3)", blur: 18, offsetX: 0, offsetY: 6 }
        }),
        new Circle({
          left: 280,
          top: 300,
          width: 140,
          height: 140,
          backgroundColor: "#e67e22",
          opacity: 0.5,
          shadow: { color: "rgba(230,126,34,0.5)", blur: 30, offsetX: 0, offsetY: 12 }
        })
      ]
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  }
});
