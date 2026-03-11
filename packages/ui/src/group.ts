import { BaseElementOption, Element } from "@fulate/core";
import { Point } from "@fulate/util";
import { makeBoundingBoxFromPoints } from "@fulate/util";

export interface GroupOption extends BaseElementOption {
  /** 导入时用：通过 root.idElements 查找并还原 groupEls */
  groupElIds?: string[];
}

export class Group extends Element {
  type = "group";
  private _groupEls: Element[] = [];
  get groupEls(): Element[] {
    return this._groupEls;
  }
  set groupEls(els: Element[]) {
    this._groupEls = els;
    this._childrenSnapshots.clear();
  }
  private _childrenSnapshots: Map<
    Element,
    { localMatrix: DOMMatrix; localCenter: Point }
  > = new Map();

  updateBoundingBox() {
    if (!this.groupEls.length) return;
    const allPoints = this.groupEls.map((v) => v.getCoords()).flat(1);
    const { left, top, width, height } = makeBoundingBoxFromPoints(allPoints);
    Object.assign(this, { left, top, width, height });
    this.markDirty();
    this.snapshotChildren();
  }

  paint(ctx?: CanvasRenderingContext2D): void {
    return;
  }

  snapshotChildren() {
    this.calcWorldMatrix(); // Ensure group's world matrix is computed
    const groupWorldInv = DOMMatrix.fromMatrix(this.getOwnMatrix()).inverse();

    this.groupEls.forEach((child) => {
      child.calcWorldMatrix();
      child.snapshotForGroup();
      this._childrenSnapshots.set(child, {
        localMatrix: groupWorldInv.multiply(child.getOwnMatrix()),
        localCenter: new Point(
          child.getWorldCenterPoint().matrixTransform(groupWorldInv)
        )
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
      child.applyGroupTransform(targetMatrix, localCenter, groupWorldMatrix);
    });
  }

  hasInView() {
    return !!(this.visible && this.width && this.height);
  }

  mounted() {
    super.mounted();
    const groupElIds = (this as any).groupElIds as string[] | undefined;
    if (groupElIds?.length && this.root?.idElements) {
      setTimeout(() => {
        const els = groupElIds
          .map((id) => this.root.idElements.get(id))
          .filter(Boolean) as Element[];
        if (els.length) {
          this.groupEls = els;
          els.forEach((el) => (el.groupParent = this));
          this.snapshotChildren();
        }
        delete (this as any).groupElIds;
      });
    }
  }
}
