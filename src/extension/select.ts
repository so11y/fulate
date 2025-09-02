import {
  Container,
  ContainerChild,
  FederatedPointerEvent,
  Point
} from "pixi.js";
import { Fulate } from "../lib";
import { LayoutContainer, LayoutGraphics } from "@pixi/layout/components";
import { EventBoundary } from "pixi.js";
import {
  doPolygonsIntersect,
  getBoundingBox,
  mergeBoundingBoxes
} from "../utils/calc";
import { Layer } from "../lib/layer";

function drag(select: Selection, sky: Layer) {
  const el = new LayoutGraphics({
    layout: {
      width: "100%",
      height: "100%",
      borderWidth: 1,
      position: "relative",
      borderColor: "red"
    }
  });
  el.eventMode = "dynamic";
  const offset = { x: 0, y: 0 };
  el.on("pointerdown", (e) => {
    e.stopPropagation();

    const pos = e.global;
    offset.x = pos.x - el.x;
    offset.y = pos.y - el.y;

    const pointermove = (e: FederatedPointerEvent) => {
      e.stopPropagation();
      const pos = e.global;
      const x = pos.x - offset.x;
      const y = pos.y - offset.y;

      select.emit("dargSelect", { x, y });
    };

    const pointerup = () => {
      sky.stage.off("pointermove", pointermove);
      sky.stage.off("pointerup", pointerup);
    };
    sky.stage.on("pointermove", pointermove);
    sky.stage.on("pointerup", pointerup);
  });

  return el;
}

export class Selection extends LayoutContainer {
  constructor(flute: Fulate) {
    super();
    const selectChildren = [
      new LayoutContainer({
        layout: {
          position: "absolute",
          width: "100%",
          justifyContent: "center",
          top: -20
        },
        children: [
          new LayoutGraphics({
            layout: {
              width: 6,
              height: 6,
              backgroundColor: "blue"
            }
          })
        ]
      }),
      new LayoutGraphics({
        layout: {
          position: "absolute",
          width: 6,
          height: 6,
          left: -3,
          top: -3,
          backgroundColor: "blue"
        }
      }),
      new LayoutGraphics({
        layout: {
          position: "absolute",
          width: 6,
          height: 6,
          right: -3,
          top: -3,
          backgroundColor: "blue"
        }
      }),
      new LayoutGraphics({
        layout: {
          position: "absolute",
          width: 6,
          height: 6,
          left: -3,
          bottom: -3,
          backgroundColor: "blue"
        }
      }),
      new LayoutGraphics({
        layout: {
          position: "absolute",
          width: 6,
          height: 6,
          right: -3,
          bottom: -3,
          backgroundColor: "blue"
        }
      })
    ];

    const sky = flute.getLayer("sky");
    this.addChild(...[drag(this, sky), ...selectChildren]);

    const selectEls = new Set<Container<ContainerChild>>();
    sky.stage.interactive = true;
    sky.stage.hitArea = sky.screen;
    this.visible = false;
    const select = this;
    const layers = flute.layers.filter((v) => v !== sky);

    function hasIntersect(
      selectVertices: Point[],
      vv: Container<ContainerChild>
    ) {
      const elBounding = getBoundingBox(vv);
      return doPolygonsIntersect(selectVertices, elBounding.vertices);
    }
    sky.stage.on("pointerdown", (e) => {
      selectEls.clear();
      selectChildren.forEach((v) => {
        v.visible = false;
      });
      // select.children = [];
      const startDownPoint = {
        x: e.x,
        y: e.y
      };
      const pointermove = (e: FederatedPointerEvent) => {
        this.visible = true;
        const { x, y } = e;
        const selectVertices = getBoundingBox(this).vertices;
        layers.forEach((v) => {
          const vv = new EventBoundary(v.stage).hitTest(x, y);
          if (vv && hasIntersect(selectVertices, vv) && !selectEls.has(vv)) {
            selectEls.add(vv);
          }
        });
        select.x = startDownPoint.x;
        select.y = startDownPoint.y;
        select.layout = {
          width: x - startDownPoint.x,
          height: y - startDownPoint.y
        };
      };
      const pointerup = () => {
        const selectVertices = getBoundingBox(this).vertices;
        const intersectEls = Array.from(selectEls).filter((v) =>
          hasIntersect(selectVertices, v)
        );
        if (intersectEls.length) {
          const bounding = mergeBoundingBoxes(
            intersectEls.map((v) => getBoundingBox(v))
          );
          select.x = bounding.x;
          select.y = bounding.y;
          select.layout = {
            width: bounding.width,
            height: bounding.height
          };
          selectChildren.forEach((v) => {
            v.visible = true;
          });
        } else {
          this.visible = false;
        }

        sky.stage.off("pointermove", pointermove);
        sky.stage.off("pointerup", pointerup);
      };
      sky.stage.on("pointermove", pointermove);
      sky.stage.on("pointerup", pointerup);
    });

    this.on("dargSelect", (args) => {
      if (selectEls.size) {
        this.x = args.x;
        this.y = args.y;
        selectEls.forEach((v) => {
          v.x = args.x;
          v.y = args.y;
        });
      }
    });
  }
}
