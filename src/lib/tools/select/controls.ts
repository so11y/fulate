import {
  degreesToRadians,
  radiansToDegrees
} from "../../../util/radiansDegreesConversion";
import { Point } from "../../../util/point";
import { type Select } from "./index";
import { FulateEvent } from "../../../util/event";
import { qrDecompose } from "../../../util/matrix";

// ---------------------------------------------------------------------------
//  Interfaces
// ---------------------------------------------------------------------------

export interface SelectState {
  theta: number;
  left: number;
  top: number;
  width: number;
  height: number;
  worldCenterPoint: Point;
  angle: number;
  matrix: DOMMatrix;
}

export interface ControlPoint {
  id: string;
  cursor: string;
  shape?: "rect" | "circle";
  /** Return the control point position in the element's local coordinate space. */
  localPosition(element: any, dim: Point): Point;
  onDrag(
    select: Select,
    point: Point,
    selectState: SelectState,
    event: FulateEvent
  ): void;
  /** Called when Delete key is pressed while this control is focused. Return true if handled. */
  onDelete?(select: Select): boolean;
}

export interface EdgeDefinition {
  from: string;
  to: string;
  cursor: string;
  onDrag(
    select: Select,
    point: Point,
    selectState: SelectState,
    event: FulateEvent
  ): void;
}

export interface ControlSchema {
  controls: ControlPoint[];
  edges?: EdgeDefinition[];
  enableRotation?: boolean;
  enableBodyMove?: boolean;
  bodyHitTest?(select: Select, point: Point): boolean;
  paintFrame?(select: Select, ctx: CanvasRenderingContext2D): void;
  paintHover?(el: any, ctx: CanvasRenderingContext2D, scale: number): void;
  paintControl?(
    ctx: CanvasRenderingContext2D,
    point: Point,
    cp: ControlPoint,
    scale: number,
    angle: number
  ): void;
}

// ---------------------------------------------------------------------------
//  Default rectangle schema (4 corners + 4 edges + rotation)
// ---------------------------------------------------------------------------

export const DEFAULT_RECT_SCHEMA: ControlSchema = {
  controls: [
    {
      id: "tl",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (_el, _dim) => new Point(0, 0),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "tl");
      }
    },
    {
      id: "tr",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (_el, dim) => new Point(dim.x, 0),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "tr");
      }
    },
    {
      id: "br",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (_el, dim) => new Point(dim.x, dim.y),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "br");
      }
    },
    {
      id: "bl",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (_el, dim) => new Point(0, dim.y),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "bl");
      }
    }
  ],
  edges: [
    {
      from: "tl",
      to: "tr",
      cursor: "ns-resize",
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "mt");
      }
    },
    {
      from: "tr",
      to: "br",
      cursor: "ew-resize",
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "mr");
      }
    },
    {
      from: "br",
      to: "bl",
      cursor: "ns-resize",
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "mb");
      }
    },
    {
      from: "bl",
      to: "tl",
      cursor: "ew-resize",
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "ml");
      }
    }
  ],
  enableRotation: true,
  enableBodyMove: true
};

// ---------------------------------------------------------------------------
//  Rotate helpers
// ---------------------------------------------------------------------------

export function rotateObjectWithSnapping(
  { target, ex, ey, theta, originX, originY }: any,
  x: number,
  y: number
) {
  const pivotPoint = target.translateToGivenOrigin(
    target.getRelativeCenterPoint(),
    originX,
    originY
  );
  const lastAngle = Math.atan2(ey - pivotPoint.y, ex - pivotPoint.x),
    curAngle = Math.atan2(y - pivotPoint.y, x - pivotPoint.x);
  let angle = radiansToDegrees(curAngle - lastAngle + theta);
  if (target.snapAngle && target.snapAngle > 0) {
    const snapAngle = target.snapAngle,
      snapThreshold = target.snapThreshold || snapAngle,
      rightAngleLocked = Math.ceil(angle / snapAngle) * snapAngle,
      leftAngleLocked = Math.floor(angle / snapAngle) * snapAngle;
    if (Math.abs(angle - leftAngleLocked) < snapThreshold) {
      angle = leftAngleLocked;
    } else if (Math.abs(angle - rightAngleLocked) < snapThreshold) {
      angle = rightAngleLocked;
    }
  }
  if (angle < 0) {
    angle = 360 + angle;
  }
  angle %= 360;
  return angle;
}

export function rotateCallback(
  selectEL: Select,
  point: Point,
  { theta }: SelectState,
  event: FulateEvent
) {
  const angle = rotateObjectWithSnapping(
    {
      target: selectEL,
      ex: point.x,
      ey: point.y,
      originX: selectEL.originX,
      originY: selectEL.originY,
      theta
    },
    event.detail.x,
    event.detail.y
  );

  selectEL.setOptions({
    angle
  });
}

// ---------------------------------------------------------------------------
//  Resize helper
// ---------------------------------------------------------------------------

export function resizeObject(
  selectEL: any,
  preState: SelectState,
  event: any,
  type: string
) {
  const {
    width: pWidth,
    height: pHeight,
    matrix
  } = preState;

  let fixedLocalX = 0;
  let fixedLocalY = 0;
  if (type.includes("r")) fixedLocalX = 0;
  else if (type.includes("l")) fixedLocalX = pWidth;

  if (type.includes("b")) fixedLocalY = 0;
  else if (type.includes("t")) fixedLocalY = pHeight;

  if (type === "mr") fixedLocalY = pHeight / 2;
  if (type === "ml") fixedLocalY = pHeight / 2;
  if (type === "mt") fixedLocalX = pWidth / 2;
  if (type === "mb") fixedLocalX = pWidth / 2;

  const mouseWorld = new Point(event.detail.x, event.detail.y);
  const inverseMatrix = DOMMatrix.fromMatrix(matrix).inverse();
  const mouseLocal = mouseWorld.matrixTransform(inverseMatrix);

  let sx = 1;
  let sy = 1;

  if (type.includes("r")) sx = mouseLocal.x / pWidth;
  if (type.includes("l")) sx = (pWidth - mouseLocal.x) / pWidth;
  if (type.includes("b")) sy = mouseLocal.y / pHeight;
  if (type.includes("t")) sy = (pHeight - mouseLocal.y) / pHeight;

  if (type === "mr" || type === "ml") sy = 1;
  if (type === "mt" || type === "mb") sx = 1;

  if (event.detail?.shiftKey && !["mt", "mb", "ml", "mr"].includes(type)) {
    const ratio = Math.max(Math.abs(sx), Math.abs(sy));
    sx = Math.sign(sx) * ratio;
    sy = Math.sign(sy) * ratio;
  }

  sx = sx || 0.0001;
  sy = sy || 0.0001;

  const localScaleMatrix = new DOMMatrix()
    .translate(fixedLocalX, fixedLocalY)
    .scale(sx, sy)
    .translate(-fixedLocalX, -fixedLocalY);

  const newWorldMatrix = matrix.multiply(localScaleMatrix);

  const { angle, scaleX, scaleY, skewX } = qrDecompose(newWorldMatrix);

  const newLocalCenter = new Point(pWidth / 2, pHeight / 2).matrixTransform(
    localScaleMatrix
  );
  const newWorldCenter = newLocalCenter.matrixTransform(matrix);

  const center = selectEL.getPositionByOrigin(newWorldCenter);

  selectEL.setOptions({
    angle,
    scaleX,
    scaleY,
    skewX,
    left: center.x,
    top: center.y
  });
}
