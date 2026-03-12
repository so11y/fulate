export { Div, withYoga } from "./div";
export type { YogaOption } from "./div";
export {
  Align,
  BoxSizing,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Overflow,
  PositionType,
  Wrap
} from "./div";

import { registerElement } from "@fulate/core";
import { Div } from "./div";

registerElement("f-div", Div);
