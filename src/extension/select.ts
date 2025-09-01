import { FederatedPointerEvent } from "pixi.js";
import { Fulate } from "../lib";
import { LayoutContainer } from "@pixi/layout/components";

export class Selection extends LayoutContainer {
  constructor(flute: Fulate) {
    super({
      layout: {
        width: 100,
        height: 100,
        borderColor: "red",
        borderWidth: 1
      }
    });
    // this.children = [];

    const sky = flute.getLayer("sky");
    sky.stage.interactive = true;
    sky.stage.hitArea = sky.screen;
    // sky.stage.visible = false;
    this.visible = false;
    const select = this;
    const layers = flute.layers.filter((v) => v !== sky);
    sky.stage.on("pointerdown", (e) => {
      const startDownPoint = {
        x: e.x,
        y: e.y
      };
      const pointermove = (e: FederatedPointerEvent) => {
        this.visible = true;
        const { x, y } = e;
        layers.forEach(v=>{
          
        })
        select.layout = {
          left: startDownPoint.x,
          top: startDownPoint.y,
          width: x - startDownPoint.x,
          height: y - startDownPoint.y
        };
      };
      const pointerup = () => {
        this.visible = false;
        sky.stage.off("pointermove", pointermove);
        sky.stage.off("pointermove", pointerup);
      };
      sky.stage.on("pointermove", pointermove);
      sky.stage.on("pointerup", pointerup);
    });
  }
}
