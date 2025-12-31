import Yoga, {
  Align,
  Direction,
  Display,
  FlexDirection,
  Wrap
} from "yoga-layout";
import { Element as BaseElement } from "../lib/base";
import { BaseElementOption } from "../lib/base";

type YogaStyleSize = number | `${number}%`;
type YogaStyleSizeAndAuto = YogaStyleSize | "auto";

export abstract class YogaOption {
  display?: Display;
  width?: YogaStyleSizeAndAuto;
  height?: YogaStyleSizeAndAuto;
  minWidth?: YogaStyleSizeAndAuto;
  minHeight?: YogaStyleSizeAndAuto;
  maxWidth?: YogaStyleSizeAndAuto;
  maxHeight?: YogaStyleSizeAndAuto;
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
  paddingTop?: YogaStyleSizeAndAuto;
  paddingLeft?: YogaStyleSizeAndAuto;
  paddingRight?: YogaStyleSizeAndAuto;
  paddingBottom?: YogaStyleSizeAndAuto;
  padding?: YogaStyleSizeAndAuto;
  marginTop?: YogaStyleSizeAndAuto;
  marginLeft?: YogaStyleSizeAndAuto;
  marginRight?: YogaStyleSizeAndAuto;
  marginBottom?: YogaStyleSizeAndAuto;
  margin?: YogaStyleSizeAndAuto;
}

export class Element extends YogaOption {
  children: Element[];
  yogaNode = Yoga.Node.create();
  renderNode: BaseElement;

  constructor(options: YogaOption) {
    super();
    this.setOptions(options);
  }

  setOptions(options: YogaOption) {
    Object.assign(this, options);
    return this;
  }

  append(childNode: Element) {
    if (!this.children) {
      this.children = [];
    }
    this.children.push(childNode);
    this.yogaNode.insertChild(childNode.yogaNode, this.children.length);
    return this;
  }

  layout() {
    this.yogaNode.setWidth(this.width);
    this.yogaNode.setHeight(this.height);
    //这里给我继续补充
    this.yogaNode.calculateLayout(undefined, undefined, Direction.LTR);
  }

  mounted() {
    this.renderNode = new BaseElement();
    this.layout();
  }
}
