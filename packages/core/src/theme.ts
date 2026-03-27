import type { BackgroundColor, ShadowOption } from "./node/shape";

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
  textStrokeColor?: BackgroundColor;
  textStrokeWidth?: number;
  textShadow?: ShadowOption | null;
}

export interface Theme {
  text: Required<TextStyleConfig>;
}

export const defaultTheme: Theme = {
  text: {
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
  },
};
