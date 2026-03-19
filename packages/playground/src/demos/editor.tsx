import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer, Artboard } from "@fulate/core";
import {
  Rectangle,
  Circle,
  Triangle,
  Text,
  Workspace,
  Pinned
} from "@fulate/ui";
import { Select, Snap, Rule, LineTool, setVueShapeBridge } from "@fulate/tools";
import { EChartsPool, EChartsShape } from "@fulate/echart";
import { fromVueToFulate, getVueComponent, useVueShapeSize } from "@fulate/vue";
import { defineComponent, ref } from "@vue/runtime-core";
import { Display, FlexDirection, Align } from "@fulate/yoga";
import { FButton, FSelect, MD3 } from "@fulate/components";
import type { SelectOption } from "@fulate/components";

setVueShapeBridge(fromVueToFulate, getVueComponent);

const FormPanel = defineComponent({
  name: "FormPanel",
  props: {
    title: { type: String, default: "Form" }
  },
  setup(props) {
    const size = useVueShapeSize();
    const selected = ref("");
    const options: SelectOption[] = [
      { label: "Rectangle", value: "rect" },
      { label: "Circle", value: "circle" },
      { label: "Triangle", value: "triangle" }
    ];

    return () => (
      <f-div
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        gap={16}
        padding={20}
        backgroundColor={MD3.surface}
        radius={12}
        borderColor={MD3.outlineVariant}
        borderWidth={0.5}
        borderPosition="inside"
      >
        <f-text
          text={props.title}
          fontSize={16}
          fontWeight={600}
          fontFamily={MD3.fontFamily}
          color={MD3.onSurface}
          height={24}
          verticalAlign="middle"
        />

        <FSelect
          modelValue={selected.value}
          label="Shape Type"
          options={options}
          width={size.width - 40}
          onUpdate:modelValue={(v: string) => {
            selected.value = v;
          }}
        />

        <f-div
          display={Display.Flex}
          flexDirection={FlexDirection.Row}
          gap={10}
          alignItems={Align.Center}
        >
          <FButton
            label="Add"
            variant="filled"
          />
          <FButton
            label="Reset"
            variant="outlined"
          />
          <FButton
            label="Cancel"
            variant="text"
          />
        </f-div>
      </f-div>
    );
  }
});

