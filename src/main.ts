import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer } from "./lib/layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/ui/artboard";
import { Workspace } from "./lib/ui/workspace";
import { Div, Display, FlexDirection, Justify, Align } from "./yoga/div";
import { Text } from "./lib/ui/text";
import { Circle } from "./lib/ui/circle";
import { Triangle } from "./lib/ui/triangle";
import { Image } from "./lib/ui/image";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: window.innerWidth,
  height: window.innerHeight
});

const de = new Rectangle({
  width: 20,
  height: 20,
  left: 5,
  top: 5,
  backgroundColor: "black"
});

const floorLayer = new Layer({
  children: [
    new Rectangle({
      backgroundColor: "#E5E5E5",
      width: 1920,
      height: 900,
      silent: true
      // children: [de]
    })
  ]
});

const ruleLayer = new Layer({
  children: [new Rule()]
});

const editerLayer = new Layer({
  zIndex: 2,
  enableDirtyRect: false,
  children: [new Select(), new Snap()]
});

// 添加快捷键绑定：Ctrl+G 编组，Ctrl+Shift+G 解组
window.addEventListener("keydown", (e) => {
  const selectTool = root.keyElmenet.get("select") as Select;

  if (!selectTool) return;

  if (e.key.toLowerCase() === "g" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (e.shiftKey) {
      console.log("执行解组");
      selectTool.unGroup();
    } else {
      console.log("执行编组");
      selectTool.doGroup();
    }
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    selectTool.delete();
    return;
  }
});
window.addEventListener("keydown", (e) => {
  // e.preventDefault();
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    root.history.undo();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "y") {
    root.history.redo();
  }
});

const div1 = new Rectangle({
  key: "344",
  left: 300,
  top: 150,
  width: 50,
  height: 50,
  radius: 20,
  backgroundColor: "red",
  onclick: (e) => {
    e.detail.target.setOptions({
      backgroundColor: "yellow"
      // children: [de]
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
  backgroundColor: "yellow",
  onclick: (e) => {
    e.detail.target.setOptions({
      backgroundColor: "yellow"
    });
  }
});

// --- 布局常量设置 ---
const START_X = 40; // 起始横坐标
const START_Y = 40; // 起始纵坐标
const ITEM_SIZE = 100; // 标准组件宽度
const GAP = 20; // 标准间距

// 计算函数：获取第几列的 X 坐标
const col = (n) => START_X + (ITEM_SIZE + GAP) * n;

root.append(
  // floorLayer,
  new Workspace({
    width: 1920,
    height: 900,
    children: [
      new Artboard({
        children: [
          // div1
          // div2,
          dev3

          // // // --- 第一行：基础几何图形与图片 (Row 0) ---
          // new Layer({
          //   zIndex: 2,
          //   enableDirtyRect: true,
          //   children: [
          //     new Rectangle({
          //       left: col(0),
          //       top: START_Y,
          //       width: ITEM_SIZE,
          //       height: ITEM_SIZE,
          //       backgroundColor: "pink",
          //       onclick(e) {
          //         e.detail.target.provide("qqq", 1);
          //         console.log(2);
          //       },
          //       children: [
          //         new Rectangle({
          //           left: 10,
          //           top: 20,
          //           width: 30,
          //           height: 70,
          //           backgroundColor: "blue",
          //           onclick: (e) => {
          //             console.log(e.detail.target.inject("qqq"), "--");
          //             e.detail.target.setOptions({
          //               left: col(0) + 20,
          //               backgroundColor: "blue"
          //             });
          //           }
          //         })
          //       ]
          //     }),
          //     new Circle({
          //       left: col(4),
          //       top: START_Y,
          //       width: ITEM_SIZE,
          //       height: ITEM_SIZE,
          //       backgroundColor: "green",
          //       onclick: (e) => {
          //         e.detail.target.setOptions({
          //           backgroundColor: "yellow"
          //         });
          //       }
          //     }),
          //     new Triangle({
          //       left: col(2),
          //       top: START_Y,
          //       width: ITEM_SIZE,
          //       height: ITEM_SIZE,
          //       backgroundColor: "orange",
          //       onclick: (e) => {
          //         e.detail.target.setOptions({
          //           backgroundColor: "yellow"
          //         });
          //       }
          //     }),
          //     new Image({
          //       left: col(3),
          //       top: START_Y,
          //       width: ITEM_SIZE,
          //       height: ITEM_SIZE,
          //       src: "https://picsum.photos/200/200",
          //       radius: 10
          //     }),

          //     // --- 第二行：文本与功能组件 (Row 1) ---
          //     new Text({
          //       left: col(0),
          //       top: START_Y + ITEM_SIZE + GAP, // 第一行下方
          //       width: ITEM_SIZE,
          //       height: 50,
          //       textAlign: "center",
          //       verticalAlign: "middle",
          //       backgroundColor: "blue",
          //       color: "#fff",
          //       underline: true,
          //       text: "测试文本"
          //     }),

          //     // 粉色 Flex 容器：放在 Text 右边，保持对齐
          //     new Div({
          //       left: col(1),
          //       top: START_Y + ITEM_SIZE + GAP,
          //       width: ITEM_SIZE,
          //       height: ITEM_SIZE,
          //       display: Display.Flex,
          //       backgroundColor: "pink",
          //       justifyContent: Justify.SpaceAround,
          //       children: [
          //         new Div({
          //           width: 50,
          //           height: 50,
          //           backgroundColor: "black",
          //           onclick(e) {
          //             e.detail.target.setOptions({ width: 10 });
          //           }
          //         }),
          //         new Div({
          //           width: 10,
          //           backgroundColor: "red"
          //         })
          //       ]
          //     })
          //   ]
          // })
        ]
      })
    ]
  })
  // ruleLayer,
  // editerLayer
);

// div1.addEventListener("click", (e) => {
//   e.detail.target
//     .setOptions({
//       backgroundColor: "yellow"
//     })
//     .layer.render();
// });

root.mount();

setTimeout(() => {
  console.log(1);
  dev3.setOptions({
    backgroundColor: "blue"
  });
});

console.log(root, "--");
