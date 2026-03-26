import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer, Artboard } from "@fulate/core";
import { Rectangle, Text, Workspace } from "@fulate/ui";
import { Select, Snap, LineTool } from "@fulate/tools";

registerDemo("custom-anchors", {
  title: "自定义锚点",
  group: "连线",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const nodeA = new Rectangle({
      left: 150,
      top: 200,
      width: 180,
      height: 100,
      backgroundColor: "#3498db",
      radius: 8,
      anchors: [
        { label: "输入1", edge: "top" },
        { label: "输入2", edge: "top" },
        { label: "输入3", edge: "top" },
        { label: "输出", edge: "bottom" }
      ],
      children: [
        new Text({
          text: "节点 A (自定义锚点)",
          textAlign: "center",
          verticalAlign: "middle",
          color: "#fff",
          fontSize: 13,
          silent: true,
          pickable: false
        })
      ]
    });

    const nodeB = new Rectangle({
      left: 500,
      top: 100,
      width: 160,
      height: 90,
      backgroundColor: "#e74c3c",
      radius: 8,
      children: [
        new Text({
          text: "节点 B (默认锚点)",
          textAlign: "center",
          verticalAlign: "middle",
          color: "#fff",
          fontSize: 13,
          silent: true,
          pickable: false
        })
      ]
    });

    const nodeC = new Rectangle({
      left: 500,
      top: 350,
      width: 180,
      height: 100,
      backgroundColor: "#2ecc71",
      radius: 8,
      anchors: [
        { label: "数据源", edge: "left" },
        { label: "输出1", edge: "right" },
        { label: "输出2", edge: "right" }
      ],
      children: [
        new Text({
          text: "节点 C (左右锚点)",
          textAlign: "center",
          verticalAlign: "middle",
          color: "#fff",
          fontSize: 13,
          silent: true,
          pickable: false
        })
      ]
    });

    const nodeD = new Rectangle({
      left: 150,
      top: 450,
      width: 160,
      height: 80,
      backgroundColor: "#9b59b6",
      radius: 8,
      anchors: [
        { label: "输入", edge: "top" },
        { label: "输出1", edge: "bottom" },
        { label: "输出2", edge: "bottom" },
        { label: "输出3", edge: "bottom" }
      ],
      children: [
        new Text({
          text: "节点 D (多输出)",
          textAlign: "center",
          verticalAlign: "middle",
          color: "#fff",
          fontSize: 13,
          silent: true,
          pickable: false
        })
      ]
    });

    const hint = new Text({
      left: 20,
      top: 20,
      width: 400,
      height: 60,
      text: "按 L 进入画线模式，点击锚点连线\n自定义锚点显示突起和标签，默认锚点显示蓝点",
      color: "#666",
      fontSize: 12,
      silent: true,
      pickable: false
    });

    const artboard = new Artboard({
      children: [nodeA, nodeB, nodeC, nodeD, hint]
    });

    const workspace = new Workspace({
      width: 1920,
      height: 1080,
      children: [artboard]
    });

    const contentLayer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [workspace]
    });

    const editerLayer = new EditerLayer({
      zIndex: 2,
      children: [new Select(), new Snap(), new LineTool()]
    });

    root.append(contentLayer, editerLayer);
    root.mount();

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "position:absolute;bottom:20px;left:20px;display:flex;gap:8px;z-index:10;";

    const makeBtn = (text: string, onClick: () => void) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.style.cssText =
        "padding:6px 14px;border:1px solid #ccc;border-radius:6px;" +
        "background:#fff;cursor:pointer;font-size:12px;";
      btn.addEventListener("click", onClick);
      btnContainer.appendChild(btn);
      return btn;
    };

    makeBtn("给 A 添加锚点", () => {
      const anchors = [...(nodeA.anchors ?? [])];
      const topCount = anchors.filter((a) => a.edge === "top").length;
      anchors.push({
        label: `输入${topCount + 1}`,
        edge: "top"
      });
      nodeA.anchors = anchors;
      nodeA.markNeedsLayout();
    });

    makeBtn("删 A 最后一个 top 锚点", () => {
      const anchors = [...(nodeA.anchors ?? [])];
      const topAnchors = anchors.filter((a) => a.edge === "top");
      if (topAnchors.length <= 1) return;
      const lastTop = topAnchors[topAnchors.length - 1];
      nodeA.anchors = anchors.filter((a) => a !== lastTop);
      nodeA.markNeedsLayout();
    });

    makeBtn("切换 C 的锚点边", () => {
      const anchors = nodeC.anchors ?? [];
      const flipped = anchors.map((a) => ({
        ...a,
        edge: (a.edge === "left" ? "right" : a.edge === "right" ? "left" : a.edge) as typeof a.edge
      }));
      nodeC.anchors = flipped;
      nodeC.markNeedsLayout();
    });

    el.appendChild(btnContainer);

    //@ts-ignore
    window._fulateRoot = root;

    return () => root.unmounted();
  }
});
