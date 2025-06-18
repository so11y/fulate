import { Element } from "../base";
import { Column } from "../column";
import { Row } from "../row";
import { JustifyContent } from "../types/flex";
import { Constraint } from "./constraint";

export function calcJustifyContent(
  elements: Element[],
  remainSpace: number,
  justifyContent: JustifyContent,
  isColumn: boolean = false
) {
  if (elements.length === 0) return;

  const axis = isColumn ? "y" : "x";
  const sizeProperty = isColumn ? "height" : "width";

  switch (justifyContent) {
    case "flex-start":
      for (let i = 1; i < elements.length; i++) {
        const prev = elements[i - 1];
        const current = elements[i];
        current.matrixState.layout[axis] =
          prev.matrixState.layout[axis] + prev.getOutlieSize()[sizeProperty];
      }
      break;

    case "flex-end":
      for (let i = 0; i < elements.length; i++) {
        elements[i].matrixState.layout[axis] = remainSpace;
        if (i > 0) {
          const prev = elements[i - 1];
          elements[i].matrixState.layout[axis] =
            prev.matrixState.layout[axis] + prev.getOutlieSize()[sizeProperty];
        }
      }
      break;

    case "center":
      for (let i = 0; i < elements.length; i++) {
        elements[i].matrixState.layout[axis] = remainSpace / 2;
        if (i > 0) {
          const prev = elements[i - 1];
          elements[i].matrixState.layout[axis] =
            prev.matrixState.layout[axis] + prev.getOutlieSize()[sizeProperty];
        }
      }
      break;

    case "space-between":
      // Distribute space evenly between elements
      if (elements.length > 1) {
        const spacing = remainSpace / (elements.length - 1);
        for (let i = 1; i < elements.length; i++) {
          const prev = elements[i - 1];
          elements[i].matrixState.layout[axis] =
            prev.matrixState.layout[axis] +
            prev.getOutlieSize()[sizeProperty] +
            spacing;
        }
      }
      break;

    // case "space-around":
    //   // Equal space around each element
    //   const spacing = remainSpace / elements.length;
    //   for (let i = 0; i < elements.length; i++) {
    //     if (i === 0) {
    //       elements[i].matrixState.layout[axis] = spacing / 2;
    //     } else {
    //       const prev = elements[i - 1];
    //       elements[i].matrixState.layout[axis] =
    //         prev.matrixState.layout[axis] +
    //         prev.getOutlieSize()[sizeProperty] +
    //         spacing;
    //     }
    //   }
    //   break;

    // case "space-evenly":
    //   // Equal space between and around elements
    //   const evenSpacing = remainSpace / (elements.length + 1);
    //   for (let i = 0; i < elements.length; i++) {
    //     if (i === 0) {
    //       elements[i].matrixState.layout[axis] = evenSpacing;
    //     } else {
    //       const prev = elements[i - 1];
    //       elements[i].matrixState.layout[axis] =
    //         prev.matrixState.layout[axis] +
    //         prev.getOutlieSize()[sizeProperty] +
    //         evenSpacing;
    //     }
    //   }
    //   break;
  }
}

export function calcAlignItems(
  container: Row | Column,
  elements: Element[],
  options: {
    remainSpace: number;
    preSpace: number;
    isColumn?: boolean;
  }
) {
  const { remainSpace, preSpace, isColumn = false } = options;
  const axis = isColumn ? "x" : "y";
  // const crossSizeProperty = isColumn ? "width" : "height";
  // const containerSize = isColumn
  //   ? container.size?.width
  //   : container.size?.height;

  for (const el of elements) {
    // el.matrixState.layout[axis] = preSpace;

    // Calculate available space for alignment
    // const elementSize = el.getOutlieSize()[crossSizeProperty] || 0;
    // const availableSpace = (containerSize || 0) - elementSize;

    switch (container.alignItems) {
      case "flex-start":
        // No additional adjustment needed
        break;
      case "center":
        el.matrixState.layout[axis] = preSpace + remainSpace / 2;
        break;

      case "flex-end":
        el.matrixState.layout[axis] = preSpace + remainSpace;
        break;

      // case "stretch":
      //   if (isColumn) {
      //     if (el.size) el.size.width = containerSize;
      //   } else {
      //     if (el.size) el.size.height = containerSize;
      //   }
      //   break;
    }
  }
}

export function calcFlexRowLayout(constraint: Constraint, elements: Element[]) {
  const flexEls = elements.filter((el) => el.flexBasis || el.flexGrow);
  const quantity = flexEls.reduce(
    (prev, child) => prev + (child.flexGrow ?? 0),
    0
  );

  flexEls.forEach((v) => {
    let _constraint = constraint.ratioWidth(
      v.flexGrow,
      quantity,
      v.flexBasis ?? v.width ?? 0
    );
    v.layout(_constraint);
  });
}

export function calcFlexColLayout(constraint: Constraint, elements: Element[]) {
  const flexEls = elements.filter((el) => el.flexBasis || el.flexGrow);
  const quantity = flexEls.reduce(
    (prev, child) => prev + (child.flexGrow ?? 0),
    0
  );
  flexEls.forEach((v) => {
    let _constraint = constraint.ratioHeight(
      v.flexGrow,
      quantity,
      v.flexBasis ?? v.height ?? 0
    );
    v.layout(_constraint);
  });
}

export function calcOutlieSize(elements: Element[]) {
  const {
    width: rowOutlineWidth,
    height: rowOutlineHeight,
    totalHeight
  } = elements.reduce(
    (prev, next) => {
      const size = next.getOutlieSize();
      return {
        width: size.width + prev.width,
        height: Math.max(size.height, prev.height),
        totalHeight: size.height + prev.totalHeight
      };
    },
    {
      width: 0,
      height: 0,
      totalHeight: 0
    }
  );

  return {
    rowOutlineWidth,
    rowOutlineHeight,
    totalHeight
  };
}
