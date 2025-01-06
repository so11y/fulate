import { Element, ElementOptions } from "./base";

interface ExpandedOptions
  extends Omit<ElementOptions, "children" | "x" | "y" | "width" | "height"> {
  flex?: number;
  child: Element;
}

export class Expanded extends Element implements ExpandedOptions {
  type = "expanded";
  flex: number;
  child: Element;

  constructor(options: ExpandedOptions) {
    super({
      ...options,
      width: Number.MAX_VALUE,
      height: Number.MAX_VALUE,
      children: [options.child]
    });
    this.flex = options.flex ?? 1;
  }

  getWordPoint() {
    //如果首次cache不存在
    //那么他的兄弟节点如果要获取他的坐标和宽高就不行
    //因为他需要获取他的兄弟节点的全部坐标，然后他的兄弟节点又要算他的宽高和坐标就会死循环
    //所以首次的时候不计算
    // if (!this._cache.wordRect) {
    //   return super._getWordRect()
    // }
    const rect = super.getWordPoint();
    //这里还需要计算如果有其他Expanded和垂直的计算
    const siblings = this.getSiblings()!;
    const parentRect = this.parent!.getWordPoint(true);
    if (siblings?.length === 0) {
      return parentRect;
    }
    const totalWidth = siblings
      .map((v) => v.getTotalRect())
      .reduce((prev, next) => prev + next.width, 0);
    return {
      ...(rect as any),
      width: Math.max(parentRect.width - totalWidth, 0),
      height: parentRect.height
    };
  }
}
