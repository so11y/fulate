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
// import { Drag, Select } from "./extension";
// import { TextOptions } from "./lib/text";

const root = Root({
  el: document.getElementById("app")! as HTMLElement,
  // width: 500,
  // height: 500,
  animationSwitch: true,
  children: [
    Drag({
      child: column({
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
          Drag({
            child: Element({
              width: 30,
              height: 40,
              backgroundColor: "red",
              key: "333",
              rotate: 40
            })
          }),
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
          Drag({
            child: CircleImg({
              src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
              width: 50,
              height: 50,
              key: "3334"
            })
          })
        ]
      })
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

const junFei = root.getElementByKey("3334")!;
// const junFeibox = root.getElementByKey("333d")!;
// junFei.addEventListener("click", (e) => {
//   console.log(e.detail.target, "2");
// });
// junFeibox.addEventListener("click", (e) => {
//   console.log(e.detail.target, "1");
// });

// const junFei = root.getElementByKey<TextInterface>("xsd")!;
junFei.addEventListener("click", (e) => {
  console.log(e.detail.target, "--");
  // junFei.setOption({
  //   text: "好点"
  // });
});
