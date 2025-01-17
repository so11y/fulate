import { Column, ColumnOptions } from "./column";
import { Row, RowOptions } from "./row";
import { Element } from "./base"
import { TypeFn } from "./types";

export type GroupOptions = ColumnOptions | RowOptions;

export const group: TypeFn<GroupOptions, Element> = (option) => {
  if (
    option.flexWrap == "wrap" ||
    option.flexDirection === "column"
  ) {
    return new Column(option as any);
  }
  return new Row(option as any);
};

group.hFull = function (options: GroupOptions) {
  const g = group(options)
  g.height = Number.MAX_VALUE
  return g
}