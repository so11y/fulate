import { ShapeOption, Shape } from "@fulate/core";

export interface ImageOption extends ShapeOption {
  src?: string;
  image?: HTMLImageElement | HTMLCanvasElement;
}

export class Image extends Shape {
  type = "image";
  src?: string;
  image?: HTMLImageElement | HTMLCanvasElement;
  private _isLoaded = false;

  constructor(options?: ImageOption) {
    super(options);
    if (options) {
      this.attrs(options);
    }
    if (this.src && !this.image) {
      this.loadImage();
    } else if (this.image) {
      this._isLoaded = true;
    }
  }

  private loadImage() {
    if (!this.src) return;
    const img = new window.Image();
    img.src = this.src;
    img.onload = () => {
      this.image = img;
      this._isLoaded = true;
      if (!this.width) this.width = img.width;
      if (!this.height) this.height = img.height;
      this.markNeedsLayout();
    };
  }

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    json.src = this.src;
    return json;
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    if (this._isLoaded && this.image) {
      if (this.radius) {
        ctx.save();
        this.buildPath(ctx);
        ctx.clip();
      }
      ctx.drawImage(
        this.image,
        0,
        0,
        this.width || this.image.width,
        this.height || this.image.height
      );
      if (this.radius) {
        ctx.restore();
      }
    }
  }
}
