import type { SketchLayer } from "./types";

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

function arrayBufferToDataURL(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}