registerDemo("editor", {
  title: "完整编辑器",
  group: "编辑器",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const overlayLayer = new Layer({ zIndex: 100, enableDirtyRect: true });
    (root as any)._overlay = overlayLayer;

    const artboard = new Artboard({
      children: [
        new Rectangle({
          left: 100,
          top: 100,
          width: 200,
          height: 150,
          backgroundColor: "#3498db",
          radius: 8,
          children: [
            new Pinned({
              target: (e) => e.parent!,
              isPin: true,
              anchorX: 1,
              anchorY: 0,
              pivotX: 0.5,
              pivotY: 1,
              left: 0,
              top: -8,
              width: 60,
              height: 28,
              backgroundColor: "#e74c3c",
              radius: 6,
              children: [
                new Text({
                  left: 0,
                  top: 0,
                  width: 60,
                  height: 28,
                  text: "📌 Pin",
                  color: "#fff",
                  fontSize: 12,
                  textAlign: "center",
                  verticalAlign: "middle",
                  silent: true,
                  pickable: false
                })
              ]
            }) as any
          ]
        }),
        new Circle({
          left: 400,
          top: 120,
          width: 120,
          height: 120,
          backgroundColor: "#e74c3c"
        }),
        new Triangle({
          left: 250,
          top: 320,
          width: 140,
          height: 120,
          backgroundColor: "#2ecc71"
        }),
        new Text({
          left: 150,
          top: 480,
          width: 300,
          height: 50,
          text: "Fulate Editor",
          textAlign: "center",
          verticalAlign: "middle",
          backgroundColor: "#f39c12",
          color: "#fff"
        }),
        new Rectangle({
          left: 500,
          top: 300,
          width: 160,
          height: 100,
          backgroundColor: "#9b59b6",
          radius: 12,
          children: [
            new Circle({
              left: 20,
              top: 20,
              width: 30,
              height: 30,
              backgroundColor: "rgba(255,255,255,0.4)"
            }),
            new Circle({
              left: 60,
              top: 20,
              width: 30,
              height: 30,
              backgroundColor: "rgba(255,255,255,0.4)"
            }),
            new Pinned({
              target: (e) => e.parent!,
              isPin: false,
              anchorX: 0,
              anchorY: 0,
              pivotX: 0.5,
              pivotY: 1,
              inheritRotation: true,
              inheritScale: false,
              inheritSkew: false,
              left: 0,
              top: -8,
              width: 50,
              height: 24,
              backgroundColor: "#1abc9c",
              radius: 5,
              children: [
                new Text({
                  left: 0,
                  top: 0,
                  width: 50,
                  height: 24,
                  text: "🔄",
                  color: "#fff",
                  fontSize: 11,
                  textAlign: "center",
                  verticalAlign: "middle",
                  silent: true,
                  pickable: false
                })
              ]
            }) as any
          ]
        }),
        fromVueToFulate(FormPanel, {
          title: "Shape Controls",
          left: 600,
          top: 100,
          width: 300,
          height: 250
        }),
        fromVueToFulate(FButton, {
          label: "f-button",
          left: 120,
          top: 260,
          width: 130,
          height: 40
        })
      ]
    });

    const echartsPool = new EChartsPool({
      echartsUrl:
        "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js",
      size: 2
    });

    const barChart = new EChartsShape({
      pool: echartsPool,
      left: 100,
      top: 580,
      width: 380,
      height: 280,
      radius: 10,
      shadow: { color: "rgba(0,0,0,0.1)", blur: 12, offsetY: 3 },
      echarts: {
        option: {
          backgroundColor: "#fff",
          title: {
            text: "月度销量",
            left: "center",
            top: 8,
            textStyle: { fontSize: 14 }
          },
          tooltip: { trigger: "axis", renderMode: "richText" },
          legend: { data: ["销量", "利润"], top: 30 },
          xAxis: {
            type: "category",
            data: ["1月", "2月", "3月", "4月", "5月", "6月"]
          },
          yAxis: { type: "value" },
          series: [
            {
              name: "销量",
              type: "bar",
              data: [120, 200, 150, 80, 70, 110],
              itemStyle: { color: "#5470c6", borderRadius: 3 }
            },
            {
              name: "利润",
              type: "bar",
              data: [60, 120, 90, 40, 50, 80],
              itemStyle: { color: "#91cc75", borderRadius: 3 }
            }
          ]
        }
      }
    });

    const lineChart = new EChartsShape({
      pool: echartsPool,
      left: 520,
      top: 580,
      width: 380,
      height: 280,
      radius: 10,
      shadow: { color: "rgba(0,0,0,0.1)", blur: 12, offsetY: 3 },
      echarts: {
        option: {
          backgroundColor: "#fff",
          title: {
            text: "趋势分析",
            left: "center",
            top: 8,
            textStyle: { fontSize: 14 }
          },
          tooltip: { trigger: "axis", renderMode: "richText" },
          legend: { data: ["温度", "湿度"], top: 30 },
          xAxis: {
            type: "category",
            data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          },
          yAxis: { type: "value" },
          series: [
            {
              name: "温度",
              type: "line",
              data: [23, 25, 28, 26, 22, 20, 24],
              smooth: true,
              symbolSize: 6,
              itemStyle: { color: "#ee6666" },
              lineStyle: { width: 2 }
            },
            {
              name: "湿度",
              type: "line",
              data: [65, 60, 55, 70, 75, 80, 68],
              smooth: true,
              symbolSize: 6,
              itemStyle: { color: "#73c0de" },
              lineStyle: { width: 2 }
            }
          ]
        }
      }
    });

    artboard.append(barChart as any, lineChart as any);

    const rand = (base: number, range: number) =>
      Math.round(base + (Math.random() - 0.5) * range);
    const echartsTimer = setInterval(() => {
      barChart.setOption({
        series: [
          { data: Array.from({ length: 6 }, () => rand(130, 120)) },
          { data: Array.from({ length: 6 }, () => rand(70, 80)) }
        ]
      });
      lineChart.setOption({
        series: [
          { data: Array.from({ length: 7 }, () => rand(24, 12)) },
          { data: Array.from({ length: 7 }, () => rand(65, 30)) }
        ]
      });
    }, 1500);

    const workspace = new Workspace({
      width: 1920,
      height: 1080,
      children: [artboard]
    });

    const contentLayer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [workspace]
    });

    const editerLayer = new EditerLayer({
      zIndex: 2,
      children: [new Select(), new Snap(), new Rule(), new LineTool()]
    });

    root.append(contentLayer, editerLayer, overlayLayer);
    root.mount();

    //@ts-ignore
    window.fulateRoot = root;
    return () => {
      clearInterval(echartsTimer);
      echartsPool.dispose();
      root.unmounted();
    };
  }
});
