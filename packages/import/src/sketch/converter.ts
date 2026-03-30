import type { SketchFile, SketchLayer, SketchCurvePoint } from "./types";
import type { ImportResult } from "../types";
import type { FileData } from "../fulate";
import { convertStyle } from "./style";
import { convertTextProps } from "./text";
import { resolveImageSrc } from "./image";

// ─── context ──────────────────────────────────────────────

interface FlattenContext {
  offsetX: number;
  offsetY: number;
  flipH: boolean;
  flipV: boolean;
  groupW: number;
  groupH: number;
  zipImages: Map<string, ArrayBuffer>;
  imageDataURLs: Map<string, string>;
  warnings: string[];
  out: any[];
}

// ─── public API ────────────────────────────────────────────

export function convertSketchToFileData(sketch: SketchFile): ImportResult {
  const warnings: string[] = [];
  const imageDataURLs = new Map<string, string>();
  const children: any[] = [];

  const ctx: FlattenContext = {
    offsetX: 0,
    offsetY: 0,
    flipH: false,
    flipV: false,
    groupW: 0,
    groupH: 0,
    zipImages: sketch.images,
    imageDataURLs,
    warnings,
    out: children
  };

  for (const page of sketch.pages) {
    for (const layer of page.layers ?? []) {
      flattenLayer(layer, ctx);
    }
  }

  const fileData: FileData = {
    __fulate_file__: true,
    version: 1,
    children
  };

  return { fileData, images: imageDataURLs, warnings };
}

// ─── flatten layer tree ───────────────────────────────────
// Sketch uses nested groups with relative coordinates.
// fulate groups work via id-reference, not tree nesting.
// We flatten groups/artboards and accumulate coordinate offsets.
// flipH/flipV and groupW/groupH track inherited group flipping.

function flattenLayer(layer: SketchLayer, ctx: FlattenContext) {
  if (!layer.isVisible) return;
  if (layer.hasClippingMask) return;

  const cls = layer._class;

  if (cls === "artboard") {
    const childCtx: FlattenContext = {
      ...ctx,
      offsetX: ctx.offsetX,
      offsetY: ctx.offsetY,
      flipH: false,
      flipV: false,
      groupW: 0,
      groupH: 0
    };
    for (const child of layer.layers ?? []) {
      flattenLayer(child, childCtx);
    }
    return;
  }

  if (cls === "group") {
    let cx = ctx.offsetX + layer.frame.x;
    let cy = ctx.offsetY + layer.frame.y;

    if (ctx.flipH)
      cx = ctx.offsetX + (ctx.groupW - layer.frame.x - layer.frame.width);
    if (ctx.flipV)
      cy = ctx.offsetY + (ctx.groupH - layer.frame.y - layer.frame.height);

    const childCtx: FlattenContext = {
      ...ctx,
      offsetX: cx,
      offsetY: cy,
      flipH: ctx.flipH !== !!layer.isFlippedHorizontal,
      flipV: ctx.flipV !== !!layer.isFlippedVertical,
      groupW: layer.frame.width,
      groupH: layer.frame.height
    };

    for (const child of layer.layers ?? []) {
      flattenLayer(child, childCtx);
    }
    return;
  }

  if (cls === "shapeGroup") {
    const base = buildBase(layer, "rectangle", ctx);
    ctx.warnings.push(
      `[${layer.name}] shapeGroup mapped to rectangle (boolean ops not supported)`
    );
    ctx.out.push(base);
    return;
  }

  const type = mapSketchClass(cls, layer, ctx.warnings);
  if (!type) return;

  const base = buildBase(layer, type, ctx);

  switch (type) {
    case "text":
      delete base.backgroundColor;
      delete base.borderColor;
      delete base.borderWidth;
      delete base.borderPosition;
      delete base.shadow;
      Object.assign(base, convertTextProps(layer));
      break;
    case "image":
      assignImageSrc(base, layer, ctx);
      break;
    case "line":
      assignLinePoints(base, layer);
      break;
    case "polygon":
      assignPolygonPoints(base, layer);
      break;
  }

  if (ctx.flipH) base.scaleX = (base.scaleX ?? 1) * -1;
  if (ctx.flipV) base.scaleY = (base.scaleY ?? 1) * -1;

  ctx.out.push(base);
}

// ─── base props ────────────────────────────────────────────

function buildBase(layer: SketchLayer, type: string, ctx: FlattenContext) {
  const { props, warnings: styleWarnings } = convertStyle(layer.style);

  for (const w of styleWarnings) {
    ctx.warnings.push(`[${layer.name}] ${w}`);
  }

  let left = ctx.offsetX + layer.frame.x;
  let top = ctx.offsetY + layer.frame.y;

  if (ctx.flipH)
    left = ctx.offsetX + (ctx.groupW - layer.frame.x - layer.frame.width);
  if (ctx.flipV)
    top = ctx.offsetY + (ctx.groupH - layer.frame.y - layer.frame.height);


  const base: any = {
    type,
    left,
    top,
    width: layer.frame.width,
    height: layer.frame.height,
    ...props
  };

  if (layer.rotation) {
    base.angle = -layer.rotation;
  }

  if (layer.fixedRadius) {
    base.radius = layer.fixedRadius;
  } else if (layer.points?.length) {
    const cr = layer.points[0].cornerRadius;
    if (cr > 0) base.radius = cr;
  }

  if (layer.isFlippedHorizontal) base.scaleX = -1;
  if (layer.isFlippedVertical) base.scaleY = -1;

  return base;
}

