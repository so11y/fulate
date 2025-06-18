import { Point } from "../base";

export class MatrixBase extends EventTarget {
  setDirty() {}

  matrixState = {
    layout: new Proxy(
      { x: 0, y: 0 },
      {
        set: (target, key, value) => {
          target[key] = value;
          this.setDirty();
          return true;
        }
      }
    ),
    matrix: new DOMMatrix()
  };

  getCurrentAngle() {
    return (
      Math.atan2(this.matrixState.matrix.b, this.matrixState.matrix.a) *
      (180 / Math.PI)
    );
  }

  globalToLocal(x: number, y: number) {
    const inverseMatrix = this.matrixState.matrix.inverse();
    const point = new DOMPoint(x, y);
    const localPoint = point.matrixTransform(inverseMatrix);
    return { x: localPoint.x, y: localPoint.y };
  }

  getWordPoint(): Point {
    const localPoint = new DOMPoint(0, 0);
    const globalPoint = localPoint.matrixTransform(this.matrixState.matrix);
    return {
      x: globalPoint.x,
      y: globalPoint.y
    };
  }
}
