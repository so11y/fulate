import { Constraint, Size } from "./utils/constraint";
import { Element, ElementOptions, Point } from "./base";
import { TypeFn } from "./types";
import { CalcAABB } from "./utils/calc";
import { AlignItems, JustifyContent } from "./types/flex";
import { linkEl } from "./utils/helper";
import {
  // applyJustifyContent,
  calcAlignItems,
  calcFlexRowLayout,
  calcJustifyContent,
  calcOutlieSize
} from "./utils/flex";
// import { linkEl } from "./utils/helper";

export interface RowOptions extends ElementOptions {
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
}

export class Row extends Element {
  type = "row";
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  flexWrap?: "wrap" | "nowrap" = "nowrap";
  constructor(options: RowOptions = {}) {
    super(options);
    this.justifyContent = options.justifyContent ?? "flex-start";
    this.alignItems = options.alignItems ?? "flex-start";
    this.flexWrap = options.flexWrap ?? "nowrap";
  }

  layout(constraint: Constraint) {
    this.dirtyCache(() => {
      const selfConstraint = constraint.extend(this);
      let childConstraint = selfConstraint.getChildConstraint(this);

      const elements = this.children;
      const rows: Array<{
        constraint: Constraint;
        elements: Array<Element>;
        preHeight?: number;
      }> = [];

      let totalHeight = 0;
      if (elements?.length) {
        let currentRow: Element[] = [];
        let _totalHeight = 0;
        let _totalWidth = 0;
        let rowWidth = 0;
        let rowHeight = 0;

        for (const element of elements) {
          // linkEl(element, this);

          // 计算元素需要的宽度
          let elementWidth = element.flexBasis ?? element.width ?? 0;

          // 检查是否需要换行（当启用换行且当前行放不下时）
          if (
            this.flexWrap === "wrap" &&
            rowWidth + elementWidth > childConstraint.maxWidth
          ) {
            _totalWidth += rowWidth;
            _totalHeight += rowHeight;

            // 创建新行的约束（减去已使用的高度）
            childConstraint = selfConstraint
              .subVertical(_totalHeight)
              .subHorizontal(_totalWidth);
            // 保存当前行
            rows.push({
              constraint: childConstraint.clone(),
              elements: currentRow
            });
            // 重置行状态
            currentRow = [];
            rowWidth = 0;
            rowHeight = 0;
          }

          // 布局非弹性元素
          if (!element.flexBasis && !element.flexGrow) {
            const size = element.layout(childConstraint, true);
            elementWidth = size.width;
          }

          // 更新行状态
          currentRow.push(element);
          rowWidth += elementWidth;
          rowHeight = Math.max(rowHeight, element.size?.height ?? 0);
        }

        // 添加最后一行
        if (currentRow.length > 0) {
          rows.push({
            constraint: selfConstraint
              .subVertical(_totalHeight)
              .subHorizontal(rowWidth),
            elements: currentRow
          });
        }

        for (let index = 0; index < rows.length; index++) {
          let maxRowHeight = 0;
          let { elements, constraint } = rows[index];

          calcFlexRowLayout(constraint, elements);

          const { rowOutlineWidth, rowOutlineHeight } =
            calcOutlieSize(elements);

          const remainWidth =
            selfConstraint.maxWidth -
            Math.min(rowOutlineWidth, selfConstraint.maxWidth);

          maxRowHeight = Math.max(maxRowHeight, rowOutlineHeight);

          calcJustifyContent(elements, remainWidth, this.justifyContent!);

          rows[index].preHeight = totalHeight;
          totalHeight += maxRowHeight;
        }

        this.size = selfConstraint.compareSize(
          {
            height: this.height ?? totalHeight
          },
          this
        );

        for (let index = 0; index < rows.length; index++) {
          let { elements } = rows[index];
          const remainHeight =
            this.size.height - Math.min(totalHeight, this.size.height);

          calcAlignItems(this, elements, {
            remainSpace: remainHeight,
            preSpace: rows[index].preHeight!
          });
        }
      } else {
        this.size = selfConstraint.compareSize(this, this);
      }
    });

    return CalcAABB(this);
  }
}

export const row: TypeFn<RowOptions, Row> = (option) => {
  return new Row(option);
};

row.hFull = function (options: RowOptions) {
  const g = row(options);
  g.height = Number.MAX_VALUE;
  return g;
};
