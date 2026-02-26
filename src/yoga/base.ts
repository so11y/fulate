import { isNil } from "lodash-es";
import Yoga, {
  Align,
  BoxSizing,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Overflow,
  PositionType,
  Wrap,
} from "yoga-layout";
import { Rectangle as BaseRectangle } from "../lib/ui/rectangle";
import { BaseElementOption, Element, KEYS } from "../lib/node/element";

type YogaStyleSize = number | `${number}%`;
type YogaStyleSizeAndAuto = YogaStyleSize | "auto";

export {
  Align,
  BoxSizing,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Overflow,
  PositionType,
  Wrap,
};

export interface YogaOption
  extends Omit<BaseElementOption, "left" | "top" | "width" | "height"> {
  display?: Display;
  width?: YogaStyleSizeAndAuto;
  height?: YogaStyleSizeAndAuto;
  minWidth?: YogaStyleSize;
  minHeight?: YogaStyleSize;
  maxWidth?: YogaStyleSize;
  maxHeight?: YogaStyleSize;
  alignContent?: Align;
  alignItems?: Align;
  alignSelf?: Align;
  aspectRatio?: number;
  flex?: number;
  flexBasis?: YogaStyleSizeAndAuto;
  flexDirection?: FlexDirection;
  flexGrow?: number;
  flexShrink?: number;
  flexWrap?: Wrap;
  justifyContent?: Justify;
  paddingTop?: YogaStyleSize;
  paddingLeft?: YogaStyleSize;
  paddingRight?: YogaStyleSize;
  paddingBottom?: YogaStyleSize;
  padding?: YogaStyleSize;
  marginTop?: YogaStyleSizeAndAuto;
  marginLeft?: YogaStyleSizeAndAuto;
  marginRight?: YogaStyleSizeAndAuto;
  marginBottom?: YogaStyleSizeAndAuto;
  margin?: YogaStyleSizeAndAuto;
  position?: PositionType;
  left?: YogaStyleSize;
  top?: YogaStyleSize;
  bottom?: YogaStyleSize;
  right?: YogaStyleSize;
  gap?: YogaStyleSize;
  inset?: YogaStyleSize;
  // overflow?: Overflow;
  boxSizing?: BoxSizing;

  children?: any[];
}

export const YKEYS = new Set(
  Array.from(KEYS).concat([
    "boxSizing",
    "inset",
    "gap",
    "bottom",
    "right",
    "position",
    "margin",
    "marginBottom",
    "marginTop",
    "marginLeft",
    "marginRight",
    "padding",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "display",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "alignContent",
    "alignItems",
    "alignSelf",
    "aspectRatio",
    "flex",
    "flexBasis",
    "flexDirection",
    "flexGrow",
    "flexsShrink",
    "flexWrap",
    "justifyContent",
  ]),
);

export const BKEYS = new Set(
  Array.from(KEYS).filter(
    (v) => v !== "width" && v !== "height" && v !== "left" && v !== "top",
  ),
);

