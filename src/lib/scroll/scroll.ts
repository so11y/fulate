import { group } from "../group";
import { Element, ElementOptions } from "../base";
import { Constraint, Size } from "../utils/constraint";
import { ScrollBar } from "./scrollBar";
import { linkEl } from "../utils/helper";

interface ScrollOptions extends Omit<ElementOptions, "child"> {
  overflowY?: "scroll" | "none";
  overflowX?: "scroll" | "none";
}
//TODO 后面把滚动条单独到一个离屏canvas里
export class Scroll extends Element {
  type = "scroll";
  overflowY: ScrollOptions["overflowY"];
  overflowX: ScrollOptions["overflowX"];
  private scrollBarCol: Element;
  private scrollBody: Element;
  scrollHeight = 0;
  scrollWidth = 0;
  scrollTop = 0;
  scrollLeft = 0;

  provideLocalCtx(reset?: boolean) {
    const v = super.provideLocalCtx(reset);
    v.scrollEl = this;
    return v;
  }

  constructor(options: ScrollOptions) {
    super(options);
    this.scrollBarCol = new ScrollBar({
      width: 8,
      height: 0,
      radius: 2,
      backgroundColor: "rgba(0,0,0,0.2)",
      direction: "vertical",
      onScroll: (x) => {
        this.scrollTop = x.y;
        this.scrollBody.setOption({
          y: x.y
        });
        this.layer.render();
      }
    });
    this.scrollBody = group({
      flexDirection: "column",
      children: options.children
    });
    this.scrollBody.isInternal = true;
    this.children = [this.scrollBody, this.scrollBarCol];
    this.overflow = "hidden";
    this.overflowY = options.overflowY ?? "scroll";
    this.overflowX = options.overflowX ?? "none";
  }

  layout(constraint: Constraint): Size {
    const selfConstraint = constraint.extend(this);
    const childConstraint = selfConstraint.getChildConstraint(this);
    if (this.overflowY === "scroll") {
      childConstraint.maxHeight = Number.MAX_VALUE;
    }
    linkEl(this.scrollBody, this)
    linkEl(this.scrollBarCol, this)
    const bodySize = this.scrollBody.layout(childConstraint);
    this.size = selfConstraint.compareSize(
      {
        width: this.width ?? bodySize.width,
        height: this.height ?? bodySize.height
      },
      this
    );
    if (this.overflowY === "scroll") {
      if (bodySize.height > this.size.height) {
        this.scrollBarCol.setOption({
          x: this.size.width - this.scrollBarCol.width! - 2, //2是右边的间距
          height: (this.size.height / bodySize.height) * this.size.height
        });
        this.scrollHeight = bodySize.height;
      } else {
        this.scrollBarCol.setOption({
          height: 0
        });
      }
      this.scrollBarCol.layout(childConstraint);
    }
    this.scrollWidth = Math.max(bodySize.width, this.size.width);
    this.scrollHeight = Math.max(bodySize.height, this.size.height);
    return this.size;
  }
}

export function scroll(options: ScrollOptions) {
  return new Scroll(options);
}
