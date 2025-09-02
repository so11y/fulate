import { Fulate } from "./lib";
import { LayoutContainer, LayoutGraphics } from "@pixi/layout/components";
import { Container, Graphics } from "pixi.js";
import { Selection } from "./extension/select";

const flute = new Fulate({
  antialias: true
});

flute
  .init({
    // autoDensity: false,
    // autoStart: false
  })
  .then(() => {
    const surface = flute.getLayer();

    const gg12 = new LayoutContainer({
      label: "6766",
      layout: {
        width: 30,
        height: 30,
        backgroundColor: "blue"
      }
    });
    const gg1 = new Graphics().rect(50, 50, 30, 30).fill("red");
    gg1.interactive = true;

    gg1.rotation = 0.5;

    const container = new Container({
      layout: {
        width: 300,
        height: 100,
        alignItems: "center",
        backgroundColor: "black"
      },
      children: [
        // gg,
        new LayoutGraphics({
          layout: {
            height: "30%",
            backgroundColor: "yellow"
          }
        })
      ]
    });

    surface.stage.addChild(gg1, gg12, container);
    flute.getLayer("sky").stage.addChild(new Selection(flute));
    surface.render();
  });
