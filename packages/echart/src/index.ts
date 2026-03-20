export { EChartsPool } from "./pool";
export type { EChartsPoolOptions, FrameCallback } from "./pool";
export { EChartsShape } from "./shape";
export type { EChartsShapeOption, EChartsInitOpts } from "./shape";

import { registerClipboardPlugin } from "@fulate/tools";
import { EChartsShape } from "./shape";

registerClipboardPlugin("echarts", (data) => {
  const { type: _, children: __, echarts: echartsOpts, ...shapeProps } = data;
  delete shapeProps.key;
  return new EChartsShape({ ...shapeProps, echarts: echartsOpts });
});
