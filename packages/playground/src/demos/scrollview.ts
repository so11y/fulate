import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Text, ScrollView } from "@fulate/ui";

const COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#9b59b6",
  "#f39c12",
  "#1abc9c",
  "#e67e22",
  "#34495e"
];

function createListItem(index: number, y: number, w = 256) {
  return new Rectangle({
    left: 12,
    top: y,
    width: w,
    height: 56,
    backgroundColor: COLORS[index % COLORS.length],
    radius: 8,
    children: [
      new Circle({
        left: 10,
        top: 10,
        width: 36,
        height: 36,
        backgroundColor: "rgba(255,255,255,0.3)"
      }),
      new Text({
        left: 56,
        top: 0,
        width: w - 76,
        height: 56,
        text: `Item ${index + 1}`,
        color: "#fff",
        verticalAlign: "middle"
      })
    ]
  });
}

registerDemo("scrollview", {
  title: "滚动条",
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const items: Rectangle[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(createListItem(i, i * 68));
    }

    const scrollList = new ScrollView({
      left: 60,
      top: 60,
      width: 280,
      height: 400,
      backgroundColor: "#f8f9fa",
      borderColor: "#dee2e6",
      borderWidth: 1,
      children: items
    });

    const maxHeightItems: Rectangle[] = [];
    for (let i = 0; i < 12; i++) {
      maxHeightItems.push(
        new Rectangle({
          left: 12,
          top: i * 52,
          width: 216,
          height: 40,
          backgroundColor: COLORS[(i + 3) % COLORS.length],
          radius: 6,
          children: [
            new Text({
              left: 12,
              top: 0,
              width: 192,
              height: 40,
              text: `Row ${i + 1}`,
              color: "#fff",
              verticalAlign: "middle"
            })
          ]
        })
      );
    }

    let itemCount = maxHeightItems.length;

    const statusLabel = new Text({
      left: 400,
      top: 420,
      width: 240,
      height: 24,
      text: "",
      color: "#e74c3c"
    });

    const autoSizeScroll = new ScrollView({
      left: 0,
      top: 0,
      width: 240,
      maxHeight: 300,
      backgroundColor: "#fff",
      children: maxHeightItems,
      onscrollend() {
        statusLabel.setOptions({ text: "已滚动到底部" });
      }
    });

    const autoSizeContainer = new Rectangle({
      left: 400,
      top: 60,
      width: 240,
      height: 300,
      backgroundColor: "#ecf0f1",
      borderColor: "#dee2e6",
      borderWidth: 1,
      children: [autoSizeScroll]
    });

    const addBtn = new Rectangle({
      left: 400,
      top: 380,
      width: 110,
      height: 32,
      backgroundColor: "#2ecc71",
      radius: 6,
      cursor: "pointer",
      children: [
        new Text({
          left: 0,
          top: 0,
          width: 110,
          height: 32,
          text: "+ 添加",
          color: "#fff",
          textAlign: "center",
          verticalAlign: "middle"
        })
      ],
      onclick() {
        const newItem = new Rectangle({
          left: 12,
          top: itemCount * 52,
          width: 216,
          height: 40,
          backgroundColor: COLORS[itemCount % COLORS.length],
          radius: 6,
          children: [
            new Text({
              left: 12,
              top: 0,
              width: 192,
              height: 40,
              text: `Row ${itemCount + 1}`,
              color: "#fff",
              verticalAlign: "middle"
            })
          ]
        });
        itemCount++;
        autoSizeScroll.append(newItem);
        statusLabel.setOptions({ text: `共 ${itemCount} 项` });
      }
    });

    const removeBtn = new Rectangle({
      left: 530,
      top: 380,
      width: 110,
      height: 32,
      backgroundColor: "#e74c3c",
      radius: 6,
      cursor: "pointer",
      children: [
        new Text({
          left: 0,
          top: 0,
          width: 110,
          height: 32,
          text: "- 删除",
          color: "#fff",
          textAlign: "center",
          verticalAlign: "middle"
        })
      ],
      onclick() {
        const children = autoSizeScroll.children;
        if (!children?.length) return;
        const last = children[children.length - 1];
        autoSizeScroll.removeChild(last);
        itemCount = Math.max(0, itemCount - 1);
        statusLabel.setOptions({ text: `共 ${itemCount} 项` });
      }
    });

    const labelFixed = new Text({
      left: 60,
      top: 30,
      width: 280,
      height: 24,
      text: "固定高度 · 滚轮 / 拖拽滚动条",
      color: "#555"
    });

    const labelAuto = new Text({
      left: 400,
      top: 30,
      width: 240,
      height: 24,
      text: "maxHeight · 自动尺寸",
      color: "#555"
    });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        labelFixed,
        labelAuto,
        scrollList,
        autoSizeContainer,
        addBtn,
        removeBtn,
        statusLabel
      ]
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  }
});
