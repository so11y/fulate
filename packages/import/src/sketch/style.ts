import type {
  SketchColor,
  SketchStyle,
  SketchFill,
  SketchBorder,
  SketchShadow,
  SketchGradient
} from "./types";
import type {
  ShapeOption,
  ShadowOption,
  BorderPosition,
  GradientOption
} from "@fulate/core";

export function sketchColorToCSS(c: SketchColor): string {
  const r = Math.round(c.red * 255);
  const g = Math.round(c.green * 255);
  const b = Math.round(c.blue * 255);
  if (c.alpha >= 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${parseFloat(c.alpha.toFixed(3))})`;
}

export interface StyleConvertResult {
  props: Partial<ShapeOption>;
  warnings: string[];
}

export function convertStyle(
  style: SketchStyle | undefined
): StyleConvertResult {
  const props: Partial<ShapeOption> = {};
  const warnings: string[] = [];

  if (!style) return { props, warnings };

  // opacity
  const opacity = style.contextSettings?.opacity ?? style.opacity;
  if (opacity !== undefined && opacity < 1) {
    props.opacity = parseFloat(opacity.toFixed(3));
  }

  // fill — prefer gradient, fallback to solid
  const gradientFill = findFirstEnabled(style.fills, (f) => f.fillType === 1);
  if (gradientFill?.gradient) {
    props.backgroundColor = convertGradient(gradientFill.gradient);
  } else {
    const fill = findFirstEnabled(style.fills, (f) => f.fillType === 0);
    if (fill) {
      props.backgroundColor = sketchColorToCSS(fill.color);
    }
  }

  // border — prefer gradient, fallback to solid (same as fill)
  const gradientBorder = findFirstEnabled(style.borders, (b) => b.fillType === 1);
  if (gradientBorder?.gradient) {
    props.borderColor = convertGradient(gradientBorder.gradient);
    props.borderWidth = gradientBorder.thickness;
    props.borderPosition = convertBorderPosition(gradientBorder.position);
  } else {
    const border = findFirstEnabled(style.borders, (b) => b.fillType === 0);
    if (border) {
      props.borderColor = sketchColorToCSS(border.color);
      props.borderWidth = border.thickness;
      props.borderPosition = convertBorderPosition(border.position);
    }
  }

  // shadow — take first enabled outer shadow
  const shadow = findFirstEnabled(style.shadows);
  if (shadow) {
    props.shadow = convertShadow(shadow);
  }

  if (style.innerShadows?.some((s) => s.isEnabled)) {
    warnings.push("Inner shadows not supported, skipped");
  }

  if (style.blur?.isEnabled) {
    warnings.push("Blur effect not supported, skipped");
  }

  return { props, warnings };
}

function convertBorderPosition(pos: number): BorderPosition {
  // Sketch: 0=center, 1=inside, 2=outside
  // fulate: "inside" | "outside", default is "inside"
  if (pos === 2) return "outside";
  return "inside";
}

function convertShadow(s: SketchShadow): ShadowOption {
  return {
    color: sketchColorToCSS(s.color),
    blur: s.blurRadius,
    offsetX: s.offsetX,
    offsetY: s.offsetY
  };
}

function convertGradient(sg: SketchGradient): GradientOption {
  const from = parseSketchNormalizedPoint(sg.from);
  const to = parseSketchNormalizedPoint(sg.to);
  return {
    type: sg.gradientType === 0 ? "linear" : "radial",
    from,
    to,
    ...(sg.gradientType === 1 ? { center: from, radius: 0.5 } : {}),
    stops: sg.stops.map((s) => ({
      color: sketchColorToCSS(s.color),
      position: s.position
    }))
  };
}

function parseSketchNormalizedPoint(str: string): { x: number; y: number } {
  const match = str.match(/\{([^,]+),\s*([^}]+)\}/);
  if (!match) return { x: 0.5, y: 0.5 };
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

function findFirstEnabled<T extends { isEnabled: boolean }>(
  items: T[] | undefined,
  filter?: (item: T) => boolean
): T | undefined {
  if (!items) return undefined;
  return items.find((item) => item.isEnabled && (!filter || filter(item)));
}
