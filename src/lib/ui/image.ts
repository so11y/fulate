import { BaseElementOption, Element } from "../node/element";

export interface ImageOption extends BaseElementOption {
  src?: string;
  image?: HTMLImageElement | HTMLCanvasElement;
}

export class Image extends Element {
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
      this.markDirty();
    };
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.notInDitry()) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.setTransform(
      this.root.getViewPointMtrix().multiply(this.getOwnMatrix())
    );

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.roundRect(0, 0, this.width || 0, this.height || 0, this.radius ?? 0);
      ctx.fill();
    }

    if (this._isLoaded && this.image) {
      ctx.drawImage(
        this.image,
        0,
        0,
        this.width || this.image.width,
        this.height || this.image.height
      );
    }

    if (this.children?.length) {
      super.paint(ctx);
    }
    ctx.restore();
  }
}
