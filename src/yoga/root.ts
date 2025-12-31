import { Element, YogaOption } from "./base";
import { Root as BaseRoot } from "../lib/root";

export class Root extends Element {
  container: HTMLElement;
  constructor(el: HTMLElement, options: YogaOption) {
    super(options);
    this.container = el;
    this.setOptions(options);
    this.renderNode = new BaseRoot(this.container);
  }

  layoutSyncToRenderNode() {
    this.setStyleToYoga();
    this.yogaNode.calculateLayout(undefined, undefined);
    super.layoutSyncToRenderNode();
  }

  mounted() {
    this.layoutSyncToRenderNode();
    this.renderNode.mounted();
  }
}
