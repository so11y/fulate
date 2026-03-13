import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer } from "@fulate/core";
import { Rectangle } from "@fulate/ui";
import { Select } from "@fulate/tools";

const TOTAL = 100_000;
const COLS = 400;
const SIZE = 8;
const GAP = 1;
const STEP = SIZE + GAP;

const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#9b59b6",
  "#f39c12", "#1abc9c", "#e67e22", "#34495e",
  "#16a085", "#c0392b", "#2980b9", "#8e44ad",
];

registerDemo("10w", {
  title: "10 万节点压测",
  group: "性能",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const children: Rectangle[] = new Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = (i / COLS) | 0;
      children[i] = new Rectangle({
        left: col * STEP,
        top: row * STEP,
        width: SIZE,
        height: SIZE,
        backgroundColor: COLORS[i % COLORS.length],
      });
    }

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children,
    });

    const editerLayer = new EditerLayer({
      zIndex: 2,
      children: [new Select()],
    });

    root.append(layer, editerLayer);

    const t0 = performance.now();
    root.mount();
    root.nextTick(() => {
      const elapsed = (performance.now() - t0).toFixed(1);
      console.log(`[10w] ${TOTAL} 个节点 mount → 首次绘制完成：${elapsed}ms`);
    });

    return () => root.unmounted();
  },
});
