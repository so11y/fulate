import { Fulate } from "./lib";
import { LayoutGraphics } from "@pixi/layout/components";
import { Container } from "pixi.js";
import { Selection } from "./extension/select";

const flute = new Fulate();

flute.init().then(() => {
  const surface = flute.getLayer();

  console.log("---");
  const gg = new LayoutGraphics({
    layout: {
      height: "50%",
      backgroundColor: "blue"
    }
  });
  const container = new Container({
    layout: {
      width: 300,
      height: 100,
      alignItems: "center",
      backgroundColor: "black"
    },
    children: [
      new LayoutGraphics({
        layout: {
          height: "50%",
          backgroundColor: "blue"
        }
      }),
      new LayoutGraphics({
        layout: {
          height: "30%",
          backgroundColor: "yellow"
        }
      })
    ]
  });

  surface.stage.addChild(container);
  flute.getLayer("sky").stage.addChild(new Selection(flute));
});
