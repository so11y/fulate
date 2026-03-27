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

export const TEXT_STYLE_DEFAULTS: Required<TextStyleConfig> = {
  color: "#000000",
  fontSize: 14,
  fontFamily: "Arial",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "center",
  textBaseline: "top",
  verticalAlign: "middle",
  underline: false,
  strikethrough: false,
  lineHeight: 1.5,
  wordWrap: true,
  maxLines: 0,
  letterSpacing: 0,
  textStrokeColor: "",
  textStrokeWidth: 0,
  textShadow: null,
};

export const TEXT_STYLE_KEYS = Object.keys(TEXT_STYLE_DEFAULTS) as readonly TextStyleKey[];

export type TextStyleKey = keyof TextStyleConfig;

export function buildFontString(style: {
  fontStyle?: string;
  fontWeight?: string | number;
  fontSize?: number;
  fontFamily?: string;
}) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
}

export function resolveTextStyle(
  instance: Record<string, any>,
  defaults: Record<string, any>
): Required<TextStyleConfig> {
  const resolved = {} as any;
  for (const key of TEXT_STYLE_KEYS) {
    resolved[key] = instance[key] ?? defaults[key] ?? TEXT_STYLE_DEFAULTS[key];
  }
  return resolved;
}
