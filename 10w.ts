//@ts-nocheck
import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer } from "./lib/layer";
import { EditerLayer } from "./lib/layer/editer-layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/layer/artboard";
import { Workspace } from "./lib/ui/workspace";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: window.innerWidth,
  height: window.innerHeight
});

const editerLayer = new EditerLayer({
  zIndex: 2,
  children: [
    new Rule(),
    new Select()
    // new Snap()
  ]
});

const layer = new Layer();

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

layer.append(...gridChildren);

root.append(layer, editerLayer);

console.time("渲染10w节点");
root.mount();

const totalW = cols * (cellSize + gap) - gap;
const totalH = rows * (cellSize + gap) - gap;
const rulerSize = 25;
const padding = 40;
const availW = root.width - rulerSize - padding * 2;
const availH = root.height - rulerSize - padding * 2;
const fitScale = Math.min(availW / totalW, availH / totalH);

root.viewport.scale = fitScale;
root.viewport.x = rulerSize + padding + (availW - totalW * fitScale) / 2;
root.viewport.y = rulerSize + padding + (availH - totalH * fitScale) / 2;
root.requestRender();

const time = Date.now();
root.nextTick(() => {
  console.log(Date.now() - time);
});
