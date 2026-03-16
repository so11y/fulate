// Node system
export { Node } from "./node/node";
export { Transformable } from "./node/transformable";
export type { TransformableOptions } from "./node/transformable";
export { Element, EVENT_KEYS } from "./node/element";
export type { BaseElementOption, AnimateOptions } from "./node/element";
export { Shape } from "./node/shape";
export type { ShapeOption, BorderPosition, ShadowOption, Outset } from "./node/shape";

// Root
export { Root } from "./root/index";
export type { RBushItem } from "./root/index";

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
