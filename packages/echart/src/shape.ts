import { ShapeOption } from "@fulate/core";
import { FulateEvent } from "@fulate/core";
import { Point } from "@fulate/util";
import { Image, ImageOption } from "@fulate/ui";
import { EChartsPool } from "./pool";

export interface EChartsInitOpts {
  theme?: string | object;
  option: any;
  notMerge?: boolean;
  lazyUpdate?: boolean;
}

export interface EChartsShapeOption extends ImageOption<EChartsShape> {
  pool?: EChartsPool;
  echarts: EChartsInitOpts;
}

let idCounter = 0;

export class EChartsShape extends Image {
  type = "echarts";

  private _pool: EChartsPool | null = null;
  private _chartId: string;
  private _echartsOpts: EChartsInitOpts;
  private _paused = false;
  private _cleanups: Array<() => void> = [];

  constructor(options: EChartsShapeOption) {
    const { pool, echarts: echartsOpts, ...imageOpts } = options;
    super(imageOpts as ImageOption);
    this._pool = pool ?? null;
    this._echartsOpts = echartsOpts;
    this._chartId = `echart_${idCounter++}`;
  }

  setOption(option: any, notMerge?: boolean, lazyUpdate?: boolean) {
    this._pool?.update(this._chartId, option, notMerge, lazyUpdate);
  }

  resizeChart() {
    this._pool?.resize(this._chartId, this.width!, this.height!, this.root.viewport.dpr);
  }

  setOptions(options?: any, syncCalc = false) {
    const result = super.setOptions(options, syncCalc);
    if (
      this.isActiveed &&
      (options?.width !== undefined || options?.height !== undefined)
    ) {
      this.resizeChart();
    }
    return result;
  }

  mounted() {
    super.mounted();
    if (!this._pool) {
      this._pool = this.inject<EChartsPool>("echartsPool") ?? null;
    }
  }

  activate() {
    super.activate();
    this._startChart();
  }

  deactivate() {
    this._stopChart();
    super.deactivate();
  }

  unmounted() {
    this._stopChart();
    super.unmounted();
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    if (!this._renderImage) return;
    if (this.radius) {
      ctx.save();
      this.buildPath(ctx);
      ctx.clip();
    }
    ctx.drawImage(this._renderImage, 0, 0, this.width!, this.height!);
    if (this.radius) {
      ctx.restore();
    }
  }

  hasInView() {
    const inView = super.hasInView();
    if (this._pool && this.isActiveed && inView !== !this._paused) {
      this._paused = !inView;
      if (this._paused) {
        this._pool.pause(this._chartId);
      } else {
        this._pool.resume(this._chartId);
      }
    }
    return inView;
  }

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    json.echarts = this._echartsOpts;
    return json;
  }

  // ===================== 内部方法 =====================

  private _startChart() {
    if (!this._pool) {
      console.warn("[EChartsShape] No pool available, chart will not render.");
      return;
    }
    this._pool.create(
      this._chartId,
      this.width!,
      this.height!,
      this.root.viewport.dpr,
      this._echartsOpts,
      (bitmap) => this._onFrame(bitmap)
    );
    this._bindEvents();
  }

  private _stopChart() {
    this._pool?.destroy(this._chartId);
    this._releaseRenderImage();
    this._cleanups.forEach((fn) => fn());
    this._cleanups = [];
  }

  private _onFrame(bitmap: ImageBitmap) {
    this._releaseRenderImage();
    this._renderImage = bitmap;
    this.markPaintDirty();
  }

  private _toLocal(e: FulateEvent): Point {
    return this.getGlobalToLocal(new Point(e.detail.x, e.detail.y));
  }

  private _forwardEvent(eventName: string) {
    return (e: FulateEvent) => {
      const local = this._toLocal(e);
      this._pool?.event(this._chartId, eventName, local.x, local.y);
    };
  }

  private _bindEvents() {
    const bindAndTrack = (name: string, handler: (e: FulateEvent) => void) => {
      const off = this.addEventListener(name, handler as any);
      this._cleanups.push(off);
    };

    bindAndTrack("click", this._forwardEvent("click"));
    bindAndTrack("pointermove", this._forwardEvent("mousemove"));
    bindAndTrack("pointerdown", this._forwardEvent("mousedown"));
    bindAndTrack("pointerup", this._forwardEvent("mouseup"));
    bindAndTrack("mouseleave", () => {
      this._pool?.event(this._chartId, "mouseout", -1000, -1000);
    });
  }
}
