import { Column, ColumnOptions } from "./column";
import { Row, RowOptions } from "./row";
import { Element } from "./base"

export type GroupOptions = ColumnOptions | RowOptions;

interface GroupType {
  (options: GroupOptions): Element;
  hFull(options: GroupOptions): Element;
}

export const group: GroupType = (options: GroupOptions) => {
  if (
    options.flexWrap == "wrap" ||
    options.flexDirection === "column"
  ) {
    return new Column(options as any);
  }
  return new Row(options as any);
}

group.hFull = function (options: GroupOptions) {
  const g = group(options)
  g.height = Number.MAX_VALUE
  return g
}