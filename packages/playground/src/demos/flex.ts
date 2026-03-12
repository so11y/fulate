import { registerDemo } from "../registry";
import { Root, Layer } from "@fulate/core";
import { Div, Display, Justify, Align, FlexDirection } from "@fulate/yoga";

registerDemo("flex", {
  title: "Flex 布局",
  group: "布局",
  order: 1,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    const row = new Div({
      left: 60,
      top: 60,
      width: 400,
      height: 100,
      display: Display.Flex,
      justifyContent: Justify.SpaceAround,
      alignItems: Align.Center,
      backgroundColor: "#ecf0f1",
      children: [
        new Div({ width: 60, height: 60, backgroundColor: "#e74c3c" }),
        new Div({ width: 60, height: 60, backgroundColor: "#3498db" }),
        new Div({ width: 60, height: 60, backgroundColor: "#2ecc71" }),
      ],
    });

    const column = new Div({
      left: 60,
      top: 200,
      width: 120,
      height: 300,
      display: Display.Flex,
      flexDirection: FlexDirection.Column,
      justifyContent: Justify.SpaceBetween,
      alignItems: Align.Center,
      backgroundColor: "#dfe6e9",
      children: [
        new Div({ width: 80, height: 60, backgroundColor: "#6c5ce7" }),
        new Div({ width: 80, height: 60, backgroundColor: "#00b894" }),
        new Div({ width: 80, height: 60, backgroundColor: "#fdcb6e" }),
      ],
    });

    const flexGrow = new Div({
      left: 240,
      top: 200,
      width: 300,
      height: 80,
      display: Display.Flex,
      backgroundColor: "#b2bec3",
      children: [
        new Div({ width: 60, backgroundColor: "#d63031" }),
        new Div({ flex: 1, backgroundColor: "#0984e3" }),
        new Div({ width: 60, backgroundColor: "#00b894" }),
      ],
    });

    const layer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [row, column, flexGrow],
    });

    root.append(layer);
    root.mount();

    return () => root.unmounted();
  },
});
