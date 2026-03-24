import { BaseElementOption, Element } from "@fulate/core";
import { Point } from "@fulate/util";
import { makeBoundingBoxFromPoints, qrDecompose } from "@fulate/util";

export interface GroupOption extends BaseElementOption {
  /** 导入时用：通过 root.idElements 查找并还原 groupEls */
  groupElIds?: string[];
}

export class Group extends Element {
  type = "group";
  private _groupEls: Element[] = [];
  _boundingBoxDirty = false;
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

  markBoundingBoxDirty() {
    this._boundingBoxDirty = true;
  }

  ensureBoundingBox() {
    if (this._boundingBoxDirty) {
      this.updateBoundingBox();
    }
  }

  updateBoundingBox() {
    this._boundingBoxDirty = false;
    if (!this.groupEls.length) return;
    this.groupEls.forEach((v) => v.calcWorldMatrix());
    const allPoints = this.groupEls.map((v) => v.setCoords().getCoords()).flat(1);
    const { left, top, width, height } = makeBoundingBoxFromPoints(allPoints);
    Object.assign(this, {
      left, top, width, height,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    });
    this.markNeedsLayout();
    this.snapshotChildren();
  }

  applyGroupTransform(
    targetMatrix: DOMMatrix,
    localCenter: Point,
    groupWorldMatrix: DOMMatrix
  ): void {
    const worldCenter = new Point(localCenter.matrixTransform(groupWorldMatrix));
    this.applyTransformMatrix(targetMatrix, worldCenter);
  }

  applyTransformMatrix(
    targetMatrix: DOMMatrix,
    worldCenter: Point,
    snap?: { width: number; height: number; scaleX: number; scaleY: number }
  ): void {
    const s = snap ?? (this as any)._groupSnapshot;
    if (!s) return;

    const { angle, scaleX, scaleY, skewX } = qrDecompose(targetMatrix);
    const pos = this.getPositionByOrigin(worldCenter);

    this.setOptions({
      angle,
      scaleX,
      scaleY,
      skewX,
      left: pos.x,
      top: pos.y
    });
  }

  paint(ctx?: CanvasRenderingContext2D): void {
    return;
  }

  toJson(includeChildren = false): BaseElementOption {
    const json = super.toJson(includeChildren) as any;
    if (includeChildren && this.groupEls.length) {
      const layers = this.root?.layers;
      json.children = this.groupEls.map((el) => {
        const childJson = el.toJson(true) as any;
        if (layers) {
          childJson._layerIndex = layers.indexOf(el.layer as any);
        }
        return childJson;
      });
    }
    if (this.groupEls.length) {
      json.groupElIds = this.groupEls.map((el) => el.id);
    }
    return json;
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
