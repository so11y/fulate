import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer } from "@fulate/core";
import { Select } from "@fulate/tools";
import { EChartsPool, EChartsShape } from "@fulate/echart";

const COLORS = [
  "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
  "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#5b8ff9",
];

const CHART_TYPES = ["bar", "line", "pie", "scatter", "radar"] as const;

function rand(base: number, range: number) {
  return Math.round(base + (Math.random() - 0.5) * range);
}

function randArray(len: number, base: number, range: number) {
  return Array.from({ length: len }, () => rand(base, range));
}

function makeOption(index: number) {
  const type = CHART_TYPES[index % CHART_TYPES.length];
  const c1 = COLORS[index % COLORS.length];
  const c2 = COLORS[(index + 3) % COLORS.length];
  const label = `图表 ${index + 1}`;

  const base: any = {
    backgroundColor: "#fff",
    title: { text: label, left: "center", top: 6, textStyle: { fontSize: 13 } },
    tooltip: { trigger: type === "pie" ? "item" : "axis", renderMode: "richText" },
    animation: true,
    animationDuration: 600,
  };

  if (type === "bar") {
    return {
      ...base,
      xAxis: { type: "category", data: ["A", "B", "C", "D", "E", "F"] },
      yAxis: { type: "value" },
      series: [
        { type: "bar", data: randArray(6, 150, 120), itemStyle: { color: c1, borderRadius: 3 } },
        { type: "bar", data: randArray(6, 80, 60), itemStyle: { color: c2, borderRadius: 3 } },
      ],
    };
  }

  if (type === "line") {
    return {
      ...base,
      xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      yAxis: { type: "value" },
      series: [
        { type: "line", data: randArray(7, 60, 50), smooth: true, symbolSize: 6, itemStyle: { color: c1 }, lineStyle: { width: 2 } },
        { type: "line", data: randArray(7, 40, 30), smooth: true, symbolSize: 6, itemStyle: { color: c2 }, lineStyle: { width: 2 } },
      ],
    };
  }

  if (type === "pie") {
    const names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
    return {
      ...base,
      series: [{
        type: "pie",
        radius: ["25%", "55%"],
        center: ["50%", "58%"],
        data: names.map((name, i) => ({ value: rand(500, 400), name })),
      }],
    };
  }

  if (type === "scatter") {
    return {
      ...base,
      xAxis: { type: "value" },
      yAxis: { type: "value" },
      series: [{
        type: "scatter",
        symbolSize: 10,
        data: Array.from({ length: 20 }, () => [rand(50, 80), rand(50, 80)]),
        itemStyle: { color: c1 },
      }],
    };
  }

  // radar
  const indicators = ["速度", "力量", "防御", "智力", "敏捷"].map((name) => ({ name, max: 100 }));
  return {
    ...base,
    radar: { indicator: indicators, center: ["50%", "58%"], radius: "55%" },
    series: [{
      type: "radar",
      data: [
        { value: randArray(5, 70, 40), name: "A", areaStyle: { color: c1, opacity: 0.3 } },
        { value: randArray(5, 50, 30), name: "B", areaStyle: { color: c2, opacity: 0.3 } },
      ],
    }],
  };
}

function makeUpdateOption(index: number) {
  const type = CHART_TYPES[index % CHART_TYPES.length];

  if (type === "bar") {
    return { series: [{ data: randArray(6, 150, 120) }, { data: randArray(6, 80, 60) }] };
  }
  if (type === "line") {
    return { series: [{ data: randArray(7, 60, 50) }, { data: randArray(7, 40, 30) }] };
  }
  if (type === "pie") {
    const names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
    return { series: [{ data: names.map((name) => ({ value: rand(500, 400), name })) }] };
  }
  if (type === "scatter") {
    return { series: [{ data: Array.from({ length: 20 }, () => [rand(50, 80), rand(50, 80)]) }] };
  }
  // radar
  return { series: [{ data: [{ value: randArray(5, 70, 40) }, { value: randArray(5, 50, 30) }] }] };
}

registerDemo("echart", {
  title: "ECharts (Worker)",
  group: "高级",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const pool = new EChartsPool({
      echartsUrl: "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js",
      size: 2,
    });

    const COLS = 6;
    const CHART_W = 300;
    const CHART_H = 220;
    const GAP = 16;
    const COUNT = 30;

    const charts: EChartsShape[] = [];

    for (let i = 0; i < COUNT; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      const chart = new EChartsShape({
        pool,
        left: GAP + col * (CHART_W + GAP),
        top: GAP + row * (CHART_H + GAP),
        width: CHART_W,
        height: CHART_H,
        radius: 8,
        shadow: { color: "rgba(0,0,0,0.1)", blur: 10, offsetY: 3 },
        echarts: { option: makeOption(i) },
      });

      charts.push(chart);
    }

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: charts,
    });

    const editerLayer = new EditerLayer({
      zIndex: 2,
      children: [new Select()],
    });

    root.append(layer, editerLayer);
    root.mount();

    const timer = setInterval(() => {
      for (let i = 0; i < charts.length; i++) {
        charts[i].setOption(makeUpdateOption(i));
      }
    }, 1500);

    return () => {
      clearInterval(timer);
      pool.dispose();
      root.unmounted();
    };
  },
});
