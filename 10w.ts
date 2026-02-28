import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer } from "./lib/layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/ui/artboard";
import { Workspace } from "./lib/ui/workspace";
import { Rectangle as Div, Display, FlexDirection, Justify } from "./yoga/base";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: window.innerWidth,
  height: window.innerHeight
});

const editerLayer = new Layer({
  zIndex: 2,
  children: [
    new Rule(),
    new Select()
    // new Snap()
  ]
});

// 生成 10w 个节点网格
const gridChildren: Rectangle[] = [];
const cols = 316;
const rows = 316;
const cellSize = 20;
const gap = 5;

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    gridChildren.push(
      new Rectangle({
        left: col * (cellSize + gap),
        top: row * (cellSize + gap),
        width: cellSize,
        height: cellSize,
        backgroundColor: `hsl(${(row * cols + col) % 360}, 70%, 60%)`,
        cursor: "pointer",
        onclick: (e) => {
          e.detail.target.setOptions({
            backgroundColor: "red"
          });
        }
      })
    );
  }
}

root.append(...gridChildren);

// div1.addEventListener("click", (e) => {
//   e.detail.target
//     .setOptions({
//       backgroundColor: "yellow"
//     })
//     .layer.render();
// });

console.time("渲染10w节点");
root.mounted();
root.layer.nextTick(() => {
  console.timeEnd("渲染10w节点");
});

// FPS 计算
// let lastTime = performance.now();
// let frames = 0;
// const fpsEl = document.createElement("div");
// fpsEl.style.position = "fixed";
// fpsEl.style.top = "10px";
// fpsEl.style.right = "10px";
// fpsEl.style.padding = "8px 12px";
// fpsEl.style.backgroundColor = "rgba(0,0,0,0.7)";
// fpsEl.style.color = "#0f0";
// fpsEl.style.fontFamily = "monospace";
// fpsEl.style.fontSize = "14px";
// fpsEl.style.zIndex = "9999";
// document.body.appendChild(fpsEl);

// function updateFPS() {
//   frames++;
//   const now = performance.now();
//   if (now >= lastTime + 1000) {
//     const fps = Math.round((frames * 1000) / (now - lastTime));
//     fpsEl.textContent = `FPS: ${fps}`;
//     frames = 0;
//     lastTime = now;
//   }
//   requestAnimationFrame(updateFPS);
// }
// updateFPS();

// console.log(root, "--");
