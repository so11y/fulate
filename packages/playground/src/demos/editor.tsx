import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer, Artboard } from "@fulate/core";
import { Rectangle, Circle, Triangle, Text, Workspace } from "@fulate/ui";
import { Select, Snap, Rule, LineTool, setVueShapeBridge } from "@fulate/tools";
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
        width={size.width}
        height={size.height}
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
          radius: 8
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
            })
          ]
        }),
        fromVueToFulate(FormPanel, {
          title: "Shape Controls",
          left: 600,
          top: 100,
          width: 300,
          height: 250
        })
      ]
    });

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
    return () => root.unmounted();
  }
});
