import { Element } from "../../node/element";
import { Point } from "../../../util/point";

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
  type = "rule";
  key = "rule";
  rulerSize = 25;

  selectctbale = false;

  hasInView() {
    return true;
  }

  mounted() {
    const root = this.root;
    this.root.viewport.x = 25;
    this.root.viewport.y = 25;
    root.addEventListener("wheel", () => this.paint());
    root.addEventListener("translation", () => this.paint());
    super.mounted();
  }

  paint() {
    const ctx = this.layer.ctx;
    const w = this.root.width || 0;
    const h = this.root.height || 0;
    const viewport = this.root.viewport;

    const rulerSize = this.rulerSize;
    const pxPerTick = 50;
    const minorCount = 5;

    const borderColor = "#dadada";
    const tickColor = "#c0c0c0";
    const bgColor = "#ffffff"; // 纯白背景让文字更跳
    const textColor = "#333333"; // 深灰色文字，清晰度最高

    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // ================= X 轴 =================
    ctx.clearRect(rulerSize, 0, w - rulerSize, rulerSize);
    ctx.fillStyle = bgColor;
    ctx.fillRect(rulerSize, 0, Math.max(0, w - rulerSize), rulerSize);

    const stepX = niceStep(pxPerTick, viewport.scale);
    // 修复缩放空隙：从 0 点对应的世界坐标开始算起
    const startWorldX = (0 - viewport.x) / viewport.scale;
    const endWorldX = (w - viewport.x) / viewport.scale;
    const firstTickX = Math.floor(startWorldX / stepX) * stepX;
    const precisionX = Math.max(0, -Math.floor(Math.log10(stepX)));

    ctx.save();
    // 裁剪区防止线条画到左上角
    ctx.beginPath();
    ctx.rect(rulerSize, 0, w - rulerSize, rulerSize);
    ctx.clip();

    ctx.beginPath();
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";

    for (let x = firstTickX; x <= endWorldX; x += stepX) {
      const px = Math.floor(x * viewport.scale + viewport.x) + 0.5;

      // 1. 小刻度
      for (let i = 1; i < minorCount; i++) {
        const val = x + (i * stepX) / minorCount;
        const mx = Math.floor(val * viewport.scale + viewport.x) + 0.5;
        ctx.moveTo(mx, rulerSize);
        ctx.lineTo(mx, rulerSize - 5); // 小刻度不拉满，保持美观
      }

      // 2. 主刻度：线条拉满 (0 到 rulerSize)
      ctx.moveTo(px, 0);
      ctx.lineTo(px, rulerSize);

      // 3. 文字靠边：左对齐，距离线 2px
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const label = Math.abs(x) < 1e-10 ? "0" : x.toFixed(precisionX);
      ctx.fillText(label, px + 2, 2);
      ctx.restore();
    }
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;

    // 顶部外贴边线 (新增)
    ctx.moveTo(0, 0.5);
    ctx.lineTo(w, 0.5);

    // 左侧外贴边线 (新增)
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, h);

    // X轴内侧底线
    ctx.moveTo(0, rulerSize - 0.5);
    ctx.lineTo(w, rulerSize - 0.5);

    // Y轴内侧右线
    ctx.moveTo(rulerSize - 0.5, 0);
    ctx.lineTo(rulerSize - 0.5, h);

    ctx.stroke();

    // X轴底边线
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.moveTo(rulerSize, rulerSize - 0.5);
    ctx.lineTo(w, rulerSize - 0.5);
    ctx.stroke();

    // ================= Y 轴 =================
    ctx.clearRect(0, rulerSize, rulerSize, Math.max(0, h - rulerSize));
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, rulerSize, rulerSize, Math.max(0, h - rulerSize));

    const stepY = niceStep(pxPerTick, viewport.scale);
    const startWorldY = (0 - viewport.y) / viewport.scale;
    const endWorldY = (h - viewport.y) / viewport.scale;
    const firstTickY = Math.floor(startWorldY / stepY) * stepY;
    const precisionY = Math.max(0, -Math.floor(Math.log10(stepY)));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, rulerSize, rulerSize, h - rulerSize);
    ctx.clip();

    ctx.beginPath();
    ctx.strokeStyle = tickColor;

    for (let y = firstTickY; y <= endWorldY; y += stepY) {
      const py = Math.floor(y * viewport.scale + viewport.y) + 0.5;

      // 1. 小刻度
      for (let i = 1; i < minorCount; i++) {
        const val = y + (i * stepY) / minorCount;
        const my = Math.floor(val * viewport.scale + viewport.y) + 0.5;
        ctx.moveTo(rulerSize, my);
        ctx.lineTo(rulerSize - 5, my);
      }

      // 2. 主刻度：线条拉满 (0 到 rulerSize)
      ctx.moveTo(0, py);
      ctx.lineTo(rulerSize, py);

      // 3. 文字靠边
      const label = Math.abs(y) < 1e-10 ? "0" : y.toFixed(precisionY);
      ctx.save();
      ctx.translate(2, py + 2); // 靠左边 2px，线下侧 2px
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = textColor;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.stroke();
    ctx.restore();

    // ================= 3. 边界线渲染 (补全外贴边) =================
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;

    // 顶部外贴边线 (新增)
    ctx.moveTo(0, 0.5);
    ctx.lineTo(w, 0.5);

    // 左侧外贴边线 (新增)
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, h);

    // X轴内侧底线
    ctx.moveTo(0, rulerSize - 0.5);
    ctx.lineTo(w, rulerSize - 0.5);

    // Y轴内侧右线
    ctx.moveTo(rulerSize - 0.5, 0);
    ctx.lineTo(rulerSize - 0.5, h);

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

    // 补上 "px" 文字，更像截图
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("px", rulerSize / 2, rulerSize / 2);

    // ================= 选中高亮逻辑 =================
    const sleectEL = this.root.keyElmenet?.get("select") as any;
    if (sleectEL && sleectEL.width && sleectEL.height) {
      const rect = sleectEL.getBoundingRect();
      const rectLeft = rect.left * viewport.scale + viewport.x;
      const rectTop = rect.top * viewport.scale + viewport.y;
      const widthPx = rect.width * viewport.scale;
      const heightPx = rect.height * viewport.scale;

      ctx.save();
      ctx.fillStyle = "#1890ff";
      ctx.globalAlpha = 0.1; // 降低透明度，配合拉满的线条

      const startX = Math.max(rulerSize, rectLeft);
      const endX = rectLeft + widthPx;
      if (endX > rulerSize) {
        ctx.fillRect(startX, 0, endX - startX, rulerSize);
      }

      const startY = Math.max(rulerSize, rectTop);
      const endY = rectTop + heightPx;
      if (endY > rulerSize) {
        ctx.fillRect(0, startY, rulerSize, endY - startY);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
