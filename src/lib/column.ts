import { Constraint, Size } from "./utils/constraint";
import { element, Element, ElementOptions, Point } from "./base";
import { TypeFn } from "./types";
import { CalcAABB } from "./utils/calc";
import { AlignItems, JustifyContent } from "./types/flex";
import { linkEl } from "./utils/helper";
import {
  calcAlignItems,
  calcFlexColLayout,
  calcFlexRowLayout,
  calcJustifyContent,
  calcOutlieSize
} from "./utils/flex";
// import { linkEl } from "./utils/helper";

export interface ColumnOptions extends ElementOptions {
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
}

export class Column extends Element {
  type = "row";
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  constructor(options: ColumnOptions = {}) {
    super(options);
    this.justifyContent = options.justifyContent ?? "flex-start";
    this.alignItems = options.alignItems ?? "flex-start";
  }

  layout(constraint: Constraint) {
    this.dirtyCache(() => {
      const selfConstraint = constraint.extend(this);
      let childConstraint = selfConstraint.getChildConstraint(this);

      const elements = this.children;

      if (elements?.length) {
        let cols: Element[] = [];

        for (const element of elements) {
          linkEl(element, this);
          // 计算元素需要的高度
          let elementHeight = element.flexBasis ?? element.height ?? 0;

          // 布局非弹性元素
          if (!element.flexBasis && !element.flexGrow) {
            const size = element.layout(childConstraint, true);
            elementHeight = size.height;
          }

          childConstraint = childConstraint.subVertical(elementHeight);

          cols.push(element);
        }

        calcFlexColLayout(childConstraint, elements);

        const { totalHeight } = calcOutlieSize(elements);

        this.size = selfConstraint.compareSize(
          {
            height: this.height ?? totalHeight
          },
          this
        );

        const remainHeight =
          this.size.height - Math.min(totalHeight, this.size.height);

        calcJustifyContent(elements, remainHeight, this.justifyContent!, true);

        elements.forEach((element) => {
          calcAlignItems(this, [element], {
            isColumn: true,
            preSpace: 0,
            remainSpace: this.size.width - element.size.width
          });
        });
      }
    });
    return CalcAABB(this);
  }
}

export const column: TypeFn<ColumnOptions, Column> = (option) => {
  return new Column(option);
};

column.hFull = function (options: ColumnOptions) {
  const g = column(options);
  g.height = Number.MAX_VALUE;
  return g;
};
