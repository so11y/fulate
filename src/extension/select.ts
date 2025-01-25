import { Drag } from ".";
import { Group, Row } from "../lib";
import { Element, ElementOptions, Point } from "../lib/base";
import { Rect } from "../lib/types";
import {
  calculateElementBounds,
  isOverlap,
  mergeTwoRects
} from "../lib/utils/calc";
import { UserCanvasEvent } from "../lib/utils/eventManage";
import { first } from "lodash-es";
import { linkEl } from "../lib/utils/helper";

export class Select extends Element {
  type = "select";
  selectElements: Element[] = [];
  selectBody: Element;
  bodyControl: Element;

  constructor() {
    super();
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
      backgroundColor: "rgba(0, 0, 0, 0.1)"
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
      this.selectBody.children = [];
      const selects = new Set<Element>();
      e.stopPropagation();
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };
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
            linkEl(this.bodyControl, this.selectBody);
          }
          console.log("select:", els);
          this.selectElements = els;
          this.root.render();
          if (!this.bodyControl.isMounted && this.selectElements.length) {
            this.bodyControl.mounted();
          }
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

  el.addEventListener("mouseenter", () => {
    el.root.el.style.cursor = option.cursor!;
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
