import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer, Artboard } from "@fulate/core";
import { Rectangle, Circle, Triangle, Text, Workspace } from "@fulate/ui";
import { Select, Snap, Rule, LineTool } from "@fulate/tools";

registerDemo("editor", {
  title: "完整编辑器",
  group: "编辑器",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const artboard = new Artboard({
      children: [
        new Rectangle({
          left: 100,
          top: 100,
          width: 200,
          height: 150,
          backgroundColor: "#3498db",
          radius: 8
        }),
        new Circle({
          left: 400,
          top: 120,
          width: 120,
          height: 120,
          backgroundColor: "#e74c3c"
        }),
        new Triangle({
          left: 250,
          top: 320,
          width: 140,
          height: 120,
          backgroundColor: "#2ecc71"
        }),
        new Text({
          left: 150,
          top: 480,
          width: 300,
          height: 50,
          text: "Fulate Editor",
          textAlign: "center",
          verticalAlign: "middle",
          backgroundColor: "#f39c12",
          color: "#fff"
        }),
        new Rectangle({
          left: 500,
          top: 300,
          width: 160,
          height: 100,
          backgroundColor: "#9b59b6",
          radius: 12,
          children: [
            new Circle({
              left: 20,
              top: 20,
              width: 30,
              height: 30,
              backgroundColor: "rgba(255,255,255,0.4)"
            }),
            new Circle({
              left: 60,
              top: 20,
              width: 30,
              height: 30,
              backgroundColor: "rgba(255,255,255,0.4)"
            })
          ]
        })
      ]
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
      children: [new Select(), new Snap(), new Rule(), new LineTool()]
    });

    root.append(contentLayer, editerLayer);
    root.mount();

    return () => root.unmounted();
  }
});