// ─── class mapping ─────────────────────────────────────────

const CLASS_MAP: Record<string, string> = {
  rectangle: "rectangle",
  oval: "circle",
  triangle: "triangle",
  text: "text",
  bitmap: "image",
  star: "polygon",
  polygon: "polygon",
  slice: "",
  hotspot: "",
  MSImmutableHotspotLayer: ""
};

function mapSketchClass(
  cls: string,
  layer: SketchLayer,
  warnings: string[]
): string | null {
  if (cls in CLASS_MAP) {
    const mapped = CLASS_MAP[cls];
    if (!mapped) return null;
    if (cls === "star") {
      warnings.push(`[${layer.name}] "${cls}" mapped to polygon`);
    }
    return mapped;
  }

  if (cls === "shapePath") {
    return resolveShapePath(layer, warnings);
  }

  if (cls === "shapeGroup") {
    return null;
  }

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

  if (layer.isClosed) {
    return "polygon";
  }

  // Two-point paths are always straight lines regardless of curveMode
  if (points.length > 2) {
    const hasCurve = points.some((p) => !isStraightPoint(p));
    if (hasCurve) {
      warnings.push(`[${layer.name}] curve shapePath not supported, skipped`);
      return null;
    }
  }

  return "line";
}

function isStraightPoint(p: SketchCurvePoint): boolean {
  if (p.curveMode !== 1) return false;
  return (
    sketchPointsNearEqual(p.point, p.curveFrom) &&
    sketchPointsNearEqual(p.point, p.curveTo)
  );
}

function sketchPointsNearEqual(a: string, b: string, eps = 1e-6): boolean {
  if (a === b) return true;
  const pa = parseSketchPointRaw(a);
  const pb = parseSketchPointRaw(b);
  if (!pa || !pb) return false;
  return Math.abs(pa.x - pb.x) < eps && Math.abs(pa.y - pb.y) < eps;
}

function parseSketchPointRaw(str: string): { x: number; y: number } | null {
  const match = str.match(/\{([^,]+),\s*([^}]+)\}/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

// ─── polygon points ─────────────────────────────────────────

function assignPolygonPoints(base: any, layer: SketchLayer) {
  const points = layer.points;
  if (!points?.length) return;

  const { width, height } = layer.frame;
  base.points = points.map((p) => parseSketchPoint(p.point, width, height));
}

// ─── line points ───────────────────────────────────────────

function assignLinePoints(base: any, layer: SketchLayer) {
  const points = layer.points;
  if (!points?.length) return;

  const { width, height } = layer.frame;
  let parsed = points.map((p) => parseSketchPoint(p.point, width, height));

  // Sketch rotates around frame center, but fulate Line has no proper
  // rotation pivot. Bake the rotation into the point coordinates.
  if (base.angle) {
    const cx = width / 2;
    const cy = height / 2;
    const rad = (base.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    parsed = parsed.map((p) => ({
      x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
      y: cy + (p.x - cx) * sin + (p.y - cy) * cos
    }));
    delete base.angle;
  }

  const origin = parsed[0];

  base.left += origin.x;
  base.top += origin.y;

  base.linePoints = parsed.map((p) => ({
    x: p.x - origin.x,
    y: p.y - origin.y
  }));

  delete base.width;
  delete base.height;

  if (base.borderColor) {
    base.strokeColor = base.borderColor;
    delete base.borderColor;
  }
  if (base.borderWidth) {
    base.strokeWidth = base.borderWidth;
    delete base.borderWidth;
  }
  delete base.borderPosition;

  base.headDecoration = "none";
  base.tailDecoration = "none";
}

function parseSketchPoint(
  str: string,
  frameW: number,
  frameH: number
): { x: number; y: number } {
  const match = str.match(/\{([^,]+),\s*([^}]+)\}/);
  if (!match) return { x: 0, y: 0 };
  return {
    x: parseFloat(match[1]) * frameW,
    y: parseFloat(match[2]) * frameH
  };
}

// ─── image ─────────────────────────────────────────────────

function assignImageSrc(base: any, layer: SketchLayer, ctx: FlattenContext) {
  const src = resolveImageSrc(layer, ctx.zipImages);
  if (src) {
    base.src = src;
    const ref = layer.image?._ref;
    if (ref) ctx.imageDataURLs.set(ref, src);
  } else {
    ctx.warnings.push(`[${layer.name}] image resource not found`);
  }
}
