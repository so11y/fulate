import { MeasureMode } from "yoga-layout";
import { Text } from "@fulate/ui";
import {
  getMeasureContext,
  measureStringWidth,
  preCalculateChars,
  wrapText
} from "@fulate/ui";
import { withYoga } from "./div";

const YogaTextBase = withYoga<new (...args: any[]) => Text>(Text as any);

export class Span extends YogaTextBase {
  fitWidth = false;
  fitHeight = false;
  textAlign: "left" | "center" | "right" = "left";
  verticalAlign: "top" | "middle" | "bottom" = "top";
  private _measureBound = false;

  mount(): void {
    if (!this._measureBound) {
      this._measureBound = true;
      (this as any).yogaNode.setMeasureFunc(
        (
          width: number,
          widthMode: MeasureMode,
          _height: number,
          _heightMode: MeasureMode
        ) => this._measureText(width, widthMode)
      );
    }
    super.mount();
  }

  private _measureText(
    constraintWidth: number,
    widthMode: MeasureMode
  ): { width: number; height: number } {
    const self = this as any;
    const style = self.getResolvedTextStyle();
    const font = self.getFontString(style);
    const ctx = getMeasureContext();
    ctx.font = font;
    preCalculateChars(ctx, font);

    const lineHeightPx = style.fontSize * style.lineHeight;
    const text: string = self.text ?? "";

    if (!text) {
      return { width: 0, height: lineHeightPx };
    }

    const wrapWidth =
      widthMode === MeasureMode.Undefined ? Infinity : constraintWidth;
    const { lines } = wrapText(ctx, text, wrapWidth, font, style.wordWrap);
    const measuredHeight = Math.max(lines.length, 1) * lineHeightPx;

    if (widthMode === MeasureMode.Exactly) {
      return { width: constraintWidth, height: measuredHeight };
    }

    const naturalWidth = Math.max(
      ...lines.map((l) => measureStringWidth(ctx, l, font)),
      0
    );
    return {
      width:
        widthMode === MeasureMode.AtMost
          ? Math.min(naturalWidth, constraintWidth)
          : naturalWidth,
      height: measuredHeight
    };
  }

  computedLayout() {
    super.computedLayout();
    if ((this as any).isActiveed) {
      (this as any).syncTextLayout?.();
    }
    return this;
  }

  setOptions(options?: any, syncCalc = false) {
    super.setOptions(options, syncCalc);
    if ((this as any).isActiveed && (this as any).yogaNode) {
      (this as any).yogaNode.markDirty();
    }
    return this;
  }
}
