import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Rectangle, Circle, Triangle, Text, Image } from "@fulate/ui";
import { EChartsPool, EChartsShape } from "@fulate/echart";

registerDemo("basic", {
  title: "基础图形",
  group: "基础",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const pool = new EChartsPool({
      echartsUrl: "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js",
      size: 1,
    });

    const chart = new EChartsShape({
      pool,
      left: 60,
      top: 400,
      width: 500,
      height: 320,
      radius: 12,
      shadow: { color: "rgba(0,0,0,0.12)", blur: 14, offsetY: 4 },
      echarts: {
        option: {
          backgroundColor: "#fff",
          title: { text: "实时数据", left: "center", top: 8, textStyle: { fontSize: 14 } },
          tooltip: { trigger: "axis", renderMode: "richText" },
          legend: { data: ["访问量", "转化率"], top: 32 },
          xAxis: {
            type: "category",
            data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          },
          yAxis: { type: "value" },
          series: [
            {
              name: "访问量",
              type: "bar",
              data: [120, 200, 150, 80, 70, 110, 160],
              itemStyle: { color: "#5470c6", borderRadius: 4 },
            },
            {
              name: "转化率",
              type: "line",
              data: [30, 50, 40, 20, 35, 45, 55],
              smooth: true,
              symbolSize: 8,
              itemStyle: { color: "#ee6666" },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
    });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [
        new Rectangle({
          left: 60,
          top: 60,
          width: 120,
          height: 120,
          backgroundColor: "#e74c3c",
          radius: 8
        }),
        new Circle({
          left: 240,
          top: 60,
          width: 120,
          height: 120,
          backgroundColor: "#2ecc71"
        }),
        new Triangle({
          left: 420,
          top: 60,
          width: 120,
          height: 120,
          backgroundColor: "#f39c12"
        }),
        new Text({
          left: 60,
          top: 240,
          width: 200,
          height: 50,
          text: "Hello Fulate!",
          textAlign: "left",
          verticalAlign: "middle",
          backgroundColor: "red",
          color: "#fff",
          editable: true,
          wordWrap: false
        }),
        new Image({
          left: 320,
          top: 240,
          width: 120,
          height: 120,
          src: "https://picsum.photos/200/200",
          radius: 12
        }),
        chart,
      ]
    });

    root.append(layer);
    root.mount();

    const rand = (base: number, range: number) =>
      Math.round(base + (Math.random() - 0.5) * range);

    const timer = setInterval(() => {
      chart.setOption({
        series: [
          { data: Array.from({ length: 7 }, () => rand(130, 120)) },
          { data: Array.from({ length: 7 }, () => rand(40, 30)) },
        ],
      });
    }, 2500);

    return () => {
      clearInterval(timer);
      pool.dispose();
      root.unmounted();
    };
  }
});
