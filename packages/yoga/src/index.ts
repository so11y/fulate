export { Div, withYoga } from "./div";
export type { YogaOption } from "./div";
export { Span } from "./span";
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
import { Span } from "./span";

registerElement("f-div", Div);
registerElement("f-span", Span);
