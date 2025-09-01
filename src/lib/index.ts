import { ApplicationOptions } from "pixi.js";
import { Layer } from "./layer";
import "@pixi/layout";

export class Fulate {
  layers: Layer[] = [];

  constructor(options?: Partial<ApplicationOptions>) {
    this.layers = [
      //   new Layer({
      //     label: "underground",
      //     ...options
      //   }),
      new Layer({
        label: "surface",
        ...options
      }),
      new Layer({
        label: "sky",
        ...options
      })
    ];
  }

  async init(v?: Partial<ApplicationOptions>) {
    const fluteContainer = document.createElement("div");
    fluteContainer.style.position = "relative";
    document.body.append(fluteContainer);
    await Promise.allSettled(
      this.layers.map(async (app, index) => {
        await app.init({
          resizeTo: window,
          backgroundAlpha: 0,
          background: 0x000000,
          ...v
        });
        app.canvas.id = app.label!;
        app.canvas.style.zIndex = (index + 1).toString();
        app.canvas.style.position = "absolute";
        app.canvas.style.left = "0";
        app.canvas.style.top = "0";
        fluteContainer.appendChild(app.canvas);
      })
    );
    // const surface = this.getLayer();
    // function syncSize() {
    //   const bounds = surface.screen.getBounds();
    //   fluteContainer.style.cssText = `
    //         width:${bounds.width}px;
    //         height:${bounds.height}px;
    //     `;
    // }
    // surface.renderer.on("resize", (width, height) => syncSize());
  }

  getLayer(name = "surface") {
    return this.layers.find((v) => v.label === name)!;
  }

  render() {
    this.layers.forEach((v) => v.render());
  }
}
