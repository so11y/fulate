import { text } from "stream/consumers";
import {
  CircleImg,
  Element,
  Img,
  Text,
  // CircleImg,
  // Expanded,
  // Group,
  Root
  // Text,
  // Row,
  // Scroll
} from "./lib";
import { column, Column } from "./lib/column";
import { Text as TextInterface } from "./lib/text";
import { Drag } from "./extension";
import { select } from "./extension/select";
// import { Drag, Select } from "./extension";
// import { TextOptions } from "./lib/text";

const root = Root({
  el: document.getElementById("app")! as HTMLElement,
  // width: 500,
  // height: 500,
  animationSwitch: true,
  children: [
    Element({
      width: 30,
      height: 40,
      backgroundColor: "red",
      key: "333",
      x: 241,
      y: 292
      // rotateCenter: {
      //   x: 123.5,
      //   y: 10
      // },
      // rotate: 40
    }),
    Element({
      width: 30,
      height: 40,
      backgroundColor: "red",
      x: 116,
      y: 402
      // rotate: 90,
      // x: 180,
      // y: 338
    }),
    column({
      x: 358,
      y: 212,
      key: "444",
      // justifyContent: "space-between",
      // justifyContent: "center",
      // alignItems: "flex-end",
      // alignItems: "center",
      // padding: [0, 5, 0, 55],
      width: 130,
      height: 180,
      backgroundColor: "black",
      // rotateCenter: {
      //   x: 6.5,
      //   y: 90
      // },
      // rotate: 40,
      // position: "relative",
      // rotate: 10,
      children: [
        // Element({
        //   width: 100,
        //   height: 30,
        //   backgroundColor: "yellow"
        // }),
        // Text({
        //   key: "xsd",
        //   color: "white",
        //   text: "可以点我的",
        //   rotate: 10
        // }),
        // CircleImg({
        //   src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
        //   width: 50,
        //   height: 50,
        //   key: "3334",
        //   zIndex: 2,
        //   right: 0,
        //   position: "absolute"
        // })
      ]
    }),
    select()
  ]
});

// function render() {
//   root.render();
//   requestAnimationFrame(render);
// }

// render();

root.mounted();

// setInterval(() => {
//   console.time("render");
//   const c333 = root.getElementByKey("333")!;
//   const c444 = root.getElementByKey("444")!;
//   c333.rotate += 1;
//   c444.rotate += 1;
//   c333.setDirty();
//   c444.setDirty();
//   root.render();
//   console.timeEnd("render");
// }, 1000);

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

const junFei = root.getElementByKey("3334")!;
// const junFeibox = root.getElementByKey("333d")!;
// junFei.addEventListener("click", (e) => {
//   console.log(e.detail.target, "2");
// });
// junFeibox.addEventListener("click", (e) => {
//   console.log(e.detail.target, "1");
// });

// const junFei = root.getElementByKey<TextInterface>("xsd")!;
// console.log(1);
// junFei.addEventListener("click", (e) => {
//   console.log(e.detail.target, "--");
//   console.log(e.detail.target.getMinBoundingBox(), "--");
//   // junFei.setOption({
//   //   text: "好点"
//   // });
// });
