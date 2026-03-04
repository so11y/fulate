import { BaseElementOption, Element } from "../node/element";
import { makeBoundingBoxFromPoints, Point } from "../../util/point";
import { qrDecompose } from "../../util/math";

export interface GroupOption extends BaseElementOption { }

export class Group extends Element {
  type = "group";
  groupEls: Element[] = [];
  private _childrenSnapshots: Map<
    Element,
    { localMatrix: DOMMatrix; localCenter: Point }
  > = new Map();


  updateBoundingBox() {
    if (!this.groupEls.length) return;
    const allPoints = this.groupEls.map((v) => v.getCoords()).flat(1);
    const rect = makeBoundingBoxFromPoints(allPoints);
    Object.assign(this, rect);
    this.markDirty();
    this.snapshotChildren();
  }

  paint(ctx?: CanvasRenderingContext2D): void {
    return
  }

  snapshotChildren() {
    this.calcWorldMatrix(); // Ensure group's world matrix is computed
    const groupWorldInv = DOMMatrix.fromMatrix(this.getOwnMatrix()).inverse();

    this.groupEls.forEach((child) => {
      child.calcWorldMatrix();
      this._childrenSnapshots.set(child, {
        localMatrix: groupWorldInv.multiply(child.getOwnMatrix()),
        localCenter: new Point(child.getWorldCenterPoint().matrixTransform(groupWorldInv))
      });
    });
  }

  setOptions(options?: BaseElementOption, syncCalc = false) {
    const res = super.setOptions(options, syncCalc);
    this._applyTransformToChildren();
    return res;
  }

  quickSetOptions(options: BaseElementOption) {
    const res = super.quickSetOptions(options);
    this._applyTransformToChildren();
    return res;
  }

  private _applyTransformToChildren() {
    if (!this.groupEls?.length) return;
    const groupWorldMatrix = DOMMatrix.fromMatrix(this.calcWorldMatrix());

    this.groupEls.forEach((child) => {
      const snapshot = this._childrenSnapshots.get(child);
      if (!snapshot) return;

      const { localMatrix, localCenter } = snapshot;

      const targetMatrix = groupWorldMatrix.multiply(localMatrix);
      const { angle, scaleX, scaleY, skewX } = qrDecompose(targetMatrix);

      const newWorldCenter = localCenter.matrixTransform(groupWorldMatrix);
      const center = child.getPositionByOrigin(newWorldCenter);


      child.quickSetOptions({
        angle,
        scaleX,
        scaleY,
        skewX,
        left: center.x,
        top: center.y
      });
    });
  }

  hasInView() {
    return !!(this.visible && this.width && this.height);
  }
}

