import { getMeasureContext, measureStringWidth } from "@fulate/ui";
import { MD3 } from "../theme";

export function measureText(
  text: string,
  fontSize: number,
  fontWeight: number = 500
): number {
  const font = `${fontWeight} ${fontSize}px ${MD3.fontFamily}`;
  const ctx = getMeasureContext();
  return Math.ceil(measureStringWidth(ctx, text, font));
}
