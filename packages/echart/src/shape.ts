import { Shape, ShapeOption } from "@fulate/core";
import { Point, FulateEvent } from "@fulate/util";
// import { debounce } from "lodash-es";
import { EChartsPool } from "./pool";

export interface EChartsInitOpts {
  theme?: string | object;
  option: any;
  notMerge?: boolean;
  lazyUpdate?: boolean;
}

export interface EChartsShapeOption extends ShapeOption<EChartsShape> {
  pool: EChartsPool;
  echarts: EChartsInitOpts;
}

let idCounter = 0;

export class EChartsShape extends Shape {
  type = "echarts";

  private _pool: EChartsPool;
  private _chartId: string;
  private _echartsOpts: EChartsInitOpts;
  private _bitmap: ImageBitmap | null = null;
  private _cleanups: Array<() => void> = [];

  constructor(options: EChartsShapeOption) {
    const { pool, echarts: echartsOpts, ...shapeOpts } = options;
    super(shapeOpts as ShapeOption);
    this._pool = pool;
    this._echartsOpts = echartsOpts;
    this._chartId = `echart_${idCounter++}`;
  }

  setOption(option: any, notMerge?: boolean, lazyUpdate?: boolean) {
    this._pool.update(this._chartId, option, notMerge, lazyUpdate);
  }

  resizeChart() {
    this._pool.resize(this._chartId, this.width!, this.height!, this.root.dpr);
  }

  // private _debouncedResize = () => this.resizeChart(); // debounce(() => this.resizeChart(), 30);

  setOptions(options?: any, syncCalc = false) {
    const result = super.setOptions(options, syncCalc);
    if (
      this.isActiveed &&
      (options?.width !== undefined || options?.height !== undefined)
    ) {
      this.resizeChart();
      // this._debouncedResize();
    }
    return result;
  }

  quickSetOptions(options: any) {
    const result = super.quickSetOptions(options);
    if (
      this.isActiveed &&
      (options.width !== undefined || options.height !== undefined)
    ) {
      this.resizeChart();
      // this._debouncedResize();
    }
    return result;
  }

  mounted() {
    this._pool.create(
      this._chartId,
      this.width!,
      this.height!,
      this.root.dpr,
      this._echartsOpts,
      (bitmap) => this._onFrame(bitmap)
    );
    this._bindEvents();
    super.mounted();
  }

  deactivate() {
    // this._debouncedResize.cancel();
    this._bitmap?.close();
    this._bitmap = null;
    this._cleanups.forEach((fn) => fn());
    this._cleanups = [];
    this._pool.destroy(this._chartId);
    super.deactivate();
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    if (!this._bitmap) return;
    if (this.radius) {
      this.buildPath(ctx);
      ctx.clip();
    }
    ctx.drawImage(this._bitmap, 0, 0, this.width!, this.height!);
  }

  private _onFrame(bitmap: ImageBitmap) {
    this._bitmap?.close();
    this._bitmap = bitmap;
    this.markPaintDirty();
  }

  private _toLocal(e: FulateEvent): Point {
    return this.getGlobalToLocal(new Point(e.detail.x, e.detail.y));
  }

  private _forwardEvent(eventName: string) {
    return (e: FulateEvent) => {
      const local = this._toLocal(e);
      this._pool.event(this._chartId, eventName, local.x, local.y);
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
      this._pool.event(this._chartId, "mouseout", -1000, -1000);
    });
  }

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    json.echarts = this._echartsOpts;
    return json;
  }
}
