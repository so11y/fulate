import { Element } from "../base";
import { Size } from "./constraint";

export function CalcMargin(el: Element) {
  return new Size(
    el.size.width + el.margin.left + el.margin.right,
    el.size.height + el.margin.top + el.margin.bottom
  );
}