export { BaseLine } from "./base";
export type { LineAnchor, LinePointData, LineOption } from "./base";

export { Line } from "./straight";

export {
  DEFAULT_ANCHOR_SCHEMA,
  getElementAnchorPoint,
  getElementAnchorPoints,
  resolveAnchors
} from "@fulate/core";
export type { AnchorPoint, AnchorPointData, AnchorLabelStyle, AnchorSnapContext } from "@fulate/core";
