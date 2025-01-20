import { Element, ElementOptions, Point } from "./base";
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

  draw(point: Point): void {
    if (this.imageResolve === false) {
      return
    }
    this.root.ctx.save();
    this.root.ctx.beginPath();
    const localMatrix = this.provideLocalCtx();
    const x = point.x + localMatrix.translateX
    const y = point.y + localMatrix.translateY
    this.root.ctx.roundRect(
      x,
      y,
      this.size.width,
      this.size.height,
      this.radius
    );
    this.root.ctx.fill();
    this.root.ctx.clip();
    const imgWidth = this.image.width;
    const imgHeight = this.image.height;
    const scale = Math.max(
      this.size.width / imgWidth,
      this.size.height / imgHeight
    ); // 计算缩放比例
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const offsetX = (scaledWidth - this.size.width) / 2 - x;
    const offsetY = (scaledHeight - this.size.height) / 2 - y;
    this.root.ctx.drawImage(
      this.image,
      -offsetX,
      -offsetY,
      scaledWidth,
      scaledHeight
    );
    this.root.ctx.restore();
  }

  mounted(): void {
    super.mounted()
    const img = new Image();
    this.image = img;
    img.src = this.src;
    this.image.onload = () => {
      this.imageResolve = true;
      const parent = this.parent!.provideLocalCtx().overflowHideEl || this.root
      parent.render()
    };
  }
}

export const img: TypeFn<ImgOptions, Img> = (option) => {
  return new Img(option)
};

img.hFull = function (options: ImgOptions) {
  const g = img(options)
  g.height = Number.MAX_VALUE
  return g
}

export class CircleImg extends Img {
  type = "img";

  draw(point: Point): void {
    if (this.imageResolve === false) {
      return
    }
    const diameter = this.size.width;
    const radius = this.size.width / 2;
    const localMatrix = this.provideLocalCtx();
    const x = point.x + localMatrix.translateX
    const y = point.y + localMatrix.translateY
    this.root.ctx.save();
    this.root.ctx.beginPath();
    this.root.ctx.arc(
      radius + x,
      radius + y,
      radius,
      0,
      2 * Math.PI
    ); // 绘制圆形路径
    this.root.ctx.clip();
    const imgWidth = this.image.width;
    const imgHeight = this.image.height;
    const scale = Math.max(diameter / imgWidth, diameter / imgHeight); // 计算缩放比例
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const offsetX = (scaledWidth - diameter) / 2 - x;
    const offsetY = (scaledHeight - diameter) / 2 - y;
    this.root.ctx.drawImage(
      this.image,
      -offsetX,
      -offsetY,
      scaledWidth,
      scaledHeight
    );
    this.root.ctx.restore();
  }
}

export const circleImg: TypeFn<ImgOptions, Img> = (option) => {
  return new CircleImg(option)
};

circleImg.hFull = function (options: ImgOptions) {
  const g = circleImg(options)
  g.height = Number.MAX_VALUE
  return g
}