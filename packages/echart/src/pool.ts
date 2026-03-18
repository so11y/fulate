export type FrameCallback = (bitmap: ImageBitmap) => void;

export interface EChartsPoolOptions {
  echartsUrl: string | URL;
  size?: number;
}

interface WorkerChartMessage {
  type: "create" | "event" | "resize" | "update" | "pause" | "resume" | "destroy";
  chartId: string;
  [key: string]: any;
}

export class EChartsPool {
  private workers: Worker[] = [];
  private workerReady: boolean[];
  private pendingQueues: WorkerChartMessage[][];
  private chartToWorker = new Map<string, number>();
  private workerLoad: number[];
  private callbacks = new Map<string, FrameCallback>();

  constructor(options: EChartsPoolOptions) {
    const { echartsUrl, size = 2 } = options;
    this.workerLoad = new Array(size).fill(0);
    this.workerReady = new Array(size).fill(false);
    this.pendingQueues = Array.from({ length: size }, () => []);

    for (let i = 0; i < size; i++) {
      const w = new Worker(
        new URL("./echart-worker.ts", import.meta.url),
        { type: "module" }
      );
      w.onmessage = (e) => {
        if (e.data.type === "ready") {
          this.workerReady[i] = true;
          for (const msg of this.pendingQueues[i]) {
            w.postMessage(msg);
          }
          this.pendingQueues[i] = [];
          return;
        }
        if (e.data.type === "frame") {
          this.callbacks.get(e.data.chartId)?.(e.data.bitmap);
        }
      };
      w.postMessage({ type: "__init__", echartsUrl: String(echartsUrl) });
      this.workers.push(w);
    }
  }

  private pickWorker(): number {
    let min = 0;
    for (let i = 1; i < this.workerLoad.length; i++) {
      if (this.workerLoad[i] < this.workerLoad[min]) min = i;
    }
    return min;
  }

  private send(chartId: string, msg: WorkerChartMessage) {
    const idx = this.chartToWorker.get(chartId);
    if (idx === undefined) return;
    if (!this.workerReady[idx]) {
      this.pendingQueues[idx].push(msg);
    } else {
      this.workers[idx].postMessage(msg);
    }
  }

  create(
    chartId: string,
    width: number,
    height: number,
    dpr: number,
    echartsOpts: {
      theme?: string | object;
      option: any;
      notMerge?: boolean;
      lazyUpdate?: boolean;
    },
    onFrame: FrameCallback
  ) {
    const idx = this.pickWorker();
    this.chartToWorker.set(chartId, idx);
    this.workerLoad[idx]++;
    this.callbacks.set(chartId, onFrame);

    const msg: WorkerChartMessage = {
      type: "create",
      chartId,
      width,
      height,
      dpr,
      theme: echartsOpts.theme,
      option: echartsOpts.option,
      notMerge: echartsOpts.notMerge,
      lazyUpdate: echartsOpts.lazyUpdate,
    };

    if (!this.workerReady[idx]) {
      this.pendingQueues[idx].push(msg);
    } else {
      this.workers[idx].postMessage(msg);
    }
  }

  event(chartId: string, eventName: string, x: number, y: number) {
    this.send(chartId, { type: "event", chartId, eventName, x, y });
  }

  resize(chartId: string, width: number, height: number, dpr: number) {
    this.send(chartId, { type: "resize", chartId, width, height, dpr });
  }

  update(
    chartId: string,
    option: any,
    notMerge?: boolean,
    lazyUpdate?: boolean
  ) {
    this.send(chartId, {
      type: "update",
      chartId,
      option,
      notMerge,
      lazyUpdate,
    });
  }

  pause(chartId: string) {
    this.send(chartId, { type: "pause", chartId });
  }

  resume(chartId: string) {
    this.send(chartId, { type: "resume", chartId });
  }

  destroy(chartId: string) {
    const idx = this.chartToWorker.get(chartId);
    if (idx === undefined) return;
    this.send(chartId, { type: "destroy", chartId });
    this.workerLoad[idx]--;
    this.chartToWorker.delete(chartId);
    this.callbacks.delete(chartId);
  }

  dispose() {
    for (const [chartId] of this.chartToWorker) {
      this.send(chartId, { type: "destroy", chartId });
    }
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.chartToWorker.clear();
    this.callbacks.clear();
    this.workerLoad = [];
    this.workerReady = [];
    this.pendingQueues = [];
  }
}
