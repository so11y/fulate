import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Triangle, Text, Image } from "@fulate/ui";

registerDemo("basic", {
  title: "基础图形",
  group: "基础",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        new Rectangle({
          left: 60,
          top: 60,
          width: 120,
          height: 120,
          backgroundColor: "#e74c3c",
          radius: 8
        }),
        new Circle({
          left: 240,
          top: 60,
          width: 120,
          height: 120,
          backgroundColor: "#2ecc71"
        }),
        new Triangle({
          left: 420,
          top: 60,
          width: 120,
          height: 120,
          backgroundColor: "#f39c12"
        }),
        new Text({
          left: 60,
          top: 240,
          width: 200,
          height: 50,
          text: "Hello Fulate!",
          textAlign: "left",
          verticalAlign: "middle",
          backgroundColor: "red",
          color: "#fff",
          editable: true,
          wordWrap: false
        }),
        new Image({
          left: 320,
          top: 240,
          width: 120,
          height: 120,
          src: "https://picsum.photos/200/200",
          radius: 12
        })
      ]
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  }
});
