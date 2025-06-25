import { Drag } from ".";
// import { Group, Row } from "../lib";
import { element, Element, ElementOptions, Point } from "../lib/base";
import { Column } from "../lib/column";
import { Rect } from "../lib/types";
import {
  calculateElementBounds,
  isOverlap,
  mergeTwoRects
} from "../lib/utils/calc";
import { UserCanvasEvent } from "../lib/utils/eventManage";
import { first } from "lodash-es";

export class Select extends Element {
  type = "select";
  selectElements: Element[] = [];
  selectBody: Element;
  bodyControl: Element;
  lastRotate = 0;

  constructor() {
    super({
      key: "select"
    });
    // this.bodyControl = new Column({
    //   justifyContent: "space-between",
    //   height: Number.MAX_VALUE,
    //   children: [
    //     // Row({
    //     //   justifyContent: "space-between",
    //     //   translateY: -5,
    //     //   children: [
    //     //     ControlEl({
    //     //       cursor: "nw-resize",
    //     //       translateX: -5
    //     //     }),
    //     //     ControlEl({
    //     //       cursor: "grabbing",
    //     //       translateY: -30
    //     //     }),
    //     //     ControlEl({
    //     //       cursor: "sw-resize",
    //     //       translateX: 5
    //     //     })
    //     //   ]
    //     // }),
    //     // Row({
    //     //   justifyContent: "space-between",
    //     //   translateY: 5,
    //     //   children: [
    //     //     ControlEl({
    //     //       cursor: "sw-resize",
    //     //       translateX: -5
    //     //     }),
    //     //     ControlEl({
    //     //       cursor: "nw-resize",
    //     //       translateX: 5
    //     //     })
    //     //   ]
    //     // })
    //   ]
    // });
    this.selectBody = new Element({
      width: 100,
      height: 100,
      overflow: "hidden",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      position: "relative",
      children: [
        grabbing(),
        new Element({
          width: 5,
          height: 5,
          x: -2,
          y: -2,
          position: "absolute",
          backgroundColor: "red"
        }),
        new Element({
          width: 5,
          height: 5,
          right: 0,
          top: 0,
          x: 2,
          y: -2,
          position: "absolute",
          backgroundColor: "red"
        }),
        new Element({
          width: 5,
          height: 5,
          bottom: 0,
          left: 0,
          x: -2,
          y: 2,
          position: "absolute",
          backgroundColor: "red"
        }),
        new Element({
          width: 5,
          height: 5,
          bottom: 0,
          right: 0,
          x: 2,
          y: 2,
          position: "absolute",
          backgroundColor: "red"
        })
      ]
    });

    let selectElementsStartPoint: Array<Point & { element: Element }> = [];
    this.children = [
      Drag({
        proxyEl: this,
        child: this.selectBody,
        onDragStart: () => {
          selectElementsStartPoint = Array.from(
            hasParentIgNoreSelf(new Set(this.selectElements))
          ).map((v) => ({
            x: v.x,
            y: v.y,
            element: v
          }));
        },
        onDragMove: (e) => {
          selectElementsStartPoint.forEach(({ x, y, element }) => {
            element.setOption({
              x: e.x + x,
              y: e.y + y
            });
          });
        }
      })
    ];
  }

  mounted() {
    super.mounted();

    const pointerdown = (e: UserCanvasEvent) => {
      this.selectElements = [];
      this.lastRotate = 0;
      // this.selectBody.children = [];
      const selects = new Set<Element>();
      e.stopPropagation();
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };
      this.setOption({
        rotate: 0
      });
      const directEl = this.root.children?.filter(
        (v) => v.parent === v.root && v !== this
      )!;
      const pointermove = (e: UserCanvasEvent) => {
        const { x, y } = e.detail;
        const rect = {
          x: startDownPoint.x,
          y: startDownPoint.y,
          width: x - startDownPoint.x,
          height: y - startDownPoint.y
        };
        setRectSize(rect);
        const thisRect = calculateElementBounds(rect);
        directEl.forEach((element) => {
          isOverlap(thisRect, element)
            ? selects.add(element)
            : selects.delete(element);
        });
        this.root.render();
      };
      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => {
          console.log(selects, "--");
          const els = Array.from(selects); //Array.from(hasParentIgNoreSelf(selects));
          if (selects.size === 0) {
            setRectSize({
              x: 0,
              y: 0,
              width: 0,
              height: 0
            });
          } else if (selects.size >= 1) {
            if (els.length === 1) {
              setRectSize(first(els)!.getBoundingBox());
            } else {
              const rects = els.map((v) => v.getBoundingBox());
              const rect = rects.reduce((prev, next) =>
                mergeTwoRects(prev, next)
              );
              setRectSize(rect);
            }
            // this.selectBody.children = [this.bodyControl];
          }
          this.selectBody.overflow = els.length ? "visible" : "hidden";
          this.selectElements = els;
          this.root.render();
          this.root.removeEventListener("pointermove", pointermove);
        },
        {
          once: true
        }
      );
    };

    const setRectSize = (rect: Rect) => {
      this.setOption({
        x: rect.x - 4,
        y: rect.y - 4
      });
      this.selectBody.setOption({
        width: rect.width + 8,
        height: rect.height + 8
      });
    };

    this.root.addEventListener("pointerdown", pointerdown);
  }
}

function grabbing() {
  const el = new Element({
    width: 10,
    height: 10,
    left: 50,
    x: -2,
    y: -50,
    position: "absolute",
    backgroundColor: "red",
    radius: 10
  });

  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const select = el.root.getElementByKey("select") as Select;
    const startDownPoint = { x: e.detail.x, y: e.detail.y };
    const selectSelect = select.selectElements;
    const center = select.getGlobalCenter();
    el.addEventListener("pointermove", pointermove);
    el.addEventListener(
      "pointerup",
      () => el.removeEventListener("pointermove", pointermove),
      {
        once: true
      }
    );
    function pointermove(e: UserCanvasEvent) {
      const dx = e.detail.x - (startDownPoint.x + select.size.width / 2);
      const dy = e.detail.y - (startDownPoint.y + select.size.height / 2);
      const angle = (Math.atan2(dy, dx) + Math.PI / 2) % (2 * Math.PI);
      const rotate = (angle * 180) / Math.PI;
      selectSelect.forEach((element) => {
        element.setRotate(
          rotate,
          element.globalToLocal(center.x, center.y),
          false
        );
      });
      select.setRotate(rotate, undefined, false);
      select.root.render();
    }
  });

  return el;
}

function hasParentIgNoreSelf(v: Set<Element>) {
  Array.from(v).forEach((element) => {
    let parent = element.parent;
    while (parent) {
      if (v.has(parent)) {
        v.delete(element);
        return true;
      }
      parent = parent.parent;
    }
  });
  return v;
}

export function select() {
  return new Select();
}
