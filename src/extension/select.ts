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
import { Size } from "../lib/utils/constraint";
import { UserCanvasEvent } from "../lib/utils/eventManage";

export class Select extends Element {
  type = "select";
  selectElements: Element[] = [];
  selectBody: Element;
  bodyControl: Element[];
  lastRotate?: number;
  selectStatus: Array<{
    element: Element;
    preRotate: number;
    size: Size;
    x: number;
    y: number;
  }> = [];

  constructor() {
    super({
      key: "select"
    });
    this.bodyControl = [
      grabbing(),
      resize("top-left", {
        x: -2,
        y: -2
      }),
      resize("top-right", {
        right: 0,
        top: 0,
        x: 2,
        y: -2
      }),
      resize("bottom-left", {
        left: 0,
        bottom: 0,
        x: -2,
        y: 2
      }),
      resize("bottom-right", {
        right: 0,
        bottom: 0,
        x: 2,
        y: 2
      })
    ];
    this.selectBody = new Element({
      width: 0,
      height: 0,
      overflow: "hidden",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      position: "relative",
      children: this.bodyControl
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
      this.selectBody.children = [];
      const selects = new Set<Element>();
      e.stopPropagation();
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };
      this.rotate = 0;
      this.setRectSize({
        x: 0,
        y: 0,
        width: 0,
        height: 0
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
        this.setRectSize(rect);
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
          const els = Array.from(selects);
          if (selects.size === 0) {
            this.setRectSize({
              x: 0,
              y: 0,
              width: 0,
              height: 0
            });
          } else if (selects.size >= 1) {
            this.calcRectSize(els);
            this.selectBody.children = this.bodyControl;
          }
          this.selectBody.overflow = els.length ? "visible" : "hidden";
          this.selectElements = els;
          this.root.render();

          // 获取旋转中心点
          const center = this.getGlobalCenter();

          // 保存初始旋转状态
          this.selectStatus = this.selectElements.map((v) => {
            v.setOrigin(center);
            return {
              element: v,
              preRotate: v.rotate || 0,
              size: v.size,
              x: v.x,
              y: v.y
            };
          });

          // this.root.render();
          this.root.removeEventListener("pointermove", pointermove);
        },
        {
          once: true
        }
      );
    };

    this.root.addEventListener("pointerdown", pointerdown);
  }

  calcRectSize(els: Array<Element>) {
    const rects = els.map((v) => v.getBoundingBox());
    if (els.length === 1) {
      this.setRectSize(rects[0]);
      return;
    }
    const rect = rects.reduce((prev, next) => mergeTwoRects(prev, next));
    this.setRectSize(rect);
  }

  setRectSize = (rect: Rect) => {
    this.setOption({
      x: rect.x, // - 4,
      y: rect.y // - 4
    });
    this.selectBody.setOption({
      width: rect.width, //+ 8,
      height: rect.height // + 8
    });
  };
}

