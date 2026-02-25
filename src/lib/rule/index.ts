import { Element } from "../base";
import { Point } from "../../util/point";

function niceStep(pxPerTick: number, scale: number) {
  const raw = pxPerTick / scale;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 5, 10];
  let best = candidates[0] * pow;
  for (const c of candidates) {
    const val = c * pow;
    if (Math.abs(val - raw) < Math.abs(best - raw)) best = val;
  }
  return best;
}

export class Rule extends Element {
  dragging = false;
  lastPointer: Point | null = null;
  isSpace = false;
  type = "rule";

  mounted() {
    const root = this.root;
    const onPanZoom = () => {
      this.render();
    };
    root.addEventListener("panzoom", onPanZoom);
    this.unmounted = () => {
      root.removeEventListener("panzoom", onPanZoom);
      super.unmounted();
    };
    super.mounted();
  }

  render() {
    const ctx = this.layer.ctx;
    const w = this.root.width || 0;
    const h = this.root.height || 0;
    const viewport = this.root.viewport;

    const rulerSize = 25;
    const pxPerTick = 50;
    const minorCount = 5;
    const majorLen = 10;
    const minorLen = 4;

    const bgColor = "#fafafa";
    const borderColor = "#dadada";
    const tickColor = "#c0c0c0";
    const textColor = "#888888";

    ctx.save();
    ctx.setTransform(this.getOwnMatrix());

    // ================= X 轴 =================
    ctx.clearRect(rulerSize, 0, w - rulerSize, rulerSize);
    ctx.fillStyle = bgColor;
    ctx.fillRect(rulerSize, 0, Math.max(0, w - rulerSize), rulerSize);

    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.moveTo(rulerSize, rulerSize - 0.5);
    ctx.lineTo(w, rulerSize - 0.5);
    ctx.stroke();

    const stepX = niceStep(pxPerTick, viewport.scale);
    const startWorldX = (rulerSize - viewport.x) / viewport.scale;
    const endWorldX = (w - viewport.x) / viewport.scale;
    const firstTickX = Math.floor(startWorldX / stepX) * stepX;
    const precisionX = Math.max(0, -Math.floor(Math.log10(stepX)));

    ctx.beginPath();
    ctx.fillStyle = textColor;
    ctx.strokeStyle = tickColor;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center"; // X轴文字完全居中
    ctx.textBaseline = "top";

    for (let x = firstTickX; x <= endWorldX; x += stepX) {
      const majorPx = rulerSize + (x - startWorldX) * viewport.scale;

      for (let i = 1; i < minorCount; i++) {
        const val = x + (i * stepX) / minorCount;
        if (val > endWorldX) break;
        const mx =
          Math.floor(rulerSize + (val - startWorldX) * viewport.scale) + 0.5;
        ctx.moveTo(mx, rulerSize);
        ctx.lineTo(mx, rulerSize - minorLen);
      }

      const px = Math.floor(majorPx) + 0.5;
      ctx.moveTo(px, rulerSize);
      ctx.lineTo(px, rulerSize - majorLen);

      const label = Math.abs(x) < 1e-10 ? "0" : x.toFixed(precisionX);
      ctx.fillText(label, px, 4); // 取消偏移量，直接在px位置居中绘制
    }
    ctx.stroke();

    // ================= Y 轴 =================
    ctx.clearRect(0, rulerSize, rulerSize, Math.max(0, h - rulerSize));
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, rulerSize, rulerSize, Math.max(0, h - rulerSize));

    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.moveTo(rulerSize - 0.5, rulerSize);
    ctx.lineTo(rulerSize - 0.5, h);
    ctx.stroke();

    const stepY = niceStep(pxPerTick, viewport.scale);
    const startWorldY = (rulerSize - viewport.y) / viewport.scale;
    const endWorldY = (h - viewport.y) / viewport.scale;
    const firstTickY = Math.floor(startWorldY / stepY) * stepY;
    const precisionY = Math.max(0, -Math.floor(Math.log10(stepY)));

    ctx.beginPath();
    ctx.fillStyle = textColor;
    ctx.strokeStyle = tickColor;

    for (let y = firstTickY; y <= endWorldY; y += stepY) {
      const majorPy = rulerSize + (y - startWorldY) * viewport.scale;

      for (let i = 1; i < minorCount; i++) {
        const val = y + (i * stepY) / minorCount;
        if (val > endWorldY) break;
        const my =
          Math.floor(rulerSize + (val - startWorldY) * viewport.scale) + 0.5;
        ctx.moveTo(rulerSize, my);
        ctx.lineTo(rulerSize - minorLen, my);
      }

      const py = Math.floor(majorPy) + 0.5;
      ctx.moveTo(rulerSize, py);
      ctx.lineTo(rulerSize - majorLen, py);

      const label = Math.abs(y) < 1e-10 ? "0" : y.toFixed(precisionY);
      ctx.save();
      ctx.translate(8, py);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.stroke();

    // ================= 左上角空白区 =================
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, rulerSize, rulerSize);

    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.moveTo(rulerSize - 0.5, 0);
    ctx.lineTo(rulerSize - 0.5, rulerSize);
    ctx.moveTo(0, rulerSize - 0.5);
    ctx.lineTo(rulerSize, rulerSize - 0.5);
    ctx.stroke();

    const sleectEL = this.root.keyElmenet?.get("select") as any;
    if (sleectEL && sleectEL.width && sleectEL.height) {
      const rect = sleectEL.getBoundingRect();

      const rectLeft = rect.left * viewport.scale + viewport.x;
      const rectTop = rect.top * viewport.scale + viewport.y;
      const widthPx = rect.width * viewport.scale;
      const heightPx = rect.height * viewport.scale;

      ctx.save();
      ctx.fillStyle = "#1890ff";
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = "#1890ff";
      ctx.lineWidth = 1;

      // X轴高亮，控制范围不覆盖左上角交叉区
      const startX = Math.max(rulerSize, rectLeft);
      const endX = rectLeft + widthPx;
      if (endX > rulerSize) {
        ctx.beginPath();
        ctx.rect(startX, 0, endX - startX, rulerSize);
        ctx.fill();
        ctx.stroke();
      }

      // Y轴高亮
      const startY = Math.max(rulerSize, rectTop);
      const endY = rectTop + heightPx;
      if (endY > rulerSize) {
        ctx.beginPath();
        ctx.rect(0, startY, rulerSize, endY - startY);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
