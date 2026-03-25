import { ShapeOption, Shape } from "@fulate/core";

export type ImageResizeMode = "auto" | "none";

export interface ImageResizeOption {
  mode?: ImageResizeMode;
  resizeQuality?: ImageBitmapOptions["resizeQuality"];
}

export interface ImageOption<T = Image> extends ShapeOption<T> {
  src?: string;
  image?: HTMLImageElement | HTMLCanvasElement;
  resize?: ImageResizeOption;
}

const AUTO_DOWNSAMPLE_RATIO = 2;
const UPGRADE_RATIO = 1.5;

export class Image extends Shape {
  type = "image";
  src?: string;

  protected _renderImage: ImageBitmap | null = null;
  protected _isLoaded = false;
  private _resize: ImageResizeOption;
  private _renderSize = { w: 0, h: 0 };
  private _naturalWidth = 0;
  private _naturalHeight = 0;
  private _isProcessing = false;
  private _processGeneration = 0;

  constructor(options?: ImageOption) {
    super(options);
    this._resize = options?.resize ?? { mode: "auto" };
    if (options?.image) {
      this._setExternalImage(options.image);
    }
  }

  get resizeMode(): ImageResizeMode {
    return this._resize.mode ?? "auto";
  }

  get resizeQuality(): ImageBitmapOptions["resizeQuality"] {
    return this._resize.resizeQuality ?? "medium";
  }

  setResize(resize: ImageResizeOption) {
    this._resize = resize;
    if (this._isLoaded && this.src) {
      this._loadAndProcess();
    }
  }

  mounted() {
    super.mounted();
  }

  activate() {
    super.activate();
    if (this.src && !this._renderImage) {
      this._loadAndProcess();
    }
  }

  deactivate() {
    this._releaseRenderImage();
    super.deactivate();
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    if (!this._renderImage) return;
    if (this.radius) {
      ctx.save();
      this.buildPath(ctx);
      ctx.clip();
    }
    ctx.drawImage(
      this._renderImage,
      0,
      0,
      this.width || this._naturalWidth,
      this.height || this._naturalHeight
    );
    if (this.radius) {
      ctx.restore();
    }
  }

  /**
   * 当 auto 模式下 zoom 变化时检查是否需要升级分辨率。
   * 子类（如 EChartsShape）可以跳过此逻辑。
   */
  hasInView() {
    const inView = super.hasInView();
    if (inView && this._isLoaded && this.resizeMode === "auto") {
      this._checkResolution();
    }
    return inView;
  }

  async paintForExport(ctx: CanvasRenderingContext2D) {
    if (!this.src) return;
    const img = await this._loadHTMLImage(this.src);
    ctx.drawImage(
      img,
      0,
      0,
      this.width || img.naturalWidth,
      this.height || img.naturalHeight
    );
  }

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    json.src = this.src;
    if (this._resize.mode && this._resize.mode !== "auto") {
      json.resize = { ...this._resize };
    }
    return json;
  }

  unmounted(): void {
    this._releaseRenderImage();
    this.src = undefined;
    super.unmounted();
  }

  // ===================== 内部方法 =====================

  protected _releaseRenderImage() {
    if (this._renderImage) {
      this._renderImage.close();
      this._renderImage = null;
      this._isLoaded = false;
      this._renderSize = { w: 0, h: 0 };
    }
  }

  private _setExternalImage(image: HTMLImageElement | HTMLCanvasElement) {
    this._naturalWidth =
      image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    this._naturalHeight =
      image instanceof HTMLImageElement ? image.naturalHeight : image.height;

    createImageBitmap(image).then((bitmap) => {
      if (this.isUnmounted) {
        bitmap.close();
        return;
      }
      this._renderImage = bitmap;
      this._renderSize = { w: this._naturalWidth, h: this._naturalHeight };
      this._isLoaded = true;
      if (!this.width) this.width = this._naturalWidth;
      if (!this.height) this.height = this._naturalHeight;
      this.markNeedsLayout();
    });
  }

  protected async _loadAndProcess() {
    if (!this.src || this._isProcessing) return;
    this._isProcessing = true;
    const generation = ++this._processGeneration;

    try {
      const img = await this._loadHTMLImage(this.src);
      if (generation !== this._processGeneration || this.isUnmounted) return;

      this._naturalWidth = img.naturalWidth;
      this._naturalHeight = img.naturalHeight;
      if (!this.width) this.width = img.naturalWidth;
      if (!this.height) this.height = img.naturalHeight;

      await this._processImage(img, generation);
    } finally {
      if (generation === this._processGeneration) {
        this._isProcessing = false;
      }
    }
  }

  private async _processImage(
    img: HTMLImageElement,
    generation: number
  ) {
    const mode = this.resizeMode;

    let bitmap: ImageBitmap;

    if (mode === "none") {
      bitmap = await createImageBitmap(img);
      if (generation !== this._processGeneration || this.isUnmounted) {
        bitmap.close();
        return;
      }
      this._applyBitmap(bitmap, img.naturalWidth, img.naturalHeight);
    } else {
      const { w, h } = this._calcAutoSize(
        img.naturalWidth,
        img.naturalHeight
      );
      if (w >= img.naturalWidth && h >= img.naturalHeight) {
        bitmap = await createImageBitmap(img);
      } else {
        bitmap = await createImageBitmap(img, {
          resizeWidth: w,
          resizeHeight: h,
          resizeQuality: this.resizeQuality,
        });
      }
      if (generation !== this._processGeneration || this.isUnmounted) {
        bitmap.close();
        return;
      }
      this._applyBitmap(bitmap, bitmap.width, bitmap.height);
    }
  }

  private _applyBitmap(bitmap: ImageBitmap, w: number, h: number) {
    this._releaseRenderImage();
    this._renderImage = bitmap;
    this._renderSize = { w, h };
    this._isLoaded = true;
    this.markNeedsLayout();
  }

  private _calcAutoSize(
    naturalW: number,
    naturalH: number
  ): { w: number; h: number } {
    const dpr = this._root?.dpr ?? 1;
    const zoom = this._root?.viewport?.scale ?? 1;
    const targetW = Math.ceil((this.width || naturalW) * zoom * dpr);
    const targetH = Math.ceil((this.height || naturalH) * zoom * dpr);

    const needsDownsample =
      naturalW > targetW * AUTO_DOWNSAMPLE_RATIO ||
      naturalH > targetH * AUTO_DOWNSAMPLE_RATIO;

    if (!needsDownsample) {
      return { w: naturalW, h: naturalH };
    }

    const margin = 2;
    const w = Math.min(naturalW, Math.max(256, targetW * margin));
    const h = Math.min(naturalH, Math.max(256, targetH * margin));
    const scale = Math.min(w / naturalW, h / naturalH);
    return {
      w: Math.ceil(naturalW * scale),
      h: Math.ceil(naturalH * scale),
    };
  }

  private _checkResolution() {
    if (!this._isLoaded || !this.src || this._isProcessing) return;

    const dpr = this._root?.dpr ?? 1;
    const zoom = this._root?.viewport?.scale ?? 1;
    const needW = Math.ceil((this.width || this._naturalWidth) * zoom * dpr);
    const needH = Math.ceil((this.height || this._naturalHeight) * zoom * dpr);

    if (
      needW > this._renderSize.w * UPGRADE_RATIO ||
      needH > this._renderSize.h * UPGRADE_RATIO
    ) {
      this._loadAndProcess();
    }
  }

  private _loadHTMLImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  }
}
