import { describe, it, expect, vi, beforeEach } from "vitest";
import { Select } from "../../src/select/index";
import { DEFAULT_RECT_SCHEMA } from "../../src/select/controls";
import {
  createMockSelect,
  mockElement,
  mockElementWithRect,
  type MockSelect,
} from "../helpers";
import type { Element } from "@fulate/core";

let select: MockSelect;

beforeEach(() => {
  select = createMockSelect();
});

// ─── select() ────────────────────────────────────────────────

describe("select()", () => {
  const realSelect = Select.prototype.select;

  it("空数组 → width/height 设为 0", () => {
    realSelect.call(select, []);
    expect(select.setOptions).toHaveBeenCalledWith({ width: 0, height: 0 });
    expect(select.selectEls).toEqual([]);
  });

  it("清空 currentControl 和 hoverElement", () => {
    select.currentControl = { control: {}, point: {} };
    select.hoverElement = mockElement() as any;
    realSelect.call(select, []);
    expect(select.currentControl).toBeNull();
    expect(select.hoverElement).toBeNull();
  });

  it("带 geometry → 透传给 setOptions，缺省字段补默认值", () => {
    const el = mockElement() as unknown as Element;
    realSelect.call(select, [el], {
      left: 10,
      top: 20,
      width: 100,
      height: 50,
    });
    expect(select.setOptions).toHaveBeenCalledWith({
      left: 10,
      top: 20,
      width: 100,
      height: 50,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
    });
  });

  it("带 geometry + 自定义 angle/scale → 使用传入值", () => {
    const el = mockElement() as unknown as Element;
    realSelect.call(select, [el], {
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      angle: 45,
      scaleX: 2,
      scaleY: 0.5,
    });
    expect(select.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        angle: 45,
        scaleX: 2,
        scaleY: 0.5,
        skewX: 0,
        skewY: 0,
      })
    );
  });

  it("无 geometry → 用 makeBoundingBoxFromRects 计算", () => {
    const els = [
      mockElementWithRect({ left: 0, top: 0, width: 50, height: 50 }),
      mockElementWithRect({ left: 100, top: 100, width: 50, height: 50 }),
    ];
    realSelect.call(select, els as any);

    expect(select.setOptions).toHaveBeenCalled();
    const opts = (select.setOptions as any).mock.calls[0][0];
    expect(opts.left).toBe(0);
    expect(opts.top).toBe(0);
    expect(opts.width).toBe(150);
    expect(opts.height).toBe(150);
    expect(opts.angle).toBe(0);
    expect(opts.scaleX).toBe(1);
  });

  it("group 元素 → 调用 ensureBoundingBox", () => {
    const groupEl = mockElement({ type: "group" });
    (groupEl as any).ensureBoundingBox = vi.fn();
    groupEl.getBoundingRect = vi.fn().mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      centerX: 50, centerY: 50,
    });

    realSelect.call(select, [groupEl as any]);
    expect((groupEl as any).ensureBoundingBox).toHaveBeenCalled();
  });
});

// ─── canDiveIn() ─────────────────────────────────────────────

describe("canDiveIn()", () => {
  const canDiveIn = Select.prototype.canDiveIn;

  it("group 类型 → true", () => {
    expect(canDiveIn.call(select, { type: "group" } as any)).toBe(true);
  });

  it("enableDiveIn=true → true", () => {
    expect(
      canDiveIn.call(select, { type: "rect", enableDiveIn: true } as any)
    ).toBe(true);
  });

  it("普通元素 → false", () => {
    expect(canDiveIn.call(select, { type: "rect" } as any)).toBe(false);
  });

  it("enableDiveIn=false → false", () => {
    expect(
      canDiveIn.call(select, { type: "rect", enableDiveIn: false } as any)
    ).toBe(false);
  });
});

// ─── getActiveSchema() ──────────────────────────────────────

describe("getActiveSchema()", () => {
  const getActiveSchema = Select.prototype.getActiveSchema;

  it("多选 → 返回 DEFAULT_RECT_SCHEMA", () => {
    select.selectEls = [mockElement(), mockElement()] as any;
    const schema = getActiveSchema.call(select);
    expect(schema).toBe(DEFAULT_RECT_SCHEMA);
  });

  it("单选无 getControlSchema → 返回 DEFAULT_RECT_SCHEMA", () => {
    const el = mockElement();
    select.selectEls = [el as any];
    const schema = getActiveSchema.call(select);
    expect(schema).toBe(DEFAULT_RECT_SCHEMA);
  });

  it("单选有自定义 schema → 返回自定义", () => {
    const customSchema = { ...DEFAULT_RECT_SCHEMA, enableRotation: true };
    const el = mockElement();
    (el as any).getControlSchema = () => customSchema;
    select.selectEls = [el as any];
    const schema = getActiveSchema.call(select);
    expect(schema).toBe(customSchema);
  });

  it("enableRotation=false → schema.enableRotation=false", () => {
    const el = mockElement({ enableRotation: false } as any);
    select.selectEls = [el as any];
    const schema = getActiveSchema.call(select);
    expect(schema.enableRotation).toBe(false);
  });

  it("enableMove=false → schema.enableBodyMove=false", () => {
    const el = mockElement({ enableMove: false } as any);
    select.selectEls = [el as any];
    const schema = getActiveSchema.call(select);
    expect(schema.enableBodyMove).toBe(false);
  });

  it("enableResize=false → controls 和 edges 为空数组", () => {
    const el = mockElement({ enableResize: false } as any);
    select.selectEls = [el as any];
    const schema = getActiveSchema.call(select);
    expect(schema.controls).toEqual([]);
    expect(schema.edges).toEqual([]);
  });
});

