import type { SketchLayer, SketchStringAttribute } from "./types";
import type { TextOption } from "@fulate/ui";
import { sketchColorToCSS } from "./style";

export function convertTextProps(layer: SketchLayer): Partial<TextOption> {
  const result: Partial<TextOption> = {};
  const attrStr = layer.attributedString;
  if (!attrStr) return result;

  result.text = attrStr.string;

  // use the first (or longest) attribute range as the dominant style
  const dominant = getDominantAttribute(attrStr.attributes);
  if (!dominant) return result;

  const font = dominant.attributes.MSAttributedStringFontAttribute;
  if (font) {
    result.fontSize = font.attributes.size;
    result.fontFamily = normalizeFontFamily(font.attributes.name);
    if (isBoldFont(font.attributes.name)) result.fontWeight = "bold";
    if (isItalicFont(font.attributes.name)) result.fontStyle = "italic";
  }

  const color = dominant.attributes.MSAttributedStringColorAttribute;
  if (color) {
    result.color = sketchColorToCSS(color);
  }

  const paragraph = dominant.attributes.paragraphStyle;
  if (paragraph) {
    result.textAlign = convertAlignment(paragraph.alignment);
    if (paragraph.maximumLineHeight && result.fontSize) {
      result.lineHeight = parseFloat(
        (paragraph.maximumLineHeight / result.fontSize).toFixed(2)
      );
    }
  }

  if (dominant.attributes.underlineStyle) {
    result.underline = true;
  }

  return result;
}

function getDominantAttribute(
  attrs: SketchStringAttribute[]
): SketchStringAttribute | undefined {
  if (!attrs.length) return undefined;
  if (attrs.length === 1) return attrs[0];
  return attrs.reduce((a, b) => (a.length >= b.length ? a : b));
}

function convertAlignment(
  alignment: number | undefined
): "left" | "center" | "right" {
  switch (alignment) {
    case 1: return "right";
    case 2: return "center";
    default: return "left";
  }
}

function normalizeFontFamily(name: string): string {
  // Sketch stores PostScript font names like "HelveticaNeue-Bold"
  // Strip weight/style suffixes for family matching
  return name
    .replace(/-(Bold|Italic|Light|Medium|Regular|Thin|Black|Heavy|Semibold|UltraLight|ExtraBold|BoldItalic|MediumItalic|LightItalic)$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function isBoldFont(name: string): boolean {
  return /bold|black|heavy|extrabold|semibold/i.test(name);
}

function isItalicFont(name: string): boolean {
  return /italic|oblique/i.test(name);
}
