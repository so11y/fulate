import type { SketchFile, SketchLayer, SketchCurvePoint } from "./types";
import type { ImportResult } from "../types";
import type { FileData } from "@fulate/tools";
import { convertStyle } from "./style";
import { convertTextProps } from "./text";
import { resolveImageSrc } from "./image";

// ─── public API ────────────────────────────────────────────

export function convertSketchToFileData(sketch: SketchFile): ImportResult {
  const warnings: string[] = [];
  const imageDataURLs = new Map<string, string>();

  const children: any[] = [];
  for (const page of sketch.pages) {
    for (const layer of page.layers ?? []) {
      const converted = convertLayer(layer, sketch.images, imageDataURLs, warnings);
      if (converted) children.push(converted);
    }
  }

  const fileData: FileData = {
    __fulate_file__: true,
    version: 1,
    children,
  };

  return { fileData, images: imageDataURLs, warnings };
}

// ─── recursive layer conversion ───────────────────────────

function convertLayer(
  layer: SketchLayer,
  zipImages: Map<string, ArrayBuffer>,
  imageDataURLs: Map<string, string>,
  warnings: string[]
): any | null {
  if (!layer.isVisible) return null;

  const type = mapSketchClass(layer._class, layer, warnings);
  if (!type) return null;

  const base = buildBase(layer, type, warnings);

  // type-specific props
  switch (type) {
    case "text":
      Object.assign(base, convertTextProps(layer));
      break;

    case "image":
      assignImageSrc(base, layer, zipImages, imageDataURLs, warnings);
      break;

    case "line":
      assignLinePoints(base, layer, warnings);
      break;
  }

  // recurse children (group, workspace, etc.)
  if (type !== "line" && layer.layers?.length) {
    const childResults: any[] = [];
    for (const child of layer.layers) {
      const converted = convertLayer(child, zipImages, imageDataURLs, warnings);
      if (converted) childResults.push(converted);
    }
    if (childResults.length) base.children = childResults;
  }

  return base;
}

// ─── base props ────────────────────────────────────────────

function buildBase(layer: SketchLayer, type: string, warnings: string[]) {
  const { props, warnings: styleWarnings } = convertStyle(layer.style);

  for (const w of styleWarnings) {
    warnings.push(`[${layer.name}] ${w}`);
  }

  const base: any = {
    type,
    left: layer.frame.x,
    top: layer.frame.y,
    width: layer.frame.width,
    height: layer.frame.height,
    ...props,
  };

  if (layer.rotation) {
    // Sketch stores rotation in degrees, counter-clockwise positive.
    // fulate uses clockwise positive.
    base.angle = -layer.rotation;
  }

  if (layer.isFlippedHorizontal) base.scaleX = -1;
  if (layer.isFlippedVertical) base.scaleY = -1;

  return base;
}

// ─── class mapping ─────────────────────────────────────────

const CLASS_MAP: Record<string, string> = {
  artboard: "workspace",
  group: "group",
  rectangle: "rectangle",
  oval: "circle",
  triangle: "triangle",
  text: "text",
  bitmap: "image",
  star: "rectangle",         // fallback
  polygon: "rectangle",     // fallback
  slice: "",                 // skip
  hotspot: "",               // skip
  MSImmutableHotspotLayer: "",
};

function mapSketchClass(
  cls: string,
  layer: SketchLayer,
  warnings: string[]
): string | null {
  // direct mapping
  if (cls in CLASS_MAP) {
    const mapped = CLASS_MAP[cls];
    if (!mapped) return null; // skip
    if (cls === "star" || cls === "polygon") {
      warnings.push(`[${layer.name}] "${cls}" mapped to rectangle (no native type)`);
    }
    return mapped;
  }

  // shapePath → line (straight only) or skip (curve)
  if (cls === "shapePath") {
    return resolveShapePath(layer, warnings);
  }

  // shapeGroup → rectangle fallback
  if (cls === "shapeGroup") {
    warnings.push(
      `[${layer.name}] shapeGroup mapped to rectangle (boolean ops not supported)`
    );
    return "rectangle";
  }

  // symbolInstance etc. — skip with warning
  warnings.push(`[${layer.name}] unsupported layer class "${cls}", skipped`);
  return null;
}

// ─── shapePath → line resolution ──────────────────────────

function resolveShapePath(
  layer: SketchLayer,
  warnings: string[]
): string | null {
  const points = layer.points;
  if (!points || points.length < 2) {
    warnings.push(`[${layer.name}] shapePath with <2 points, skipped`);
    return null;
  }

  // closed paths are not lines
  if (layer.isClosed) {
    warnings.push(
      `[${layer.name}] closed shapePath not supported, skipped`
    );
    return null;
  }

  const hasCurve = points.some((p) => !isStraightPoint(p));
  if (hasCurve) {
    warnings.push(
      `[${layer.name}] curve shapePath not supported, skipped`
    );
    return null;
  }

  return "line";
}

function isStraightPoint(p: SketchCurvePoint): boolean {
  return p.curveMode === 1 && p.point === p.curveFrom && p.point === p.curveTo;
}

// ─── line points ───────────────────────────────────────────

function assignLinePoints(
  base: any,
  layer: SketchLayer,
  warnings: string[]
) {
  const points = layer.points;
  if (!points?.length) return;

  const { width, height } = layer.frame;

  // Sketch curvePoint.point is normalized "{x, y}" in 0~1 range relative to frame
  const parsed = points.map((p) => parseSketchPoint(p.point, width, height));

  // fulate Line stores linePoints relative to left/top (first point is origin)
  const origin = parsed[0];
  base.linePoints = parsed.map((p) => ({
    x: p.x - origin.x,
    y: p.y - origin.y,
  }));

  // line doesn't use width/height for sizing
  delete base.width;
  delete base.height;

  // line-specific style: convert border to strokeColor/strokeWidth
  if (base.borderColor) {
    base.strokeColor = base.borderColor;
    delete base.borderColor;
  }
  if (base.borderWidth) {
    base.strokeWidth = base.borderWidth;
    delete base.borderWidth;
  }
  delete base.borderPosition;
}

/**
 * Sketch point strings look like "{0.5, 0.3}" — normalized 0~1 values.
 * Convert to absolute pixel coords within the frame.
 */
function parseSketchPoint(
  str: string,
  frameW: number,
  frameH: number
): { x: number; y: number } {
  const match = str.match(/\{([^,]+),\s*([^}]+)\}/);
  if (!match) return { x: 0, y: 0 };
  return {
    x: parseFloat(match[1]) * frameW,
    y: parseFloat(match[2]) * frameH,
  };
}

// ─── image ─────────────────────────────────────────────────

function assignImageSrc(
  base: any,
  layer: SketchLayer,
  zipImages: Map<string, ArrayBuffer>,
  imageDataURLs: Map<string, string>,
  warnings: string[]
) {
  const src = resolveImageSrc(layer, zipImages);
  if (src) {
    base.src = src;
    const ref = layer.image?._ref;
    if (ref) imageDataURLs.set(ref, src);
  } else {
    warnings.push(`[${layer.name}] image resource not found`);
  }
}
