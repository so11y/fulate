import { withYoga, YogaOption } from "./base";
import { Root as BaseRoot } from "../lib/root";

export class Root extends withYoga<
  new (html: HTMLElement, options: YogaOption) => BaseRoot
>(BaseRoot as any) {
  layout() {
    super.layout();
    this.yogaNode.calculateLayout(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.computedLayout();
    return this;
  }

  mounteded() {
    console.log("---");

    super.mounteded();
    this.layout();
  }
}
