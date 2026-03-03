import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer } from "./lib/layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/ui/artboard";
import { Workspace } from "./lib/ui/workspace";
import {
  Rectangle as Div,
  Display,
  FlexDirection,
  Justify,
  Align
} from "./yoga/div";
import { Text } from "./lib/ui/text";
import { Circle } from "./lib/ui/circle";
import { Triangle } from "./lib/ui/triangle";
import { Image } from "./lib/ui/image";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: window.innerWidth,
  height: window.innerHeight
});

const floorLayer = new Layer({
  children: [
    new Rectangle({
      backgroundColor: "#E5E5E5",
      width: 1920,
      height: 900,
      silent: true
    })
  ]
});

const editerLayer = new Layer({
  zIndex: 2,
  enableDirtyRect: false,
  children: [new Rule(), new Select(), new Snap()]
});

const div1 = new Rectangle({
  key: "344",
  left: 300,
  top: 100,
  width: 50,
  height: 50,
  radius: 20,
  cursor: "pointer",
  backgroundColor: "red",
  onclick: (e) => {
    console.log("div1 clicked", e);

    e.detail.target.setOptions({
      backgroundColor: "yellow"
    });
  }
});

const div2 = new Rectangle({
  left: 170,
  top: 100,
  width: 50,
  height: 50,
  angle: 0,
  // originX: "left",
  // originY: "top",
  backgroundColor: "blue"
});

const dev3 = new Rectangle({
  left: 0,
  top: 0,
  width: 30,
  height: 30,
  backgroundColor: "yellow"
});

// --- 布局常量设置 ---
const START_X = 40; // 起始横坐标
const START_Y = 40; // 起始纵坐标
const ITEM_SIZE = 100; // 标准组件宽度
const GAP = 20; // 标准间距

// 计算函数：获取第几列的 X 坐标
const col = (n) => START_X + (ITEM_SIZE + GAP) * n;

root.append(
  floorLayer,
  new Workspace({
    width: 1920,
    height: 900,
    children: [
      new Artboard({
        children: [
          div1,
          div2,
          dev3, // 保持原有引用

          // --- 第一行：基础几何图形与图片 (Row 0) ---
          new Layer({
            zIndex: 2,
            enableDirtyRect: true,
            children: [
              new Rectangle({
                left: col(0),
                top: START_Y,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                backgroundColor: "pink"
              }),
              new Circle({
                left: col(1),
                top: START_Y,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                backgroundColor: "green"
              }),
              new Triangle({
                left: col(2),
                top: START_Y,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                backgroundColor: "orange"
              }),
              new Image({
                left: col(3),
                top: START_Y,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                src: "https://picsum.photos/200/200",
                radius: 10
              }),

              // --- 第二行：文本与功能组件 (Row 1) ---
              new Text({
                left: col(0),
                top: START_Y + ITEM_SIZE + GAP, // 第一行下方
                width: ITEM_SIZE,
                height: 50,
                textAlign: "center",
                verticalAlign: "middle",
                backgroundColor: "blue",
                color: "#fff",
                underline: true,
                text: "测试文本"
              }),

              // 粉色 Flex 容器：放在 Text 右边，保持对齐
              new Div({
                left: col(1),
                top: START_Y + ITEM_SIZE + GAP,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                display: Display.Flex,
                backgroundColor: "pink",
                justifyContent: Justify.SpaceAround,
                children: [
                  new Div({
                    width: 50,
                    height: 50,
                    backgroundColor: "black",
                    onclick(e) {
                      e.detail.target.setOptions({ width: 10 });
                    }
                  }),
                  new Div({
                    width: 10,
                    backgroundColor: "red"
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  }),
  editerLayer
);

// div1.addEventListener("click", (e) => {
//   e.detail.target
//     .setOptions({
//       backgroundColor: "yellow"
//     })
//     .layer.render();
// });

root.mounted();

console.log(root, "--");
