import { Drag } from ".";
import { Group, Row } from "../lib";
import { element, Element, ElementOptions, Point } from "../lib/base";
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
    this.bodyControl = Group.hFull({
      flexDirection: "column",
      justifyContent: "space-between",
      children: [
        Row({
          justifyContent: "space-between",
          translateY: -5,
          children: [
            ControlEl({
              cursor: "nw-resize",
              translateX: -5
            }),
            ControlEl({
              cursor: "grabbing",
              translateY: -30
            }),
            ControlEl({
              cursor: "sw-resize",
              translateX: 5
            })
          ]
        }),
        Row({
          justifyContent: "space-between",
          translateY: 5,
          children: [
            ControlEl({
              cursor: "sw-resize",
              translateX: -5
            }),
            ControlEl({
              cursor: "nw-resize",
              translateX: 5
            })
          ]
        })
      ]
    });
    this.selectBody = new Element({
      width: 0,
      height: 0,
      overflow: "hidden",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      child: this.bodyControl
    });
    this.selectBody.isInternal = true;

    let selectElementsStartPoint: Array<Point & { element: Element }> = [];
    this.children = [
      Drag({
        proxyEl: this,
        child: this.selectBody,
        onDragStart: () => {
          selectElementsStartPoint = this.selectElements.map((v) => ({
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
      this.selectBody.children = [];
      const selects = new Set<Element>();
      e.stopPropagation();
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };
      this.setOption({
        rotate: 0
      });
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
        this.root.quickElements.forEach((element) => {
          const provideCtx = element.provideLocalCtx();
          const react = element.getBoundingBox();
          if (
            isOverlap(thisRect, react) &&
            element !== this &&
            element.type !== "root" &&
            element.type !== "drag" &&
            !provideCtx.isInternal
          ) {
            selects.add(element);
          }
        });
        this.root.render();
      };
      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => {
          //因为是倒着鼠标碰撞的，所以里面包含了可能的父级,如果存在父级需要把自己过滤
          const els = Array.from(hasParentIgNoreSelf(selects));
          if (selects.size === 0) {
            setRectSize({
              x: 0,
              y: 0,
              width: 0,
              height: 0
            });
          } else if (selects.size >= 1) {
            if (els.length === 1) {
              setRectSize(first(els).getBoundingBox());
            } else {
              const rects = els.map((v) => v.getBoundingBox());
              const rect = rects.reduce((prev, next) =>
                mergeTwoRects(prev, next)
              );
              setRectSize(rect);
            }
            this.selectBody.children = [this.bodyControl];
          }
          this.selectBody.overflow = els.length ? "visible" : "hidden";
          // this.selectElements.forEach((element) => {
          //   element.setOption({
          //     centerOffsetX: 0,
          //     centerOffsetY: 0
          //   });
          // });
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

function ControlEl(option: ElementOptions) {
  const el = new Element({
    ...option,
    width: 10,
    height: 10,
    backgroundColor: "#800080",
    radius: 5
  });

  if (option.cursor === "grabbing") {
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const select = el.root.getElementByKey("select") as Select;
      const selectPoint = select.getLocalPoint(select.getWordPoint());
      const selectSelect = select.selectElements.map((v) => ({
        element: v
        // rotate: v.rotate,
        // center: v.getCenter(),
        // centerOffsetX: v.centerOffsetX ?? 0,
        // centerOffsetY: v.centerOffsetY ?? 0
      }));
      el.addEventListener("pointermove", pointermove);
      el.addEventListener(
        "pointerup",
        () => el.removeEventListener("pointermove", pointermove),
        {
          once: true
        }
      );
      const selectCenter = select.getCenter();
      function pointermove(e: UserCanvasEvent) {
        const dx = e.detail.x - selectPoint.x - select.size.width / 2;
        const dy = e.detail.y - selectPoint.y;
        const angle = (Math.atan2(dy, dx) + Math.PI / 2) % (2 * Math.PI);
        const rotate = (angle * 180) / Math.PI;
        selectSelect.forEach(
          ({
            //  center,
            element
            // centerOffsetX, centerOffsetY
          }) => {
            element.setRotate(rotate - select.lastRotate, selectCenter);
          }
        );
        select.setRotate(rotate - select.lastRotate, selectCenter);
        select.lastRotate = rotate;
        el.root.render();
      }
    });
  }

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
