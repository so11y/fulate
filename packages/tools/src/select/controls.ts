import { radiansToDegrees, Point, transformPoint } from "@fulate/util";
import { type Select } from "./index";
import { FulateEvent } from "@fulate/core";

// ---------------------------------------------------------------------------
//  Interfaces
// ---------------------------------------------------------------------------

export interface ElementSnapshot {
  el: any;
  matrix: DOMMatrix;
  worldCenterPoint: Point;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

export interface SelectState {
  theta: number;
  left: number;
  top: number;
  width: number;
  height: number;
  worldCenterPoint: Point;
  angle: number;
  matrix: DOMMatrix;
  snapshots: ElementSnapshot[];
}

export interface ControlPoint {
  id: string;
  cursor: string;
  shape?: "rect" | "circle";
  /** Return the control point position in the element's local coordinate space. */
  localPosition(select: Select, element: any): Point;
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
  onDragStart?(select: Select, control: ControlPoint): void;
  onDragEnd?(select: Select, control: ControlPoint): void | Promise<void>;
  getSnapExcludes?(select: Select): {
    excludePoints?: { element: any; indices: number[] }[];
    excludeElements?: any[];
    disableSnap?: boolean;
  };
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
  getSnapExcludes(select) {
    if (select.selectEls.length !== 1) return {};
    const el = select.selectEls[0];
    if (!el.connectedLines?.size) return {};
    const excludePoints: { element: any; indices: number[] }[] = [];
    for (const lineId of el.connectedLines) {
      const line = el.root?.idElements.get(lineId) as any;
      if (!line?.linePoints) continue;
      const indices: number[] = [];
      for (let i = 0; i < line.linePoints.length; i++) {
        if (line.linePoints[i].anchor?.elementId === el.id) indices.push(i);
      }
      if (indices.length > 0) excludePoints.push({ element: line, indices });
    }
    return excludePoints.length > 0 ? { excludePoints } : {};
  },
  controls: [
    {
      id: "tl",
      cursor: "crosshair",
      shape: "rect",
      localPosition: () => new Point(0, 0),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "tl");
      }
    },
    {
      id: "tr",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (select) => new Point(select.width, 0),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "tr");
      }
    },
    {
      id: "br",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (select) => new Point(select.width, select.height),
      onDrag(select, _point, state, event) {
        resizeObject(select, state, event, "br");
      }
    },
    {
      id: "bl",
      cursor: "crosshair",
      shape: "rect",
      localPosition: (select) => new Point(0, select.height),
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
  const pivotPoint = target.getPositionByOrigin(
    target.getRelativeCenterPoint(),
    originX,
    originY,
    target.originX,
    target.originY
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
  state: SelectState,
  event: FulateEvent
) {
  const angle = rotateObjectWithSnapping(
    {
      target: selectEL,
      ex: point.x,
      ey: point.y,
      originX: selectEL.originX,
      originY: selectEL.originY,
      theta: state.theta
    },
    event.detail.x,
    event.detail.y
  );

  const { matrix, snapshots } = state;
  const deltaAngle = angle - state.angle;

  const cx = state.worldCenterPoint.x;
  const cy = state.worldCenterPoint.y;
  const deltaMatrix = new DOMMatrix()
    .translate(cx, cy)
    .rotate(0, 0, deltaAngle)
    .translate(-cx, -cy);

  for (const snap of snapshots) {
    const {
      el, matrix: elMatrix, worldCenterPoint,
      width: snapW, height: snapH, scaleX: snapSX, scaleY: snapSY
    } = snap;

    const targetMatrix = deltaMatrix.multiply(elMatrix);
    const worldCenter = transformPoint(deltaMatrix, worldCenterPoint);
    el.applyTransformMatrix(targetMatrix, worldCenter, {
      width: snapW, height: snapH, scaleX: snapSX, scaleY: snapSY
    });
  }

  selectEL.updateSelectFrame({ angle });
}

// ---------------------------------------------------------------------------
//  Resize helper
// ---------------------------------------------------------------------------

function computeResizeScale(
  preState: SelectState,
  event: any,
  type: string
) {
  const { width: pWidth, height: pHeight, matrix } = preState;

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
  const mouseLocal = transformPoint(inverseMatrix, mouseWorld);

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

  return { sx, sy, fixedLocalX, fixedLocalY };
}

export function resizeObject(
  selectEL: any,
  preState: SelectState,
  event: any,
  type: string
) {
  const { width: pWidth, height: pHeight, matrix, snapshots } = preState;
  const { sx, sy, fixedLocalX, fixedLocalY } = computeResizeScale(
    preState,
    event,
    type
  );

  const localScaleMatrix = new DOMMatrix()
    .translate(fixedLocalX, fixedLocalY)
    .scale(sx, sy)
    .translate(-fixedLocalX, -fixedLocalY);

  const newSelectWorldMatrix = matrix.multiply(localScaleMatrix);
  const matrixInv = DOMMatrix.fromMatrix(matrix).inverse();
  const deltaMatrix = newSelectWorldMatrix.multiply(matrixInv);

  for (const snap of snapshots) {
    const {
      el, matrix: elMatrix, worldCenterPoint,
      width: snapW, height: snapH, scaleX: snapSX, scaleY: snapSY
    } = snap;

    const targetMatrix = deltaMatrix.multiply(elMatrix);
    const worldCenter = transformPoint(deltaMatrix, worldCenterPoint);
    el.applyTransformMatrix(targetMatrix, worldCenter, {
      width: snapW, height: snapH, scaleX: snapSX, scaleY: snapSY
    });
  }

  const newLocalCenter = transformPoint(localScaleMatrix, new Point(pWidth / 2, pHeight / 2));
  const newWorldCenter = transformPoint(matrix, newLocalCenter);
  const newW = pWidth * Math.abs(sx);
  const newH = pHeight * Math.abs(sy);

  selectEL.updateSelectFrame({
    width: newW,
    height: newH,
    left: newWorldCenter.x - newW / 2,
    top: newWorldCenter.y - newH / 2
  });
}
