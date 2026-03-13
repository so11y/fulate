import { MD3 } from "../theme";

export function getBorderColor(disabled: boolean, focused: boolean): string {
  if (disabled) return MD3.outlineVariant;
  if (focused) return MD3.primary;
  return MD3.outline;
}
