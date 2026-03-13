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
import { Node } from "@fulate/core";
import type { ShapeOption } from "@fulate/core";
import { Rectangle as BaseRectangle } from "@fulate/ui";
import { FulateEvent } from "@fulate/util";

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

export interface YogaOption extends Omit<
  ShapeOption,
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
  "display",
  "left",
  "top",
  "bottom",
  "right",
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
  "flex",
  "flexBasis",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexWrap",
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
  "gap",
  "inset",
  "boxSizing"
]);

export interface DivMixin {
  yogaNode?: ReturnType<typeof Yoga.Node.create>;
  layout(): this;
  computedLayout(): this;
  flushStyles(): this;
  setOptions(options?: YogaOption, syncCalc?: boolean): this;
  quickSetOptions(options: ShapeOption): this;
}

export function withYoga<T extends new (...arg: any[]) => BaseRectangle>(
  Node: T
): new (...args: ConstructorParameters<T>) => DivMixin & InstanceType<T> {
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
        let yogaIndex = 0;
        this.children.forEach((child) => {
          if (child.yogaNode) {
            this.yogaNode.insertChild(child.yogaNode, yogaIndex++);
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
        const isRoot = this.inject("yoga-root") === this;
        if (isRoot) {
          this.left = this._options.left ?? 0;
          this.top = this._options.top ?? 0;
        } else {
          this.left = layout.left;
          this.top = layout.top;
        }
        this.width = layout.width;
        this.height = layout.height;
        this.markNeedsLayout();
        this.children?.forEach((v) => v.computedLayout?.());
      }
      return this;
    }

    insertBefore(newChild: Node, refChild: Node | null): this {
      if (!refChild) return this.append(newChild);
      super.insertBefore(newChild, refChild);
      if (this.isActiveed && (newChild as any).yogaNode) {
        const idx = this.children?.indexOf(newChild as any) ?? -1;
        if (idx !== -1) {
          this.yogaNode.insertChild((newChild as any).yogaNode, idx);
        }
      }
      return this;
    }

    append(...children: Node[]): this {
      super.append(...(children as any[]));
      if (this.isActiveed) {
        let yogaIndex = this.yogaNode.getChildCount();
        children.forEach((child: any) => {
          if (child.yogaNode) {
            this.yogaNode.insertChild(child.yogaNode, yogaIndex++);
          }
        });
      }
      return this;
    }

    removeChild(...children: Node[]): this {
      children.forEach((child: any) => {
        if (child.yogaNode && this.yogaNode) {
          this.yogaNode.removeChild(child.yogaNode);
        }
      });
      super.removeChild(...(children as any[]));
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

      this.yogaNode.setBorder(Edge.All, this.borderWidth ?? 0);
      // !isNil(this.overflow) && this.yogaNode.setOverflow(this.overflow);

      return this;
    }

    toJson(includeChildren = false) {
      const json = super.toJson(includeChildren) as any;
      for (const key of ExtractKey) {
        const val = this._options[key];
        if (val !== undefined) json[key] = val;
      }
      return json;
    }

    onParentResize() {}

    quickSetOptions(options: ShapeOption): this {
      super.quickSetOptions(options);
      let needFlush = false;
      let sizeChanged = false;
      for (const key of keysToSync) {
        if (options[key] !== undefined) {
          this._options[key] = options[key];
          needFlush = true;
          if (key === "width" || key === "height") sizeChanged = true;
        }
      }
      if (needFlush) {
        this.flushStyles();
        if (sizeChanged && this.isActiveed) {
          this.inject("yoga-root").layout();
        }
      }
      return this;
    }

    unmounted() {
      if (this.yogaNode) {
        this.children?.forEach((child: any) => {
          if (child.yogaNode) {
            this.yogaNode.removeChild(child.yogaNode);
          }
        });
      }
      super.unmounted();
      this.yogaNode?.free();
    }
  }

  return Div as any;
}

export const Div = withYoga<new (v: YogaOption) => BaseRectangle>(
  BaseRectangle as any
);
