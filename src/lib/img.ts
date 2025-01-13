import { Element, ElementOptions, Point } from "./base";

interface ImgOptions extends Omit<ElementOptions, "x" | "y"> {
  src: string;
}

export class Img extends Element implements ImgOptions {
  type = "img";
  src: string;
  image: HTMLImageElement;

  constructor(options: ImgOptions) {
    super(options);
    this.src = options.src;
    const img = new Image();
    this.image = img;
    img.src = this.src; //
  }

  draw(point: Point): void {
    // this.root.ctx.beginPath();
    this.root.ctx.fillStyle = "red";
    this.root.ctx.arc(10, 10, 10, 0, 2 * Math.PI); // 绘制圆形路径
    // this.root.ctx.closePath();
    this.root.ctx.fill();

    // this.root.ctx.drawImage(
    //   this.image,
    //   point.x,
    //   point.y,
    //   this.size.width,
    //   this.size.height
    // );
  }
}
