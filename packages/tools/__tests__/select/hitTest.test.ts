import { describe, it, expect, vi } from "vitest";
import { Point } from "@fulate/util";
import { selectHitTest } from "../../src/select/hitTest";
import { DEFAULT_RECT_SCHEMA } from "../../src/select/controls";
import { createMockSelect } from "../helpers";
import type { MockSelect } from "../helpers";

function setup(overrides: Partial<MockSelect> = {}) {
  const select = createMockSelect({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    selectEls: [{ id: "el1" } as any],
    ...overrides,
  });

  const schema = DEFAULT_RECT_SCHEMA;
  select.getActiveSchema.mockReturnValue(schema);

  const coords = schema.controls.map((cp) =>
    cp.localPosition(select as any, null)
  );
  select.getControlCoords.mockReturnValue(coords);
  select.controlCoords = coords;

  return { select, schema, coords };
}

describe("selectHitTest", () => {
  // ─── 前置条件 ─────────────────────────────────────────────

  it("无选中元素 → false", () => {
    const select = createMockSelect({ selectEls: [] });
    expect(selectHitTest(select as any, new Point(50, 50))).toBe(false);
  });

  it("宽或高为 0 → false", () => {
    const select = createMockSelect({
      selectEls: [{ id: "el1" } as any],
      width: 0,
      height: 100,
    });
    expect(selectHitTest(select as any, new Point(50, 50))).toBe(false);
  });

  // ─── 控制点命中 ───────────────────────────────────────────

  it("鼠标在控制点范围内 → 命中控制点", () => {
    const { select, coords } = setup();
    const cp = coords[0];
    const hitPoint = new Point(cp.x + 1, cp.y + 1);

    const result = selectHitTest(select as any, hitPoint);

    expect(result).toBe(true);
    expect(select.currentControl).toBeTruthy();
    expect(select.currentControl.control).toBeTruthy();
  });

  it("命中控制点时设置对应 cursor", () => {
    const { select, coords, schema } = setup();
    const cp = coords[0];
    const hitPoint = new Point(cp.x, cp.y);

    selectHitTest(select as any, hitPoint);

    expect(select.cursor).toBe(schema.controls[0].cursor);
  });

  // ─── 旋转区域命中 ─────────────────────────────────────────

  it("控制点附近但非 body 内 → 旋转命中", () => {
    const { select, coords } = setup();
    const cp = coords[0];
    const scaledControlSize = select.controlSize / select.root.viewport.scale;
    const offset = scaledControlSize + 3;
    const hitPoint = new Point(cp.x - offset, cp.y - offset);

    select.bodyHasPoint.mockReturnValue(false);

    const result = selectHitTest(select as any, hitPoint);

    expect(result).toBe(true);
    expect(select.currentControl.control.id).toBe("rotate");
  });

  it("旋转区域但 bodyHasPoint=true → 不触发旋转", () => {
    const { select, coords } = setup();
    const cp = coords[0];
    const scaledControlSize = select.controlSize / select.root.viewport.scale;
    const offset = scaledControlSize + 3;
    const hitPoint = new Point(cp.x - offset, cp.y - offset);

    select.bodyHasPoint.mockReturnValue(true);

    const result = selectHitTest(select as any, hitPoint);
    if (result && select.currentControl) {
      expect(select.currentControl.control.id).not.toBe("rotate");
    }
  });

  it("schema.enableRotation=false → 不触发旋转命中", () => {
    const { select, coords, schema } = setup();
    const noRotateSchema = { ...schema, enableRotation: false };
    select.getActiveSchema.mockReturnValue(noRotateSchema);

    const cp = coords[0];
    const scaledControlSize = select.controlSize / select.root.viewport.scale;
    const offset = scaledControlSize + 3;
    const hitPoint = new Point(cp.x - offset, cp.y - offset);

    select.bodyHasPoint.mockReturnValue(false);
    const result = selectHitTest(select as any, hitPoint);

    if (result && select.currentControl) {
      expect(select.currentControl.control.id).not.toBe("rotate");
    }
  });

  // ─── Body 命中 ────────────────────────────────────────────

  it("body 内部 → cursor='move'", () => {
    const { select } = setup();
    const hitPoint = new Point(50, 50);
    select.bodyHasPoint.mockReturnValue(true);

    const result = selectHitTest(select as any, hitPoint);

    expect(result).toBe(true);
    expect(select.cursor).toBe("move");
  });

  it("schema.enableBodyMove=false → body 内不命中", () => {
    const { select, schema } = setup();
    const noMoveSchema = { ...schema, enableBodyMove: false };
    select.getActiveSchema.mockReturnValue(noMoveSchema);

    const hitPoint = new Point(50, 50);
    select.bodyHasPoint.mockReturnValue(true);

    const result = selectHitTest(select as any, hitPoint);
    expect(result).toBe(false);
  });

  it("schema.bodyHitTest 自定义 → 使用自定义判定", () => {
    const { select, schema } = setup();
    const customHit = vi.fn(() => true);
    const customSchema = { ...schema, bodyHitTest: customHit };
    select.getActiveSchema.mockReturnValue(customSchema);

    const hitPoint = new Point(50, 50);
    selectHitTest(select as any, hitPoint);

    expect(customHit).toHaveBeenCalledWith(select, hitPoint);
  });

  // ─── 完全未命中 ───────────────────────────────────────────

  it("鼠标远离所有区域 → false", () => {
    const { select } = setup();
    const hitPoint = new Point(9999, 9999);
    select.bodyHasPoint.mockReturnValue(false);

    const result = selectHitTest(select as any, hitPoint);

    expect(result).toBe(false);
    expect(select.currentControl).toBeNull();
    expect(select.cursor).toBe("default");
  });

  // ─── 边线命中 ─────────────────────────────────────────────

  it("schema 有 edges 且鼠标在边线上 → 命中 edge", () => {
    const { select, coords, schema } = setup();
    const edgeOnDrag = vi.fn();
    const edgeSchema = {
      ...schema,
      edges: [
        {
          from: schema.controls[0].id,
          to: schema.controls[1].id,
          cursor: "ns-resize",
          onDrag: edgeOnDrag,
        },
      ],
    };
    select.getActiveSchema.mockReturnValue(edgeSchema);

    const start = coords[0];
    const end = coords[1];
    const midPoint = new Point((start.x + end.x) / 2, (start.y + end.y) / 2);

    const result = selectHitTest(select as any, midPoint);

    expect(result).toBe(true);
    expect(select.currentControl.control.onDrag).toBe(edgeOnDrag);
  });
});
