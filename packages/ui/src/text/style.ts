import type { Node } from "@fulate/core";
import type { BackgroundColor, ShadowOption } from "@fulate/core";

export interface TextStyleConfig {
  color?: BackgroundColor;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right";
  textBaseline?: CanvasTextBaseline;
  verticalAlign?: "top" | "middle" | "bottom";
  underline?: boolean;
  strikethrough?: boolean;
  lineHeight?: number;
  wordWrap?: boolean;
  maxLines?: number;
  letterSpacing?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  textShadow?: ShadowOption | null;
}

export function buildFontString(style: {
  fontStyle?: string;
  fontWeight?: string | number;
  fontSize?: number;
  fontFamily?: string;
}) {
  const fs = style.fontStyle ?? "normal";
  const fw = style.fontWeight ?? "normal";
  const size = style.fontSize ?? 14;
  const ff = style.fontFamily ?? "Arial, sans-serif";
  return `${fs} ${fw} ${size}px ${ff}`;
}

export function getTextDefaults(
  node: Node,
  overrides?: Partial<TextStyleConfig>
): TextStyleConfig {
  const base = (node.root as any)?.textDefaults ?? {};
  if (!overrides) return { ...base };
  return { ...base, ...overrides };
}

export const TEXT_STYLE_KEYS = [
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textAlign",
  "textBaseline",
  "verticalAlign",
  "underline",
  "strikethrough",
  "lineHeight",
  "wordWrap",
  "maxLines",
  "letterSpacing",
  "textStrokeColor",
  "textStrokeWidth",
  "textShadow"
] as const;

export type TextStyleKey = (typeof TEXT_STYLE_KEYS)[number];

export function resolveTextStyle(
  current: Record<string, any>,
  defaults: Record<string, any>,
  explicit: Set<string>
): Required<TextStyleConfig> {
  const resolved = {} as any;
  for (const key of TEXT_STYLE_KEYS) {
    const currentValue = current[key];
    const defaultValue = defaults[key];
    resolved[key] =
      explicit.has(key) || defaultValue === undefined
        ? currentValue
        : defaultValue;
  }
  return resolved;
}
