import { makeBoundingBoxFromPoints } from "@fulate/util";
import { Group } from "@fulate/ui";
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
  children.forEach((el) => {
    el.groupParent = group;
    el.provide("group", group);
  });

  parent.append(group);
  group.snapshotChildren();

  select.selectEls = [group as any];
  select.snapshotChildren();

  select.history.pushAction(
    () => {
      children.forEach((el) => {
        el.groupParent = null;
        delete el._provides.group;
      });
      group.parent?.removeChild(group as any);
      select.root.nextTick(() => select.select(children));
    },
    () => {
      group.groupEls = children;
      children.forEach((el) => {
        el.groupParent = group;
        el.provide("group", group);
      });
      parent.append(group);
      group.snapshotChildren();
      select.root.nextTick(() => select.select([group as any]));
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

  children.forEach((el) => {
    el.groupParent = null;
    delete el._provides.group;
  });
  select.selectEls = children as any;

  if (groupParent) {
    groupParent.removeChild(group as any);
  }

  const { left, top, width, height } = makeBoundingBoxFromPoints(
    select.selectEls.map((v) => v.getCoords()).flat(1)
  );
  select.setOptions({
    left,
    top,
    width,
    height,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0
  });
  select.snapshotChildren();

  select.history.pushAction(
    () => {
      group.groupEls = children;
      children.forEach((el) => {
        el.groupParent = group;
        el.provide("group", group);
      });
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
      select.root.nextTick(() => select.select([group as any]));
    },
    () => {
      children.forEach((el) => {
        el.groupParent = null;
        delete el._provides.group;
      });
      if (group.parent) {
        group.parent.removeChild(group as any);
      }
      select.root.nextTick(() => select.select(children));
    }
  );
}
