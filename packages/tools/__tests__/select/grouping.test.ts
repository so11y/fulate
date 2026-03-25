import { describe, it, expect, vi, beforeEach } from "vitest";
import { doGroup, unGroup } from "../../src/select/grouping";
import {
  createMockSelect,
  mockElement,
  type MockSelect,
} from "../helpers";
import type { Element } from "@fulate/core";

let select: MockSelect;

function makeDOMPointLike(x: number, y: number) {
  return {
    x,
    y,
    z: 0,
    w: 1,
    matrixTransform(m: DOMMatrix) {
      const res = m.transformPoint({ x, y, z: 0, w: 1 });
      return makeDOMPointLike(res.x, res.y);
    },
  };
}

function makeGroupableElement(left: number) {
  const el = mockElement({ left, top: 0, width: 40, height: 40 });
  const cx = left + 20;
  const cy = 20;
  el.getWorldCenterPoint = vi.fn(() => makeDOMPointLike(cx, cy));
  el.getOwnMatrix = vi.fn(() => new DOMMatrix().translate(left, 0));
  el.calcWorldMatrix = vi.fn(() => el.getOwnMatrix());
  (el as any).snapshotForGroup = vi.fn();
  (el as any)._provides = {};
  (el as any).provide = function (key: string, val: any) {
    this._provides[key] = val;
  };
  return el;
}

function setupWithEls(count: number) {
  const els = Array.from({ length: count }, (_, i) =>
    makeGroupableElement(i * 50)
  );
  const parent = {
    children: [...els],
    append: vi.fn(function (this: any, child: any) {
      this.children.push(child);
      child.parent = this;
    }),
    removeChild: vi.fn(function (this: any, child: any) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    }),
    insertBefore: vi.fn(function (this: any, child: any, ref: any) {
      const idx = this.children.indexOf(ref);
      if (idx >= 0) this.children.splice(idx, 0, child);
      else this.children.push(child);
      child.parent = this;
    }),
  };

  els.forEach((el) => {
    (el as any).parent = parent;
  });

  select = createMockSelect({
    selectEls: els as unknown as Element[],
    left: 0,
    top: 0,
    width: 200,
    height: 40,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
  });

  return { els, parent };
}

describe("doGroup", () => {
  it("少于 2 个元素 → 返回 null 不操作", () => {
    select = createMockSelect({ selectEls: [mockElement() as any] });
    const result = doGroup(select as any);
    expect(result).toBeNull();
    expect(select.history.pushAction).not.toHaveBeenCalled();
  });

  it("首元素无 parent → 返回 null", () => {
    const els = [mockElement(), mockElement()];
    select = createMockSelect({ selectEls: els as any });
    (els[0] as any).parent = undefined;
    const result = doGroup(select as any);
    expect(result).toBeNull();
  });

  it("创建 Group 并 append 到 parent", () => {
    const { parent } = setupWithEls(3);
    doGroup(select as any);

    expect(parent.append).toHaveBeenCalled();
    const appendedGroup = parent.append.mock.calls[0][0];
    expect(appendedGroup.type).toBe("group");
  });

  it("Group 的 groupEls 包含所有选中元素", () => {
    const { parent } = setupWithEls(3);
    doGroup(select as any);

    const group = parent.append.mock.calls[0][0];
    expect(group.groupEls).toHaveLength(3);
  });

  it("每个子元素设置 groupParent 和 provide('group')", () => {
    const { els } = setupWithEls(2);
    doGroup(select as any);

    for (const el of els) {
      expect((el as any).groupParent).toBeTruthy();
      expect((el as any)._provides.group).toBeTruthy();
    }
  });

  it("调用 select.select([group])", () => {
    setupWithEls(2);
    doGroup(select as any);
    expect(select.select).toHaveBeenCalled();
    const args = (select.select as any).mock.calls[0][0];
    expect(args).toHaveLength(1);
    expect(args[0].type).toBe("group");
  });

  it("pushAction 被调用", () => {
    setupWithEls(2);
    doGroup(select as any);
    expect(select.history.pushAction).toHaveBeenCalledOnce();
  });

  it("undo 回调：清除 groupParent、移除 group、恢复选区", () => {
    const { els } = setupWithEls(2);
    doGroup(select as any);

    const [undoFn] = (select.history.pushAction as any).mock.calls[0];
    undoFn();

    for (const el of els) {
      expect((el as any).groupParent).toBeNull();
      expect((el as any)._provides.group).toBeUndefined();
    }
    expect(select.root.nextTick).toHaveBeenCalled();
  });

  it("redo 回调：重新设置 groupEls 和 groupParent", () => {
    const { els, parent } = setupWithEls(2);
    doGroup(select as any);

    const [undoFn, redoFn] = (select.history.pushAction as any).mock.calls[0];
    undoFn();
    parent.append.mockClear();
    redoFn();

    expect(parent.append).toHaveBeenCalled();
    for (const el of els) {
      expect((el as any).groupParent).toBeTruthy();
    }
  });
});

describe("unGroup", () => {
  function setupGrouped() {
    const { els, parent } = setupWithEls(2);
    doGroup(select as any);

    const group = parent.append.mock.calls[0][0];
    group.parent = parent;
    parent.children.push(group);

    select = createMockSelect({
      selectEls: [group],
    });
    select.root.nextTick.mockImplementation((fn: () => void) => fn());

    return { group, els, parent };
  }

  it("非单选或非 group → 不执行", () => {
    select = createMockSelect({ selectEls: [] });
    unGroup(select as any);
    expect(select.history.pushAction).not.toHaveBeenCalled();

    const el = mockElement({ type: "rect" });
    select = createMockSelect({ selectEls: [el as any] });
    unGroup(select as any);
    expect(select.history.pushAction).not.toHaveBeenCalled();
  });

  it("清除子元素的 groupParent 和 group provide", () => {
    const { els } = setupGrouped();
    unGroup(select as any);

    for (const el of els) {
      expect((el as any).groupParent).toBeNull();
      expect((el as any)._provides.group).toBeUndefined();
    }
  });

  it("从 parent 移除 group", () => {
    const { parent } = setupGrouped();
    unGroup(select as any);
    expect(parent.removeChild).toHaveBeenCalled();
  });

  it("调用 select.select(children)", () => {
    const { els } = setupGrouped();
    unGroup(select as any);
    expect(select.select).toHaveBeenCalled();
  });

  it("pushAction 被调用", () => {
    setupGrouped();
    unGroup(select as any);
    expect(select.history.pushAction).toHaveBeenCalledOnce();
  });

  it("undo 回调：重新组合 + 还原 group 到 parent", () => {
    const { els, parent } = setupGrouped();
    unGroup(select as any);

    const [undoFn] = (select.history.pushAction as any).mock.calls[0];
    parent.append.mockClear();
    undoFn();

    for (const el of els) {
      expect((el as any).groupParent).toBeTruthy();
    }
  });
});
