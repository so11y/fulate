import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Text } from "@fulate/ui";

registerDemo("opacity", {
  title: "父子透明度继承",
  group: "基础",
  order: 10,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
    });

    // 背景格子 - 方便观察透明度
    for (let x = 0; x < 900; x += 20) {
      for (let y = 0; y < 600; y += 20) {
        const isOdd = ((x / 20) + (y / 20)) % 2 === 0;
        layer.append(
          new Rectangle({
            left: x,
            top: y,
            width: 20,
            height: 20,
            backgroundColor: isOdd ? "#e0e0e0" : "#ffffff",
            silent: true,
            pickable: false,
            selectctbale: false,
          })
        );
      }
    }

    // ===== 示例 1：父 opacity=1，子 opacity=1（正常） =====
    layer.append(
      new Text({
        left: 60, top: 30, width: 200, height: 24,
        text: "opacity: 1.0 → 1.0",
        fontSize: 14, fontWeight: 600, color: "#333",
        selectctbale: false, silent: true,
      })
    );
    layer.append(
      new Rectangle({
        left: 60,
        top: 60,
        width: 200,
        height: 150,
        backgroundColor: "#3498db",
        radius: 12,
        opacity: 1,
        children: [
          new Rectangle({
            left: 20,
            top: 20,
            width: 80,
            height: 80,
            backgroundColor: "#e74c3c",
            radius: 8,
          }),
          new Rectangle({
            left: 60,
            top: 50,
            width: 80,
            height: 80,
            backgroundColor: "#2ecc71",
            radius: 8,
          }),
        ],
      })
    );

    // ===== 示例 2：父 opacity=0.5，子 opacity=1（子自动继承） =====
    layer.append(
      new Text({
        left: 320, top: 30, width: 250, height: 24,
        text: "父 opacity: 0.5 → 子继承",
        fontSize: 14, fontWeight: 600, color: "#333",
        selectctbale: false, silent: true,
      })
    );
    layer.append(
      new Rectangle({
        left: 320,
        top: 60,
        width: 200,
        height: 150,
        backgroundColor: "#3498db",
        radius: 12,
        opacity: 0.5,
        children: [
          new Rectangle({
            left: 20,
            top: 20,
            width: 80,
            height: 80,
            backgroundColor: "#e74c3c",
            radius: 8,
          }),
          new Rectangle({
            left: 60,
            top: 50,
            width: 80,
            height: 80,
            backgroundColor: "#2ecc71",
            radius: 8,
          }),
        ],
      })
    );

    // ===== 示例 3：父 opacity=0.3，子 opacity=1 =====
    layer.append(
      new Text({
        left: 580, top: 30, width: 250, height: 24,
        text: "父 opacity: 0.3 → 子继承",
        fontSize: 14, fontWeight: 600, color: "#333",
        selectctbale: false, silent: true,
      })
    );
    layer.append(
      new Rectangle({
        left: 580,
        top: 60,
        width: 200,
        height: 150,
        backgroundColor: "#3498db",
        radius: 12,
        opacity: 0.3,
        children: [
          new Rectangle({
            left: 20,
            top: 20,
            width: 80,
            height: 80,
            backgroundColor: "#e74c3c",
            radius: 8,
          }),
          new Rectangle({
            left: 60,
            top: 50,
            width: 80,
            height: 80,
            backgroundColor: "#2ecc71",
            radius: 8,
          }),
        ],
      })
    );

    // ===== 示例 4：父 opacity=0.5，子自身 opacity=0.5（叠加） =====
    layer.append(
      new Text({
        left: 60, top: 260, width: 300, height: 24,
        text: "父 0.5 × 子 0.5 = 0.25",
        fontSize: 14, fontWeight: 600, color: "#333",
        selectctbale: false, silent: true,
      })
    );
    layer.append(
      new Rectangle({
        left: 60,
        top: 290,
        width: 200,
        height: 150,
        backgroundColor: "#3498db",
        radius: 12,
        opacity: 0.5,
        children: [
          new Rectangle({
            left: 20,
            top: 20,
            width: 80,
            height: 80,
            backgroundColor: "#e74c3c",
            radius: 8,
            opacity: 0.5,
          }),
          new Rectangle({
            left: 60,
            top: 50,
            width: 80,
            height: 80,
            backgroundColor: "#2ecc71",
            radius: 8,
            opacity: 0.5,
          }),
        ],
      })
    );

    // ===== 示例 5：三层嵌套 =====
    layer.append(
      new Text({
        left: 320, top: 260, width: 300, height: 24,
        text: "三层嵌套: 0.8 × 0.7 × 0.6",
        fontSize: 14, fontWeight: 600, color: "#333",
        selectctbale: false, silent: true,
      })
    );
    layer.append(
      new Rectangle({
        left: 320,
        top: 290,
        width: 220,
        height: 170,
        backgroundColor: "#9b59b6",
        radius: 12,
        opacity: 0.8,
        children: [
          new Rectangle({
            left: 20,
            top: 20,
            width: 180,
            height: 130,
            backgroundColor: "#3498db",
            radius: 8,
            opacity: 0.7,
            children: [
              new Rectangle({
                left: 15,
                top: 15,
                width: 100,
                height: 80,
                backgroundColor: "#e74c3c",
                radius: 6,
                opacity: 0.6,
              }),
            ],
          }),
        ],
      })
    );

    // ===== 示例 6：文字也继承 =====
    layer.append(
      new Text({
        left: 600, top: 260, width: 300, height: 24,
        text: "文字也继承透明度",
        fontSize: 14, fontWeight: 600, color: "#333",
        selectctbale: false, silent: true,
      })
    );
    layer.append(
      new Rectangle({
        left: 600,
        top: 290,
        width: 200,
        height: 150,
        backgroundColor: "#2c3e50",
        radius: 12,
        opacity: 0.5,
        children: [
          new Text({
            left: 15,
            top: 15,
            width: 170,
            height: 40,
            text: "半透明文字",
            fontSize: 20,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            verticalAlign: "middle",
          }),
          new Rectangle({
            left: 20,
            top: 70,
            width: 160,
            height: 50,
            backgroundColor: "#f39c12",
            radius: 6,
            children: [
              new Text({
                left: 0,
                top: 0,
                width: 160,
                height: 50,
                text: "嵌套文字",
                fontSize: 16,
                color: "#fff",
                textAlign: "center",
                verticalAlign: "middle",
              }),
            ],
          }),
        ],
      })
    );

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  },
});