export function withYoga<T extends new (...arg: any[]) => BaseRectangle>(
  Node: T,
) {
  class LayoutNode extends Node implements YogaOption {
    yogaNode = Yoga.Node.create();
    declare children: any[];

    setOptions(options?: any) {
      if (options.children) {
      }
      super.setOptions(options);
      return this;
    }

    attrs(options: any): void {
      super.attrs(options, {
        KEYS: BKEYS,
      });

      Object.assign(this._options, options);

      this.layout();
      this.computedLayout();
    }

    layout() {
      if (this.isMounted) {
        this.flushStyles();
        this.children?.forEach((v) => v.layout?.());
      }
      return this;
    }

    computedLayout() {
      if (this.isMounted) {
        const layout = this.yogaNode.getComputedLayout();
        this.left = layout.left;
        this.top = layout.top;
        this.width = layout.width;
        this.height = layout.height;
        this.children?.forEach((v) => v.computedLayout?.());
      }
      return this;
    }

    append(...childNode: LayoutNode[]) {
      let currentIndex = this.children?.length ?? 0;
      super.append(...childNode);
      childNode.forEach((child) => {
        if (child.yogaNode) {
          this.yogaNode.insertChild(child.yogaNode, currentIndex++);
        }
      });
      return this;
    }

    flushStyles(this: LayoutNode & YogaOption) {
      const options = this._options;
      if (!isNil(options.display)) {
        this.yogaNode.setDisplay(options.display);
        if (options.display === Display.Flex) {
          this.yogaNode.setFlexDirection(FlexDirection.Row);
        }
      }
      !isNil(options.width) && this.yogaNode.setWidth(options.width);
      !isNil(options.height) && this.yogaNode.setHeight(options.height);
      !isNil(options.minWidth) && this.yogaNode.setMinWidth(options.minWidth);
      !isNil(options.minHeight) &&
        this.yogaNode.setMinHeight(options.minHeight);
      !isNil(options.maxWidth) && this.yogaNode.setMaxWidth(options.maxWidth);
      !isNil(options.maxHeight) &&
        this.yogaNode.setMaxHeight(options.maxHeight);

      !isNil(options.justifyContent) &&
        this.yogaNode.setJustifyContent(options.justifyContent);
      !isNil(options.alignContent) &&
        this.yogaNode.setAlignContent(options.alignContent);
      !isNil(options.alignItems) &&
        this.yogaNode.setAlignItems(options.alignItems);
      !isNil(options.alignSelf) &&
        this.yogaNode.setAlignSelf(options.alignSelf);
      !isNil(options.aspectRatio) &&
        this.yogaNode.setAspectRatio(options.aspectRatio);
      !isNil(options.flex) && this.yogaNode.setFlex(options.flex);
      !isNil(options.flexBasis) &&
        this.yogaNode.setFlexBasis(options.flexBasis);
      !isNil(options.flexDirection) &&
        this.yogaNode.setFlexDirection(options.flexDirection);
      !isNil(options.flexGrow) && this.yogaNode.setFlexGrow(options.flexGrow);
      !isNil(options.flexShrink) &&
        this.yogaNode.setFlexShrink(options.flexShrink);
      !isNil(options.flexWrap) && this.yogaNode.setFlexWrap(options.flexWrap);
      !isNil(options.gap) && this.yogaNode.setGap(Gutter.All, options.gap);

      !isNil(options.padding) &&
        this.yogaNode.setPadding(Edge.All, options.padding);
      !isNil(options.paddingLeft) &&
        this.yogaNode.setPadding(Edge.Left, options.paddingLeft);
      !isNil(options.paddingTop) &&
        this.yogaNode.setPadding(Edge.Top, options.paddingTop);
      !isNil(options.paddingRight) &&
        this.yogaNode.setPadding(Edge.Right, options.paddingRight);
      !isNil(options.paddingBottom) &&
        this.yogaNode.setPadding(Edge.Bottom, options.paddingBottom);

      !isNil(options.margin) &&
        this.yogaNode.setMargin(Edge.All, options.margin);
      !isNil(options.marginLeft) &&
        this.yogaNode.setMargin(Edge.Left, options.marginLeft);
      !isNil(options.marginTop) &&
        this.yogaNode.setMargin(Edge.Top, options.marginTop);
      !isNil(options.marginRight) &&
        this.yogaNode.setMargin(Edge.Right, options.marginRight);
      !isNil(options.marginBottom) &&
        this.yogaNode.setMargin(Edge.Bottom, options.marginBottom);

      !isNil(options.position) &&
        this.yogaNode.setPositionType(options.position);
      !isNil(options.inset) &&
        this.yogaNode.setPosition(Edge.All, options.inset);
      !isNil(options.left) &&
        this.yogaNode.setPosition(Edge.Left, options.left);
      !isNil(options.top) && this.yogaNode.setPosition(Edge.Top, options.top);
      !isNil(options.bottom) &&
        this.yogaNode.setPosition(Edge.Bottom, options.bottom);
      !isNil(options.right) &&
        this.yogaNode.setPosition(Edge.Right, options.right);

      !isNil(options.boxSizing) &&
        this.yogaNode.setBoxSizing(options.boxSizing);
      // !isNil(this.overflow) && this.yogaNode.setOverflow(this.overflow);

      return this;
    }

    unmounted() {
      super.unmounted();
      this.yogaNode.free();
    }
  }

  // return LayoutNode;
  return LayoutNode as any as new (
    ...args: ConstructorParameters<T>
  ) => LayoutNode & InstanceType<T>;
}

export const Rectangle = withYoga<new (v: YogaOption) => BaseRectangle>(
  BaseRectangle as any,
);
