export {
  getMeasureContext,
  measureStringWidth,
  getCharWidth,
  preCalculateChars,
} from "./text/measure";
export { wrapText } from "./text/layout";
export { Rectangle } from "./rectangle";
export { Circle } from "./circle";
export { Triangle } from "./triangle";
export { Text } from "./text";
export type { TextOption } from "./text";
export { Image } from "./image";
export type { ImageOption } from "./image";
export { Workspace } from "./workspace";
export type { WorkspaceOption } from "./workspace";
export { Pinned } from "./pinned";
export type { PinnedMatrix, PinnedAABB } from "./pinned";
export { Group } from "./group";
export type { GroupOption } from "./group";
export { ScrollView } from "./scrollview";
export type { ScrollViewOption } from "./scrollview";
export { RippleOverlay } from "./ripple";
export type { RippleOption } from "./ripple";
export { AnchorIndicator } from "./anchor-indicator";

// Line
export {
  BaseLine,
  Line,
  DEFAULT_ANCHOR_SCHEMA,
  getElementAnchorPoint,
  getElementAnchorPoints,
  resolveAnchors
} from "./line/index";
export type {
  LineAnchor,
  LinePointData,
  LineOption,
  AnchorPoint,
  AnchorPointData
} from "./line/index";

import { registerElement } from "@fulate/core";
import { Rectangle } from "./rectangle";
import { Circle } from "./circle";
import { Triangle } from "./triangle";
import { Text } from "./text";
import { Image } from "./image";
import { Workspace } from "./workspace";
import { Group } from "./group";
import { ScrollView } from "./scrollview";
import { Line } from "./line/index";
import { RippleOverlay } from "./ripple";
import { Pinned } from "./pinned";
import "./anchor-indicator";

registerElement("f-rectangle", Rectangle);
registerElement("f-circle", Circle);
registerElement("f-triangle", Triangle);
registerElement("f-text", Text);
registerElement("f-image", Image);
registerElement("f-workspace", Workspace);
registerElement("f-group", Group);
registerElement("f-scrollview", ScrollView);
registerElement("f-line", Line);
registerElement("f-ripple", RippleOverlay);
registerElement("f-pinned", Pinned);
