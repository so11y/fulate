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

export abstract class YogaOption {
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

  //render
  backgroundColor?: string;
  children?: Array<Element>;
}

export class Element extends YogaOption {
  yogaNode = Yoga.Node.create();
  renderNode = new BaseRectangle();

  constructor(options?: YogaOption) {
    super();
    this.setOptions(options);
  }

  setOptions(options: YogaOption) {
    if (options?.children) {
      if (this.children) {
        this.children.forEach((child) => {
          child.yogaNode.free();
          child.renderNode.unmounted();
        });
        this.children = [];
      }
      this.append(...options.children);
      delete options.children;
    }
    Object.assign(this, options);
    // this.yogaNode.markDirty();
    return this;
  }

  append(...childNode: Element[]) {
    if (!this.children) {
      this.children = [];
    }
    childNode.forEach((child) => {
      this.yogaNode.insertChild(child.yogaNode, this.children.length);
      this.children.push(child);
    });

    return this;
  }

  setStyleToYoga() {
    if (!isNil(this.display)) {
      this.yogaNode.setDisplay(this.display);
      if (this.display === Display.Flex) {
        this.yogaNode.setFlexDirection(FlexDirection.Row);
      }
    }
    !isNil(this.width) && this.yogaNode.setWidth(this.width);
    !isNil(this.height) && this.yogaNode.setHeight(this.height);
    !isNil(this.minWidth) && this.yogaNode.setMinWidth(this.minWidth);
    !isNil(this.minHeight) && this.yogaNode.setMinHeight(this.minHeight);
    !isNil(this.maxWidth) && this.yogaNode.setMaxWidth(this.maxWidth);
    !isNil(this.maxHeight) && this.yogaNode.setMaxHeight(this.maxHeight);

    !isNil(this.justifyContent) &&
      this.yogaNode.setJustifyContent(this.justifyContent);
    !isNil(this.alignContent) &&
      this.yogaNode.setAlignContent(this.alignContent);
    !isNil(this.alignItems) && this.yogaNode.setAlignItems(this.alignItems);
    !isNil(this.alignSelf) && this.yogaNode.setAlignSelf(this.alignSelf);
    !isNil(this.aspectRatio) && this.yogaNode.setAspectRatio(this.aspectRatio);
    !isNil(this.flex) && this.yogaNode.setFlex(this.flex);
    !isNil(this.flexBasis) && this.yogaNode.setFlexBasis(this.flexBasis);
    !isNil(this.flexDirection) &&
      this.yogaNode.setFlexDirection(this.flexDirection);
    !isNil(this.flexGrow) && this.yogaNode.setFlexGrow(this.flexGrow);
    !isNil(this.flexShrink) && this.yogaNode.setFlexShrink(this.flexShrink);
    !isNil(this.flexWrap) && this.yogaNode.setFlexWrap(this.flexWrap);
    !isNil(this.gap) && this.yogaNode.setGap(Gutter.All, this.gap);

    !isNil(this.padding) && this.yogaNode.setPadding(Edge.All, this.padding);
    !isNil(this.paddingLeft) &&
      this.yogaNode.setPadding(Edge.Left, this.paddingLeft);
    !isNil(this.paddingTop) &&
      this.yogaNode.setPadding(Edge.Top, this.paddingTop);
    !isNil(this.paddingRight) &&
      this.yogaNode.setPadding(Edge.Right, this.paddingRight);
    !isNil(this.paddingBottom) &&
      this.yogaNode.setPadding(Edge.Bottom, this.paddingBottom);

    !isNil(this.margin) && this.yogaNode.setMargin(Edge.All, this.margin);
    !isNil(this.marginLeft) &&
      this.yogaNode.setMargin(Edge.Left, this.marginLeft);
    !isNil(this.marginTop) && this.yogaNode.setMargin(Edge.Top, this.marginTop);
    !isNil(this.marginRight) &&
      this.yogaNode.setMargin(Edge.Right, this.marginRight);
    !isNil(this.marginBottom) &&
      this.yogaNode.setMargin(Edge.Bottom, this.marginBottom);

    !isNil(this.position) && this.yogaNode.setPositionType(this.position);
    !isNil(this.inset) && this.yogaNode.setPosition(Edge.All, this.inset);
    !isNil(this.left) && this.yogaNode.setPosition(Edge.Left, this.left);
    !isNil(this.top) && this.yogaNode.setPosition(Edge.Top, this.top);
    !isNil(this.bottom) && this.yogaNode.setPosition(Edge.Bottom, this.bottom);
    !isNil(this.right) && this.yogaNode.setPosition(Edge.Right, this.right);

    !isNil(this.boxSizing) && this.yogaNode.setBoxSizing(this.boxSizing);
    // !isNil(this.overflow) && this.yogaNode.setOverflow(this.overflow);

    if (this.children?.length) {
      this.children.forEach((v) => v.setStyleToYoga());
    }
    return this;
  }

  layoutSyncToRenderNode() {
    const layout = this.yogaNode.getComputedLayout();

    const style = {
      left: layout.left,
      top: layout.top,
      width: layout.width,
      height: layout.height,
      children: this.children?.map((child) => child.renderNode)
    } as any;

    if (this.backgroundColor) {
      style.backgroundColor = this.backgroundColor;
    }

    this.renderNode.setOptions(style);

    if (this.children?.length) {
      this.children.forEach((v) => v.layoutSyncToRenderNode());
    }
  }

  mounted() {
    this.children?.forEach((v) => v.mounted());
  }

  render() {
    this.renderNode.render();
  }
}
