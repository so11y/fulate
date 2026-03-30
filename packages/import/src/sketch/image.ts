import type { SketchLayer } from "./types";
import { arrayBufferToDataURL, guessMimeType } from "../util";

/**
 * Extract the image ref path from a bitmap layer and resolve it
 * to a data URL using the images extracted from the zip.
 */
export function resolveImageSrc(
  layer: SketchLayer,
  images: Map<string, ArrayBuffer>
): string | undefined {
  const ref = layer.image;
  if (!ref) return undefined;

  const refPath = ref._ref;
  const buf = images.get(refPath);
  if (!buf) return undefined;

  return arrayBufferToDataURL(buf, guessMimeType(refPath));
}
