import { makeBoundingBoxFromPoints } from "../../../util/point";
import { Group } from "../../ui/group";
import type { Select } from "./index";

export function doGroup(select: Select) {
  if (select.selectEls.length <= 1) return null;

  const firstEl = select.selectEls[0];
  const parent = firstEl.parent;
  if (!parent) return null;

  const group = new Group({
    left: select.left,
    top: select.top,
    width: select.width,
    height: select.height,
    angle: select.angle,
    scaleX: select.scaleX,
    scaleY: select.scaleY,
    skewX: select.skewX,
    skewY: select.skewY,
    originX: "center",
    originY: "center"
  });

  const children = [...select.selectEls];
  group.groupEls = children;
  children.forEach((el) => (el.groupParent = group));

  parent.append(group);
  group.snapshotChildren();

  select.selectEls = [group as any];
  select.snapshotChildren();

  select.root.history.pushAction(
    () => {
      children.forEach((el) => (el.groupParent = null));
      group.parent?.removeChild(group as any);
      select.select(children);
      select.root.requestRender();
    },
    () => {
      group.groupEls = children;
      children.forEach((el) => (el.groupParent = group));
      parent.append(group);
      group.snapshotChildren();
      select.select([group as any]);
      select.root.requestRender();
    }
  );
}

export function unGroup(select: Select) {
  if (select.selectEls.length !== 1 || select.selectEls[0].type !== "group") {
    return;
  }

  const group = select.selectEls[0] as Group;
  const groupParent = group.parent;
  const groupIndex = groupParent?.children
    ? groupParent.children.indexOf(group as any)
    : -1;
  const children = [...group.groupEls];

  children.forEach((el) => (el.groupParent = null));
  select.selectEls = children as any;

  if (groupParent) {
    groupParent.removeChild(group as any);
  }

  const rect = makeBoundingBoxFromPoints(
    select.selectEls.map((v) => v.getCoords()).flat(1)
  );
  select.setOptions({
    ...rect,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0
  });
  select.snapshotChildren();

  select.root.history.pushAction(
    () => {
      group.groupEls = children;
      children.forEach((el) => (el.groupParent = group));
      if (groupParent) {
        if (groupIndex >= 0 && groupIndex < groupParent.children.length) {
          groupParent.insertBefore(
            group as any,
            groupParent.children[groupIndex]
          );
        } else {
          groupParent.append(group);
        }
      }
      group.snapshotChildren();
      select.select([group as any]);
      select.root.requestRender();
    },
    () => {
      children.forEach((el) => (el.groupParent = null));
      if (group.parent) {
        group.parent.removeChild(group as any);
      }
      select.select(children);
      select.root.requestRender();
    }
  );
}
