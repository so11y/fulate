import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer } from "@fulate/core";
import { Select } from "@fulate/tools";
import { EChartsPool, EChartsShape } from "@fulate/echart";

const COLORS = [
  "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
  "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#5b8ff9",
];

const CHART_TYPES = ["bar", "line", "pie", "scatter", "radar"] as const;

// 定义每个图表的数据点数量
const DATA_COUNT = 50;
const LABELS = Array.from({ length: DATA_COUNT }, (_, i) => `节点${i + 1}`);

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
    // 动画时长改为200ms，防止每秒更新5次时动画堆积导致的卡顿
    animationDuration: 200,
    animationDurationUpdate: 200, 
  };

  if (type === "bar") {
    return {
      ...base,
      xAxis: { type: "category", data: LABELS },
      yAxis: { type: "value" },
      series: [
        { type: "bar", data: randArray(DATA_COUNT, 150, 120), itemStyle: { color: c1, borderRadius: 3 } },
        { type: "bar", data: randArray(DATA_COUNT, 80, 60), itemStyle: { color: c2, borderRadius: 3 } },
      ],
    };
  }

  if (type === "line") {
    return {
      ...base,
      xAxis: { type: "category", data: LABELS },
      yAxis: { type: "value" },
      series: [
        // 数据点变多，适当调小 symbolSize 避免太拥挤
        { type: "line", data: randArray(DATA_COUNT, 60, 50), smooth: true, symbolSize: 3, itemStyle: { color: c1 }, lineStyle: { width: 2 } },
        { type: "line", data: randArray(DATA_COUNT, 40, 30), smooth: true, symbolSize: 3, itemStyle: { color: c2 }, lineStyle: { width: 2 } },
      ],
    };
  }

  if (type === "pie") {
    return {
      ...base,
      series: [{
        type: "pie",
        radius: ["25%", "55%"],
        center: ["50%", "58%"],
        data: LABELS.map((name) => ({ value: rand(500, 400), name })),
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
        symbolSize: 6,
        data: Array.from({ length: DATA_COUNT }, () => [rand(50, 80), rand(50, 80)]),
        itemStyle: { color: c1 },
      }],
    };
  }

  // radar
  const indicators = LABELS.map((name) => ({ name, max: 100 }));
  return {
    ...base,
    radar: { indicator: indicators, center: ["50%", "58%"], radius: "55%" },
    series: [{
      type: "radar",
      data: [
        { value: randArray(DATA_COUNT, 70, 40), name: "A", areaStyle: { color: c1, opacity: 0.3 } },
        { value: randArray(DATA_COUNT, 50, 30), name: "B", areaStyle: { color: c2, opacity: 0.3 } },
      ],
    }],
  };
}

function makeUpdateOption(index: number) {
  const type = CHART_TYPES[index % CHART_TYPES.length];

  if (type === "bar") {
    return { series: [{ data: randArray(DATA_COUNT, 150, 120) }, { data: randArray(DATA_COUNT, 80, 60) }] };
  }
  if (type === "line") {
    return { series: [{ data: randArray(DATA_COUNT, 60, 50) }, { data: randArray(DATA_COUNT, 40, 30) }] };
  }
  if (type === "pie") {
    return { series: [{ data: LABELS.map((name) => ({ value: rand(500, 400), name })) }] };
  }
  if (type === "scatter") {
    return { series: [{ data: Array.from({ length: DATA_COUNT }, () => [rand(50, 80), rand(50, 80)]) }] };
  }
  // radar
  return { series: [{ data: [{ value: randArray(DATA_COUNT, 70, 40) }, { value: randArray(DATA_COUNT, 50, 30) }] }] };
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

    // 80个图表，将列数微调至8列以使得整体布局更紧凑方正 (8*10)
    const COLS = 8;
    const CHART_W = 300;
    const CHART_H = 220;
    const GAP = 16;
    const COUNT = 80;

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

    // 更新频率修改为 200ms 一次（每秒 5 次）
    const timer = setInterval(() => {
      for (let i = 0; i < charts.length; i++) {
        charts[i].setOption(makeUpdateOption(i));
      }
    }, 200);

    return () => {
      clearInterval(timer);
      pool.dispose();
      root.unmounted();
    };
  },
});