function grabbing() {
  const el = new Element({
    width: 10,
    height: 10,
    left: 50, //50%
    x: -2,
    y: -50,
    position: "absolute",
    backgroundColor: "red",
    radius: 10
  });

  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const select = el.root.getElementByKey("select") as Select;
    const startDownPoint = {
      x: e.detail.x,
      y: e.detail.y
    };

    // 获取旋转中心点
    const center = select.getGlobalCenter();

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
      let deltaAngle = normalizeAngle(currentAngle - initialAngle + lastRotate);

      // 应用旋转到每个元素
      select.selectStatus.forEach((item) => {
        const { element, preRotate } = item;
        element.setRotate(
          normalizeAngle(deltaAngle + preRotate),
          undefined,
          false
        );
      });
      select.lastRotate = deltaAngle;
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

function resize(position: string, options: ElementOptions) {
  const el = new Element({
    width: 5,
    height: 5,
    position: "absolute",
    backgroundColor: "red",
    cursor: options.cursor,
    radius: 2,
    ...options
  });

  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const select = el.root.getElementByKey("select") as Select;
    const startDownPoint = {
      x: e.detail.x,
      y: e.detail.y
    };

    const initialWidth = select.size.width;
    const initialHeight = select.size.height;
    const { x: initialLeft, y: initialTop } = select.getLocalPoint();

    const initialRotateCenter = select.rotateCenter
      ? { ...select.rotateCenter }
      : select.getLocalCenter();

    const initialElements = select.selectStatus.map((item) => {
      const relativeX = (item.x - initialLeft) / initialWidth;
      const relativeY = (item.y - initialTop) / initialHeight;

      return {
        element: item.element,
        x: item.x,
        y: item.y,
        width: item.size.width,
        height: item.size.height,
        relativeX,
        relativeY,
        rotateCenter: item.element.rotateCenter
          ? { ...item.element.rotateCenter }
          : item.element.getLocalCenter()
      };
    });

    const pointermove = (e: UserCanvasEvent) => {
      const currentPoint = {
        x: e.detail.x,
        y: e.detail.y
      };

      const inverseMatrix = select.matrixState.matrix.inverse();
      const localCurrentPoint = new DOMPoint(
        currentPoint.x,
        currentPoint.y
      ).matrixTransform(inverseMatrix);
      const localStartPoint = new DOMPoint(
        startDownPoint.x,
        startDownPoint.y
      ).matrixTransform(inverseMatrix);

      const deltaX = localCurrentPoint.x - localStartPoint.x;
      const deltaY = localCurrentPoint.y - localStartPoint.y;

      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newLeft = initialLeft;
      let newTop = initialTop;

      switch (position) {
        case "top-left":
          newWidth = initialWidth - deltaX;
          newHeight = initialHeight - deltaY;
          newLeft = initialLeft + deltaX;
          newTop = initialTop + deltaY;
          break;
        case "top":
          newHeight = initialHeight - deltaY;
          newTop = initialTop + deltaY;
          break;
        case "top-right":
          newWidth = initialWidth + deltaX;
          newHeight = initialHeight - deltaY;
          newTop = initialTop + deltaY;
          break;
        case "right":
          newWidth = initialWidth + deltaX;
          break;
        case "bottom-right":
          newWidth = initialWidth + deltaX;
          newHeight = initialHeight + deltaY;
          break;
        case "bottom":
          newHeight = initialHeight + deltaY;
          break;
        case "bottom-left":
          newWidth = initialWidth - deltaX;
          newHeight = initialHeight + deltaY;
          newLeft = initialLeft + deltaX;
          break;
        case "left":
          newWidth = initialWidth - deltaX;
          newLeft = initialLeft + deltaX;
          break;
      }

      newWidth = Math.max(newWidth, 1);
      newHeight = Math.max(newHeight, 1);
      if (newWidth === 1 || newHeight === 1) return;

      const scaleX = newWidth / initialWidth;
      const scaleY = newHeight / initialHeight;

      if (select.rotateCenter) {
        select.rotateCenter = {
          x: initialRotateCenter.x * scaleX,
          y: initialRotateCenter.y * scaleY
        };
      }

      initialElements.forEach(
        ({ element, width, height, relativeX, relativeY, rotateCenter }) => {
          element.x = newLeft + relativeX * newWidth;
          element.y = newTop + relativeY * newHeight;

          element.width = width * scaleX;
          element.height = height * scaleY;

          if (element.rotateCenter) {
            element.rotateCenter = {
              x: rotateCenter.x * scaleX,
              y: rotateCenter.y * scaleY
            };
          }

          element.setDirty();
        }
      );

      select.x = newLeft;
      select.y = newTop;
      select.selectBody.width = newWidth;
      select.selectBody.height = newHeight;
      select.selectBody.setDirty();
      select.setDirty();
      select.root.render();
    };

    el.addEventListener("pointermove", pointermove);

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

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

export function select() {
  return new Select();
}
