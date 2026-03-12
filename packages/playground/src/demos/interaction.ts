import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer } from "@fulate/core";
import { Rectangle, Text } from "@fulate/ui";
import { Select } from "@fulate/tools";

registerDemo("interaction", {
  title: "交互事件",
  group: "基础",
  order: 2,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const label = new Text({
      left: 60,
      top: 30,
      width: 300,
      height: 36,
      text: "点击矩形试试",
      color: "#333",
      verticalAlign: "middle",
    });

    let clickCount = 0;
    const colors = ["#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#f39c12"];

    const rect = new Rectangle({
      left: 100,
      top: 100,
      width: 150,
      height: 150,
      backgroundColor: colors[0],
      radius: 12,
      onclick() {
        clickCount++;
        this.setOptions({
          backgroundColor: colors[clickCount % colors.length],
        });
        label.setOptions({ text: `已点击 ${clickCount} 次` });
      },
    });

    const draggable = new Rectangle({
      left: 350,
      top: 100,
      width: 100,
      height: 100,
      backgroundColor: "#1abc9c",
      radius: 8,
      cursor: "grab",
    });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [label, rect, draggable],
    });

    const editerLayer = new EditerLayer({
      zIndex: 2,
      children: [new Select()],
    });

    root.append(layer, editerLayer);
    root.mount();

    return () => root.unmounted();
  },
});
