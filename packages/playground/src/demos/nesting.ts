import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Text } from "@fulate/ui";

registerDemo("nesting", {
  title: "嵌套层级",
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        new Rectangle({
          left: 60,
          top: 60,
          width: 300,
          height: 300,
          backgroundColor: "#ecf0f1",
          radius: 12,
          children: [
            new Rectangle({
              left: 20,
              top: 20,
              width: 120,
              height: 120,
              backgroundColor: "#3498db",
              radius: 8,
              children: [
                new Circle({
                  left: 20,
                  top: 20,
                  width: 40,
                  height: 40,
                  backgroundColor: "#fff",
                }),
                new Text({
                  left: 10,
                  top: 70,
                  width: 100,
                  height: 30,
                  text: "内层文本",
                  color: "#fff",
                  textAlign: "center",
                  verticalAlign: "middle",
                }),
              ],
            }),
            new Rectangle({
              left: 160,
              top: 20,
              width: 120,
              height: 120,
              backgroundColor: "#e74c3c",
              radius: 8,
            }),
            new Rectangle({
              left: 20,
              top: 160,
              width: 260,
              height: 120,
              backgroundColor: "#2ecc71",
              radius: 8,
              children: [
                new Circle({
                  left: 10,
                  top: 10,
                  width: 30,
                  height: 30,
                  backgroundColor: "#fff",
                }),
                new Circle({
                  left: 50,
                  top: 10,
                  width: 30,
                  height: 30,
                  backgroundColor: "#fff",
                }),
                new Circle({
                  left: 90,
                  top: 10,
                  width: 30,
                  height: 30,
                  backgroundColor: "#fff",
                }),
              ],
            }),
          ],
        }),
      ],
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  },
});
