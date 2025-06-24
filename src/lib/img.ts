import { Element, ElementOptions } from "./base";
import { TypeFn } from "./types";

interface ImgOptions extends Omit<ElementOptions, "x" | "y"> {
  src: string;
}

export class Img extends Element {
  type = "img";
  src: string;
  image: HTMLImageElement;
  imageResolve = false;

  constructor(options: ImgOptions) {
    super(options);
    this.src = options.src;
  }

  draw() {
    if (this.imageResolve === false) {
      return;
    }
    this.dirtyCache(() => {
      const layer = this.root.layerManager.getLayer(this.zIndex);
      const ctx = layer.getContext();
      ctx.save();
      ctx.beginPath();
      layer.applyMatrix(this.matrixState.matrix);
      ctx.fillStyle = this.backgroundColor || "transparent";
      ctx.roundRect(0, 0, this.size.width, this.size.height, this.radius);
      ctx.fill();
      ctx.clip();
      const imgWidth = this.image.width;
      const imgHeight = this.image.height;
      const scale = Math.max(
        this.size.width / imgWidth,
        this.size.height / imgHeight
      ); // 计算缩放比例
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      ctx.drawImage(this.image, 0, 0, scaledWidth, scaledHeight);
      ctx.restore();
    });
  }

  mounted(): void {
    super.mounted();
    const img = new Image();
    this.image = img;
    img.src = this.src;
    this.image.onload = () => {
      this.imageResolve = true;
      this.setDirty();
      this.root.draw();
    };
  }
}

export const img: TypeFn<ImgOptions, Img> = (option) => {
  return new Img(option);
};

img.hFull = function (options: ImgOptions) {
  const g = img(options);
  g.height = Number.MAX_VALUE;
  return g;
};

export class CircleImg extends Img {
  type = "img";

  draw() {
    if (this.imageResolve === false) {
      return;
    }
    this.dirtyCache(() => {
      const layer = this.getLayer();
      const ctx = layer.getContext();
      const diameter = this.size.width;
      const radius = this.size.width / 2;
      ctx.save();
      ctx.beginPath();
      layer.applyMatrix(this.matrixState.matrix);
      ctx.arc(radius + 0, radius + 0, radius, 0, 2 * Math.PI); // 绘制圆形路径
      ctx.clip();
      const imgWidth = this.image.width;
      const imgHeight = this.image.height;
      const scale = Math.max(diameter / imgWidth, diameter / imgHeight); // 计算缩放比例
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      const offsetX = (scaledWidth - diameter) / 2;
      const offsetY = (scaledHeight - diameter) / 2;
      ctx.drawImage(this.image, -offsetX, -offsetY, scaledWidth, scaledHeight);
      ctx.restore();
    });
  }
}

export const circleImg: TypeFn<ImgOptions, Img> = (option) => {
  return new CircleImg(option);
};

circleImg.hFull = function (options: ImgOptions) {
  const g = circleImg(options);
  g.height = Number.MAX_VALUE;
  return g;
};
