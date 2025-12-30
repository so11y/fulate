import { Element } from './base';


export class Layer extends Element {
    type = "layer";
    canvasEl: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    zIndex: number;
    constructor(options: any,) {
        super(options);
        this.zIndex = options.zIndex ?? 1;
        this.canvasEl = document.createElement("canvas");
        this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
        this.layer = this;
    }

    mounted(): void {
        const root = this.root!;
        this.canvasEl.width = root.width!;
        this.canvasEl.height = root.height!;
        this.canvasEl.style.width = root.width! + "px";
        this.canvasEl.style.height = root.height! + "px";
        this.canvasEl.style.position = "absolute";
        this.canvasEl.style.left = "0px";
        this.canvasEl.style.top = "0px";
        this.canvasEl.style.zIndex = this.zIndex.toString();
        root.container.appendChild(this.canvasEl);
        super.mounted();
    }

    render() {
        this.clear()
        super.render(this.ctx)
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width!, this.height!);
    }
}