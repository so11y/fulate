import { Shape } from "@fulate/core";
import type { ShapeOption } from "@fulate/core";
import { Point } from "@fulate/util";
import { Tween, Easing } from "@tweenjs/tween.js";

interface RippleState {
  cx: number;
  cy: number;
  radius: number;
  opacity: number;
}

export interface RippleOption extends ShapeOption {
  rippleColor?: string;
  rippleOpacity?: number;
  duration?: number;
}

export class RippleOverlay extends Shape {
  type = "ripple";
  rippleColor: string = "#ffffff";
  rippleOpacity: number = 0.3;
  duration: number = 400;
  fitWidth = true;
  fitHeight = true;

  private _ripples: RippleState[] = [];

  constructor(options?: RippleOption) {
    super(options);
    if (options?.rippleColor) this.rippleColor = options.rippleColor;
    if (options?.rippleOpacity != null) this.rippleOpacity = options.rippleOpacity;
    if (options?.duration != null) this.duration = options.duration;
  }

  /** 从全局逻辑坐标触发涟漪 */
  trigger(globalX: number, globalY: number) {
    const local = this.getGlobalToLocal(new Point(globalX, globalY));
    this._spawn(local.x, local.y);
  }

  private _spawn(cx: number, cy: number) {
    const w = this.parent?.width ?? 0;
    const h = this.parent?.height ?? 0;

    const maxRadius = Math.sqrt(
      Math.max(cx, w - cx) ** 2 + Math.max(cy, h - cy) ** 2
    );

    const ripple: RippleState = {
      cx,
      cy,
      radius: 0,
      opacity: this.rippleOpacity,
    };
    this._ripples.push(ripple);

    const tween = new Tween(ripple, this.layer.tweenGroup)
      .to({ radius: maxRadius, opacity: 0 }, this.duration)
      .easing(Easing.Quadratic.Out)
      .onUpdate(() => this.markPaintDirty())
      .onComplete(() => {
        const idx = this._ripples.indexOf(ripple);
        if (idx >= 0) this._ripples.splice(idx, 1);
        this.layer.tweenGroup.remove(tween);
        this.markPaintDirty();
      })
      .start();

    this.layer.requestRender();
  }

  paint(ctx: CanvasRenderingContext2D) {
    if (!this.visible || this._ripples.length === 0) return;

    const pw = this.parent?.width ?? 0;
    const ph = this.parent?.height ?? 0;
    const pr = (this.parent as any)?.radius ?? 0;

    ctx.save();
    this.applyPaintTransform(ctx);

    ctx.beginPath();
    ctx.roundRect(0, 0, pw, ph, pr);
    ctx.clip();

    for (const r of this._ripples) {
      ctx.save();
      ctx.globalAlpha = r.opacity;
      ctx.fillStyle = this.rippleColor;
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, r.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
