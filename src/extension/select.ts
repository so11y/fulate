import { Drag } from ".";
// import { Group, Row } from "../lib";
import { element, Element, ElementOptions, Point } from "../lib/base";
import { Column } from "../lib/column";
import { Rect } from "../lib/types";
import {
  calculateElementBounds,
  calculateRotationAngle,
  createVector,
  isOverlap,
  mergeTwoRects
} from "../lib/utils/calc";
import { UserCanvasEvent } from "../lib/utils/eventManage";
import { first, isNil } from "lodash-es";

export class Select extends Element {
  type = "select";
  selectElements: Element[] = [];
  selectBody: Element;
  bodyControl: Element;
  lastRotate?: number;
  selectStatus: Array<{
    element: Element;
    preRotate: number;
    center: Point;
  }> = [];

  constructor() {
    super({
      key: "select"
    });
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
      this.lastRotate = undefined;
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
          // this.selectElements.forEach((v) => {
          //   v.setDirty();
          // });
          this.root.render();
          // 获取旋转中心点
          const center = this.getGlobalCenter();
          console.log(center, "---");
          // 保存初始旋转状态
          // this.selectStatus = this.selectElements.map((v) => ({
          //   element: v,
          //   preRotate: v.rotate || 0,
          //   center: v.globalToLocal(center.x, center.y)
          // }));
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
    console.log(111);

    const select = el.root.getElementByKey("select") as Select;
    const startDownPoint = {
      x: e.detail.x,
      y: e.detail.y
    };

    // 获取旋转中心点
    const center = select.getGlobalCenter();

    // // 保存初始旋转状态
    const selectSelect = select.selectElements.map((v) => ({
      element: v,
      preRotate: v.rotate || 0,
      center: v.globalToLocal(center.x, center.y)
    }));

    // 创建初始参考向量（垂直向上）
    const initialVector: [number, number] = [0, -1];

    // 计算初始向量（从中心点到鼠标位置）
    const initialMouseVector = createVector(center, startDownPoint);
    let initialAngle = calculateRotationAngle(
      initialVector,
      initialMouseVector
    );
    const lastRotate = select.lastRotate ?? 0;

    // 指针移动处理函数
    const pointermove = (e: UserCanvasEvent) => {
      // 计算当前鼠标向量
      const currentMouseVector = createVector(center, {
        x: e.detail.x,
        y: e.detail.y
      });

      // 计算当前角度
      const currentAngle = calculateRotationAngle(
        initialVector,
        currentMouseVector
      );

      // 计算旋转增量
      // const deltaAngle = currentAngle;
      let deltaAngle = currentAngle - initialAngle + lastRotate;

      console.log(currentAngle, "---", initialAngle);

      // 应用旋转到每个元素
      selectSelect.forEach(({ element, preRotate, center }) => {
        // const localCenter = element.globalToLocal(center.x, center.y);
        console.log("---", center, "---");
        element.setRotate(deltaAngle + preRotate, center, false);
      });
      select.lastRotate = deltaAngle;
      // 更新选择框旋转
      select.setRotate(deltaAngle, undefined, false);
      select.root.render();
    };

    // 添加事件监听
    el.addEventListener("pointermove", pointermove);

    // 清理函数
    const cleanup = () => {
      el.removeEventListener("pointermove", pointermove);
    };

    el.addEventListener("pointerup", cleanup, { once: true });
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
