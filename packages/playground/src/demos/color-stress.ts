import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle } from "@fulate/ui";

const SIZE = 6;
const GAP = 1;
const STEP = SIZE + GAP;

const COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#9b59b6",
  "#f39c12",
  "#1abc9c",
  "#e67e22",
  "#34495e",
  "#16a085",
  "#c0392b",
  "#2980b9",
  "#8e44ad",
  "#d35400",
  "#27ae60",
  "#2c3e50",
  "#f1c40f"
];

function randomColor() {
  return COLORS[(Math.random() * COLORS.length) | 0];
}

registerDemo("color-stress", {
  title: "满屏节点持续变色",
  group: "性能",
  order: 2,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const COLS = Math.ceil(width / STEP);
    const ROWS = Math.ceil(height / STEP);
    const TOTAL = COLS * ROWS;

    const children: Rectangle[] = new Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = (i / COLS) | 0;
      children[i] = new Rectangle({
        left: col * STEP,
        top: row * STEP,
        width: SIZE,
        height: SIZE,
        backgroundColor: randomColor()
      });
    }

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children
    });

    root.append(layer);
    root.mount();

    console.log(`[color-stress] ${COLS}×${ROWS} = ${TOTAL} 个节点`);

    let disposed = false;
    const timers: number[] = [];

    const BATCH = 500;
    const MIN_INTERVAL = 50;
    const MAX_INTERVAL = 300;

    for (let i = 0; i < TOTAL; i += BATCH) {
      const delay =
        MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      const timer = window.setInterval(() => {
        if (disposed) return;
        for (let j = i; j < Math.min(i + BATCH, TOTAL); j++) {
          children[j].setPaint({ backgroundColor: randomColor() });
        }
      }, delay);
      timers.push(timer);
    }

    return () => {
      disposed = true;
      timers.forEach((t) => window.clearInterval(t));
      root.unmounted();
    };
  }
});
