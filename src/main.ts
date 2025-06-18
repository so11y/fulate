import {
  Element,
  // CircleImg,
  // Expanded,
  // Group,
  Root
  // Text,
  // Row,
  // Scroll
} from "./lib";
import { column, Column } from "./lib/column";
// import { Drag, Select } from "./extension";
// import { TextOptions } from "./lib/text";

const root = Root({
  el: document.getElementById("app")! as HTMLElement,
  // width: 500,
  // height: 500,
  animationSwitch: true,
  useDirtyRect: true,
  dirtyDebug: true,
  children: [
    column({
      justifyContent: "space-between",
      // justifyContent: "center",
      // alignItems: "flex-end",
      alignItems: "center",
      // padding: [0, 5, 0, 5],
      width: 130,
      height: 180,
      backgroundColor: "black",
      key: "333d",
      // rotate: 10,
      children: [
        Element({
          width: 30,
          height: 40,
          backgroundColor: "red",
          key: "333",
          rotate: 40
        }),
        Element({
          flexBasis: 30,
          height: 40,
          backgroundColor: "blue"
        }),
        Element({
          width: 100,
          height: 30,
          backgroundColor: "yellow"
        }),
        Element({
          width: 50,
          height: 30,
          backgroundColor: "red",
          zIndex: 2
        })
      ]
    })
  ]
});

// function render() {
//   root.render();
//   requestAnimationFrame(render);
// }

// render();

root.mounted();

setInterval(() => {
  console.time("render");
  root.render();
  console.timeEnd("render");
}, 1000);

// let lastTime = performance.now();
// let frameCount = 0;
// let currentFPS = 0;

// function calculateFPS() {
//   const now = performance.now();
//   const delta = now - lastTime;

//   frameCount++;

//   // 每秒计算一次
//   if (delta >= 1000) {
//     currentFPS = Math.round((frameCount * 1000) / delta);
//     frameCount = 0;
//     lastTime = now;

//     console.log(`FPS: ${currentFPS}`);
//   }

//   requestAnimationFrame(calculateFPS);
// }

// calculateFPS();

// root.mounted();

const junFei = root.getElementByKey("333")!;
const junFeibox = root.getElementByKey("333d")!;
junFei.addEventListener("click", (e) => {
  console.log(e.detail.target, "2");
});
junFeibox.addEventListener("click", (e) => {
  console.log(e.detail.target, "1");
});
