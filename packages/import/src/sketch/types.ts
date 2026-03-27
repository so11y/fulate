// ─── Sketch file top-level ─────────────────────────────────

export interface SketchFile {
  document: SketchDocument;
  meta: SketchMeta;
  pages: SketchPage[];
  images: Map<string, ArrayBuffer>;
}

// ─── document.json ─────────────────────────────────────────

export interface SketchDocument {
  _class: "document";
  do_objectID: string;
  assets: SketchAssets;
  colorSpace: number;
  pages: SketchPageRef[];
}

export interface SketchPageRef {
  _class: "MSJSONFileReference";
  _ref_class: "MSImmutablePage";
  _ref: string;
}

export interface SketchAssets {
  _class: "assetCollection";
  colors: SketchColor[];
  gradients: any[];
  images: any[];
}

// ─── meta.json ─────────────────────────────────────────────

export interface SketchMeta {
  commit: string;
  appVersion: string;
  build: number;
  app: string;
  pagesAndArtboards: Record<string, { name: string; artboards: Record<string, { name: string }> }>;
  version: number;
}

// ─── page ──────────────────────────────────────────────────

export interface SketchPage {
  _class: "page";
  do_objectID: string;
  name: string;
  layers: SketchLayer[];
  frame: SketchRect;
}

// ─── layer (recursive tree node) ──────────────────────────

export interface SketchLayer {
  _class: string;
  do_objectID: string;
  name: string;
  frame: SketchRect;
  isVisible: boolean;
  rotation: number;
  isFlippedHorizontal: boolean;
  isFlippedVertical: boolean;
  isLocked: boolean;
  style?: SketchStyle;
  layers?: SketchLayer[];

  // text
  attributedString?: SketchAttributedString;

  // bitmap
  image?: SketchImageRef;

  // shapePath
  points?: SketchCurvePoint[];
  isClosed?: boolean;

  // boolean op for shapeGroup children
  booleanOperation?: number;
}

// ─── geometry ──────────────────────────────────────────────

export interface SketchRect {
  _class: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── style ─────────────────────────────────────────────────

export interface SketchStyle {
  _class: "style";
  fills?: SketchFill[];
  borders?: SketchBorder[];
  shadows?: SketchShadow[];
  innerShadows?: SketchShadow[];
  blur?: SketchBlur;
  opacity?: number;
  contextSettings?: SketchGraphicsContextSettings;
}

export interface SketchGraphicsContextSettings {
  _class: "graphicsContextSettings";
  blendMode: number;
  opacity: number;
}

export interface SketchFill {
  _class: "fill";
  isEnabled: boolean;
  fillType: number; // 0=solid, 1=gradient, 4=pattern
  color: SketchColor;
  gradient?: SketchGradient;
}

export interface SketchBorder {
  _class: "border";
  isEnabled: boolean;
  color: SketchColor;
  thickness: number;
  position: number; // 0=center, 1=inside, 2=outside
  fillType: number;
}

export interface SketchShadow {
  _class: "shadow" | "innerShadow";
  isEnabled: boolean;
  color: SketchColor;
  blurRadius: number;
  offsetX: number;
  offsetY: number;
  spread: number;
}

export interface SketchBlur {
  _class: "blur";
  isEnabled: boolean;
  type: number;
  radius: number;
}

// ─── color & gradient ──────────────────────────────────────

export interface SketchColor {
  _class: "color";
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface SketchGradient {
  _class: "gradient";
  gradientType: number;
  from: string; // "{x, y}"
  to: string;
  stops: SketchGradientStop[];
}

export interface SketchGradientStop {
  _class: "gradientStop";
  color: SketchColor;
  position: number;
}

// ─── text ──────────────────────────────────────────────────

export interface SketchAttributedString {
  _class: "attributedString";
  string: string;
  attributes: SketchStringAttribute[];
}

export interface SketchStringAttribute {
  _class: "stringAttribute";
  location: number;
  length: number;
  attributes: {
    MSAttributedStringFontAttribute: {
      _class: "fontDescriptor";
      attributes: {
        name: string;
        size: number;
      };
    };
    MSAttributedStringColorAttribute?: SketchColor;
    paragraphStyle?: {
      _class: "paragraphStyle";
      alignment?: number; // 0=left, 1=right, 2=center, 3=justified
      maximumLineHeight?: number;
      minimumLineHeight?: number;
    };
    kerning?: number;
    textStyleVerticalAlignmentKey?: number;
    underlineStyle?: number;
  };
}

// ─── image reference ───────────────────────────────────────

export interface SketchImageRef {
  _class: "MSJSONFileReference" | "MSJSONOriginalDataReference";
  _ref_class: "MSImageData";
  _ref: string;
}

// ─── curve points (shapePath) ──────────────────────────────

export interface SketchCurvePoint {
  _class: "curvePoint";
  point: string; // "{x, y}" normalized 0~1
  curveFrom: string;
  curveTo: string;
  cornerRadius: number;
  curveMode: number; // 1=straight, 2=mirrored, 3=asymmetric, 4=disconnected
}
