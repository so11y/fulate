import { defaultTheme } from "@fulate/core";
import type { TextStyleConfig } from "@fulate/core";

export type { TextStyleConfig };

export const TEXT_STYLE_DEFAULTS: Required<TextStyleConfig> = defaultTheme.text;

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
