// Event system
export { CustomEvent, EventEmitter } from "./event";
export type {
  UserCanvasEvent,
  EventName,
  CanvasPointEvent,
  FulateEvent,
  CustomEventInit,
  AddEventListenerOptions
} from "./event";

// Node system
export { Node } from "./node/node";
export { Transformable } from "./node/transformable";
export type { TransformableOptions } from "./node/transformable";
export { Element, EVENT_KEYS } from "./node/element";
export type { BaseElementOption, AnimateOptions, RBushItem } from "./node/element";
export {
  resolveAnchors,
  resolveAnchorId,
  buildAnchorIdMap,
  DEFAULT_ANCHOR_SCHEMA,
  getElementAnchorPoint,
  getElementAnchorPoints,
  syncAnchorIndicators,
  serializeAnchors,
  isAnchorAvailable
} from "./utils/anchor";
export type {
  AnchorPoint,
  AnchorPointData,
  AnchorLabelStyle,
  AnchorSnapContext
} from "./utils/anchor";
export { Shape } from "./node/shape";
export type { ShapeOption, BorderPosition, ShadowOption, Outset } from "./node/shape";
export { isGradient, createCanvasGradient } from "./utils/gradient";
export type {
  GradientType,
  GradientStop,
  GradientOption,
  BackgroundColor
} from "./utils/gradient";

// Theme
export { defaultTheme } from "./theme";
export type { Theme, TextStyleConfig } from "./theme";

// Root
export { Root } from "./root/index";
export { Viewport } from "./root/viewport";

// Layer
export { Layer } from "./layer/index";
export { Artboard } from "./layer/artboard";
export type { ArtboardOption } from "./layer/artboard";
export { EditerLayer } from "./layer/editer-layer";

// Registry
export { registerElement, getElementCtor } from "./registry";

import { registerElement } from "./registry";
import { Layer } from "./layer/index";
import { Artboard } from "./layer/artboard";
import { EditerLayer } from "./layer/editer-layer";

registerElement("f-layer", Layer);
registerElement("f-artboard", Artboard);
registerElement("f-editer-layer", EditerLayer);
