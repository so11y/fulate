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

// Line
export {
  BaseLine,
  Line,
  DEFAULT_ANCHOR_SCHEMA,
  getElementAnchorPoint,
  getElementAnchorPoints
} from "./line/index";
export type {
  LineAnchor,
  LinePointData,
  LineOption,
  AnchorPoint
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

registerElement("f-rectangle", Rectangle);
registerElement("f-circle", Circle);
registerElement("f-triangle", Triangle);
registerElement("f-text", Text);
registerElement("f-image", Image);
registerElement("f-workspace", Workspace);
registerElement("f-group", Group);
registerElement("f-scrollview", ScrollView);
registerElement("f-line", Line);
