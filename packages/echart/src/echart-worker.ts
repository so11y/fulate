declare const echarts: any;

let echartsModule: any;
const charts = new Map<
  string,
  { chart: any; canvas: OffscreenCanvas; dpr: number; paused: boolean }
>();

self.onmessage = async (e: MessageEvent) => {
  const { type, chartId } = e.data;

  if (type === "__init__") {
    const mod = await import(/* @vite-ignore */ e.data.echartsUrl);
    echartsModule = mod.default ?? mod;
    (self as any).postMessage({ type: "ready" });
    return;
  }

  switch (type) {
    case "create": {
      const { width, height, dpr, theme, option, notMerge, lazyUpdate } =
        e.data;
      const canvas = new OffscreenCanvas(width * dpr, height * dpr);
      const chart = echartsModule.init(canvas, theme ?? null, {
        width,
        height,
        devicePixelRatio: dpr,
      });
      chart.setOption(option, notMerge, lazyUpdate);

      const entry = { chart, canvas, dpr, paused: false };
      chart.on("rendered", async () => {
        if (entry.paused) return;
        const bitmap = await createImageBitmap(canvas);
        (self as any).postMessage(
          { type: "frame", chartId, bitmap },
          [bitmap]
        );
      });

      charts.set(chartId, entry);
      break;
    }

    case "update": {
      const entry = charts.get(chartId);
      if (entry)
        entry.chart.setOption(e.data.option, e.data.notMerge, e.data.lazyUpdate);
      break;
    }

    case "event": {
      const entry = charts.get(chartId);
      if (!entry) return;
      const { eventName, x, y } = e.data;
      entry.chart.getZr().handler.dispatch(eventName, {
        zrX: x,
        zrY: y,
        clientX: x,
        clientY: y,
        preventDefault: () => {},
        stopPropagation: () => {},
      });
      break;
    }

    case "resize": {
      const entry = charts.get(chartId);
      if (!entry) return;
      const { width, height, dpr } = e.data;
      entry.dpr = dpr;
      entry.canvas.width = width * dpr;
      entry.canvas.height = height * dpr;
      entry.chart.resize({ width, height, devicePixelRatio: dpr });
      break;
    }

    case "pause": {
      const entry = charts.get(chartId);
      if (entry) entry.paused = true;
      break;
    }

    case "resume": {
      const entry = charts.get(chartId);
      if (entry && entry.paused) {
        entry.paused = false;
        createImageBitmap(entry.canvas).then((bitmap) => {
          (self as any).postMessage(
            { type: "frame", chartId, bitmap },
            [bitmap]
          );
        });
      }
      break;
    }

    case "destroy": {
      const entry = charts.get(chartId);
      if (entry) {
        entry.chart.dispose();
        charts.delete(chartId);
      }
      break;
    }
  }
};