// ─── delete() ────────────────────────────────────────────────

describe("delete()", () => {
  const realDelete = Select.prototype.delete;

  function setupForDelete() {
    const parent = {
      children: [] as any[],
      removeChild: vi.fn(function (this: any, child: any) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
      }),
    };
    const el = mockElement({ type: "rect" });
    (el as any).parent = parent;
    (el as any).getAffectedElements = vi.fn(() => []);
    parent.children.push(el);
    select.selectEls = [el as any];
    select.select = vi.fn();

    select.history = {
      snapshot: vi.fn(),
      commit: vi.fn(),
      pushAction: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    };

    return { el, parent };
  }

  it("无选中 → 不执行", () => {
    select.selectEls = [];
    realDelete.call(select);
    expect(select.history.snapshot).not.toHaveBeenCalled();
  });

  it("调用 history.snapshot + commit", () => {
    setupForDelete();
    realDelete.call(select);
    expect(select.history.snapshot).toHaveBeenCalled();
    expect(select.history.commit).toHaveBeenCalled();
  });

  it("元素从 parent 中移除", () => {
    const { parent } = setupForDelete();
    realDelete.call(select);
    expect(parent.removeChild).toHaveBeenCalled();
  });

  it("删除后调用 select([])", () => {
    setupForDelete();
    realDelete.call(select);
    expect(select.select).toHaveBeenCalledWith([]);
  });

  it("删除后调用 root.nextTick + root.checkHit", () => {
    setupForDelete();
    realDelete.call(select);
    expect(select.root.nextTick).toHaveBeenCalled();
    expect(select.root.checkHit).toHaveBeenCalled();
  });

  it("currentControl.onDelete 返回 true → 提前返回", () => {
    const { el } = setupForDelete();
    const onDelete = vi.fn(() => true);
    select.currentControl = { control: { onDelete }, point: {} };
    realDelete.call(select);

    expect(onDelete).toHaveBeenCalled();
    expect(select.history.snapshot).toHaveBeenCalledOnce();
    expect(select.history.commit).toHaveBeenCalledOnce();
    expect(select.select).toHaveBeenCalledWith(select.selectEls);
  });

  it("group 元素 → 其 groupEls 成员也被删除", () => {
    const member = mockElement({ type: "rect" });
    (member as any).getAffectedElements = vi.fn(() => []);
    const memberParent = {
      children: [member],
      removeChild: vi.fn(),
    };
    (member as any).parent = memberParent;

    const group = mockElement({ type: "group" });
    (group as any).groupEls = [member];
    (group as any).getAffectedElements = vi.fn(() => []);
    const groupParent = {
      children: [group],
      removeChild: vi.fn(),
    };
    (group as any).parent = groupParent;

    select.selectEls = [group as any];
    select.select = vi.fn();
    select.history = {
      snapshot: vi.fn(),
      commit: vi.fn(),
      pushAction: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    };

    realDelete.call(select);

    expect(memberParent.removeChild).toHaveBeenCalledWith(member);
    expect(groupParent.removeChild).toHaveBeenCalledWith(group);
  });

  it("forkNode → 级联删除关联 line（通过 getCascadeDeleteElements）", () => {
    const line = {
      id: "line1",
      type: "line",
      linePoints: [{}],
      getAffectedElements: vi.fn(() => []),
      getCascadeDeleteElements: vi.fn(() => []),
      parent: { children: [] as any[], removeChild: vi.fn() },
    };
    (line as any).parent.children.push(line);

    const forkNode = mockElement({ type: "forkNode" });
    (forkNode as any).getAffectedElements = vi.fn(() => []);
    (forkNode as any).getCascadeDeleteElements = vi.fn(() => [line]);
    const forkParent = { children: [forkNode], removeChild: vi.fn() };
    (forkNode as any).parent = forkParent;

    select.root.idElements.set("line1", line);

    select.selectEls = [forkNode as any];
    select.select = vi.fn();
    select.history = {
      snapshot: vi.fn(),
      commit: vi.fn(),
      pushAction: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    };

    realDelete.call(select);

    expect(line.parent.removeChild).toHaveBeenCalled();
  });
});

// ─── updateSelectFrame() ────────────────────────────────────

describe("updateSelectFrame()", () => {
  const realUpdate = Select.prototype.updateSelectFrame;

  it("将 options assign 到 this 并 markNeedsLayout", () => {
    realUpdate.call(select, { left: 99, top: 88 });
    expect(select.left).toBe(99);
    expect(select.top).toBe(88);
    expect(select.markNeedsLayout).toHaveBeenCalled();
  });
});
