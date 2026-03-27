import { Root, Layer, EditerLayer, Artboard } from "@fulate/core";
import {
  Rectangle,
  Circle,
  Triangle,
  Polygon,
  Text,
  Image,
  Workspace,
  Pinned,
  Line
} from "@fulate/ui";
import { Select, Snap, Rule, LineTool } from "@fulate/tools";
import { markRaw } from "vue";
import { store, refreshSelection } from "./store";
import { loadFromStorage } from "./persistence";

export function initEditor(container: HTMLElement) {
  const { width, height } = container.getBoundingClientRect();
  const root = new Root(container, { width, height });

  const overlayLayer = new Layer({ zIndex: 100, enableDirtyRect: true });
  (root as any)._overlay = overlayLayer;

  const artboard = new Artboard();
  artboard.append(
    new Rectangle({
      left: 120,
      top: 80,
      width: 200,
      height: 150,
      backgroundColor: "#4A90D9",
      radius: 8,
      shadow: { color: "rgba(0,0,0,0.12)", blur: 8, offsetY: 2 }
    }),
    new Circle({
      left: 420,
      top: 100,
      width: 120,
      height: 120,
      backgroundColor: "#E74C3C"
    }),
    new Triangle({
      left: 280,
      top: 300,
      width: 140,
      height: 120,
      backgroundColor: "#2ECC71"
    }),
    new Polygon({
      left: 600,
      top: 300,
      backgroundColor: "#E67E22",
      points: [
        { x: 50, y: 0 },
        { x: 100, y: 38 },
        { x: 81, y: 100 },
        { x: 19, y: 100 },
        { x: 0, y: 38 }
      ]
    }),
    new Text({
      left: 150,
      top: 460,
      width: 320,
      height: 50,
      text: "Fulate Editor Demo",
      textAlign: "center",
      verticalAlign: "middle",
      backgroundColor: "#F39C12",
      color: "#fff",
      fontSize: 20,
      radius: 6
    }),
    new Rectangle({
      left: 550,
      top: 280,
      width: 160,
      height: 100,
      backgroundColor: "#9B59B6",
      radius: 12,
      borderColor: "#7D3C98",
      borderWidth: 2,
      children: [
        new Pinned({
          target: (e: any) => e.parent!,
          isPin: true,
          anchorX: 1,
          anchorY: 0,
          pivotX: 0.5,
          pivotY: 1,
          left: 0,
          top: -8,
          width: 52,
          height: 22,
          backgroundColor: "#1ABC9C",
          radius: 5,
          children: [
            new Text({
              left: 0,
              top: 0,
              width: 52,
              height: 22,
              text: "Pin",
              color: "#fff",
              fontSize: 11,
              textAlign: "center",
              verticalAlign: "middle",
              silent: true,
              pickable: false
            })
          ]
        }) as any
      ]
    }),
    new Rectangle({
      left: 600,
      top: 80,
      width: 120,
      height: 80,
      backgroundColor: "#3498DB",
      radius: 6,
      opacity: 0.7
    })
  );

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

  const selectTool = new Select();
  const editerLayer = new EditerLayer({
    zIndex: 2,
    children: [selectTool, new Snap(), new Rule(), new LineTool()]
  });

  root.append(contentLayer, editerLayer, overlayLayer);
  root.mount();

  loadFromStorage(root);

  store.root = markRaw(root);
  store.artboard = markRaw(artboard);
  store.select = markRaw(selectTool);
  store.viewportScale = root.viewport.scale;

  root.addEventListener("zoom", () => {
    store.viewportScale = root.viewport.getZoom();
  });

  root.addEventListener("pointerup", () => setTimeout(refreshSelection, 30));
  root.container.addEventListener("keyup", () =>
    setTimeout(refreshSelection, 30)
  );

  root.container.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    store.contextMenu = { visible: true, x: e.clientX, y: e.clientY };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).fulateRoot = root;

  return () => {
    root.unmounted();
  };
}

export function addElementToCanvas(
  type: string,
  clientX: number,
  clientY: number
) {
  const root = store.root!;
  const artboard = store.artboard!;
  const rect = root.containerRect;
  const vp = root.viewport;
  const x = (clientX - rect.left - vp.x) / vp.scale;
  const y = (clientY - rect.top - vp.y) / vp.scale;


  const creators: Record<string, () => any> = {
    rectangle: () =>
      new Rectangle({
        left: x - 80,
        top: y - 50,
        width: 160,
        height: 100,
        backgroundColor: randomColor(),
        radius: 6
      }),
    circle: () =>
      new Circle({
        left: x - 50,
        top: y - 50,
        width: 100,
        height: 100,
        backgroundColor: randomColor()
      }),
    triangle: () =>
      new Triangle({
        left: x - 60,
        top: y - 50,
        width: 120,
        height: 100,
        backgroundColor: randomColor()
      }),
    polygon: () =>
      new Polygon({
        left: x - 50,
        top: y - 50,
        backgroundColor: randomColor(),
        points: [
          { x: 50, y: 0 },
          { x: 100, y: 38 },
          { x: 81, y: 100 },
          { x: 19, y: 100 },
          { x: 0, y: 38 }
        ]
      }),
    text: () =>
      new Text({
        left: x - 100,
        top: y - 20,
        width: 200,
        height: 40,
        text: "文本",
        fontSize: 16,
        color: "#333",
        backgroundColor: "#FFF9C4",
        radius: 4
      }),
    image: () =>
      new Image({
        left: x - 100,
        top: y - 75,
        width: 200,
        height: 150,
        src: "https://picsum.photos/200/150?random=" + Date.now(),
        radius: 6
      }),
    customer: () =>
      new Rectangle({
        left: x - 90,
        top: y - 50,
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
      })
  };

  const create = creators[type];
  if (create) {
    const el = create();
    artboard.append(el);
  }
}

const PALETTE = [
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#9B59B6",
  "#1ABC9C",
  "#E67E22",
  "#34495E",
  "#16A085",
  "#D35400",
  "#8E44AD",
  "#2980B9",
  "#27AE60",
  "#F1C40F",
  "#C0392B"
];

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}
