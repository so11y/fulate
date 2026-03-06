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
  Wrap
} from "yoga-layout";
import { Rectangle as BaseRectangle } from "../lib/ui/rectangle";
import { BaseElementOption } from "../lib/node/element";
import { FulateEvent } from "../lib/eventManage";
import { Node } from "../lib/node/node";

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
  Wrap
};

const keysToSync = ["left", "top", "width", "height"];

export interface YogaOption
  extends Omit<
    BaseElementOption,
    | "left"
    | "top"
    | "width"
    | "height"
    | "onclick"
    | "onpointermove"
    | "onpointerdown"
    | "onpointerup"
  > {
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

  onclick?: (v: FulateEvent<InstanceType<typeof Div>>) => void;
  onpointermove?: (v: FulateEvent<InstanceType<typeof Div>>) => void;
  onpointerdown?: (v: FulateEvent<InstanceType<typeof Div>>) => void;
  onpointerup?: (v: FulateEvent<InstanceType<typeof Div>>) => void;
}

const ExtractKey = new Set([
  "left",
  "top",
  "width",
  "height",
  "display",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "alignContent",
  "alignItems",
  "alignSelf",
  "aspectRatio",
  "flexg",
  "flexBasis",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexWrapg",
  "justifyContent",
  "paddingTop",
  "paddingLeft",
  "paddingRight",
  "paddingBottom",
  "padding",
  "marginTop",
  "marginLeft",
  "marginRight",
  "marginBottom",
  "margin",
  "position",
  "left",
  "top",
  "bottom",
  "right",
  "gap",
  "inset",
  "boxSizing"
]);

export function withYoga<T extends new (...arg: any[]) => BaseRectangle>(
  Node: T
) {
  class Div extends Node implements YogaOption {
    yogaNode? = Yoga.Node.create();
    declare children: any[];

    attrs(options: any): void {
      super.attrs(options, {
        assign: true,
        target: this._options
      });

      Object.keys(options).forEach((key) => {
        if (!ExtractKey.has(key) && !key.startsWith("on")) {
          this[key] = options[key];
        }
      });
    }

    mount(): void {
      const yogaRoot = this.inject("yoga-root");
      if (!yogaRoot) {
        this.provide("yoga-root", this);
      }
      super.mount();
      if (this.children) {
        this.children.forEach((child, index) => {
          if (child.yogaNode) {
            this.yogaNode.insertChild(child.yogaNode, index);
          }
        });
      }
      this.flushStyles();
      if (this === this.inject("yoga-root")) {
        this.layout();
      }
    }

    setOptions(options?: YogaOption, syncCalc = false) {
      super.setOptions(options as any, syncCalc);
      this.flushStyles();
      if (this.isActiveed) {
        this.inject("yoga-root").layout();
      }
      return this;
    }

    layout() {
      const yogaRoot = this.inject("yoga-root");
      if (yogaRoot === this) {
        this.yogaNode.calculateLayout("auto", "auto");
      }
      this.computedLayout();
      return this;
    }

    computedLayout() {
      if (this.isActiveed) {
        const layout = this.yogaNode.getComputedLayout();
        this.left = layout.left;
        this.top = layout.top;
        this.width = layout.width;
        this.height = layout.height;
        this.markDirty();
        this.children?.forEach((v) => v.computedLayout?.());
      }
      return this;
    }

    append<T extends Node>(...children: T[]): this {
      let currentIndex = this.children?.length ?? 0;
      super.append(...(children as any[]));
      children.forEach((child: any) => {
        if (child.yogaNode) {
          this.yogaNode.insertChild(child.yogaNode, currentIndex++);
        }
      });
      return this;
    }

    flushStyles(this: Div & YogaOption) {
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

    quickSetOptions(options: BaseElementOption): this {
      super.quickSetOptions(options);
      let needFlush = false;
      for (const key of keysToSync) {
        if (options[key] !== undefined) {
          this._options[key] = options[key];
          needFlush = true;
        }
      }
      if (needFlush) {
        this.flushStyles();
      }
      return this;
    }

    unmounted() {
      super.unmounted();
      this.yogaNode.free();
    }
  }

  return Div as any as new (...args: ConstructorParameters<T>) => Div &
    InstanceType<T>;
}

export const Div = withYoga<new (v: YogaOption) => BaseRectangle>(
  BaseRectangle as any
);
