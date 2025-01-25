import { Element } from "../base";

export function linkEl(child: Element, parent: Element) {
  child.parent = parent;
  child.root = parent.root;
}
