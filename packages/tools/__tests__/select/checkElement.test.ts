import { describe, it, expect } from "vitest";
import { checkElement } from "../../src/select/checkElement";
import { mockElement, mockGroupedElement, mockLayer, mockArtboard } from "../helpers";

describe("checkElement", () => {
  // ─── 基本过滤 ─────────────────────────────────────────────

  it("普通元素，无 group → 返回自身", () => {
    const el = mockElement();
    expect(checkElement(el)).toBe(el);
  });

  it("元素在 excludes 中 → 返回 undefined", () => {
    const el = mockElement();
    expect(checkElement(el, [el])).toBeUndefined();
  });

  it("selectctbale === false → 返回 undefined", () => {
    const el = mockElement({ selectctbale: false });
    expect(checkElement(el)).toBeUndefined();
  });

  it("inject('selectctbale') === false → 返回 undefined", () => {
    const el = mockElement();
    el.provide("selectctbale", false);
    expect(checkElement(el)).toBeUndefined();
  });

  it("isLayer === true → 返回 undefined", () => {
    const el = mockLayer();
    expect(checkElement(el)).toBeUndefined();
  });

  it("type === 'artboard' → 返回 undefined", () => {
    const el = mockElement({ type: "artboard" });
    expect(checkElement(el)).toBeUndefined();
  });

  // ─── Group 解析 ───────────────────────────────────────────

  it("元素有一层 group → resolve 到 group", () => {
    const group = mockElement({ type: "group" });
    const el = mockElement();
    mockGroupedElement(el, group);
    expect(checkElement(el)).toBe(group);
  });

  it("元素有嵌套 group（两层） → resolve 到最外层 group", () => {
    const outerGroup = mockElement({ type: "group" });
    const innerGroup = mockElement({ type: "group" });
    mockGroupedElement(innerGroup, outerGroup);
    const el = mockElement();
    mockGroupedElement(el, innerGroup);
    expect(checkElement(el)).toBe(outerGroup);
  });

  it("resolve 后的 group 在 excludes 中 → 返回 undefined", () => {
    const group = mockElement({ type: "group" });
    const el = mockElement();
    mockGroupedElement(el, group);
    expect(checkElement(el, [group])).toBeUndefined();
  });

  // ─── layer 过滤逻辑（非 artboard 分支） ───────────────────

  it("layer.type !== 'artboard'，layer.parent.type !== 'artboard' → 通过", () => {
    const layer = mockElement({ type: "layer" });
    (layer as any).parent = mockElement({ type: "other" });
    const el = mockElement();
    el.provide("layer", layer);
    expect(checkElement(el)).toBe(el);
  });

  it("layer.type !== 'artboard'，layer.parent.type === 'artboard'，object.parent.isLayer === true → 通过", () => {
    const artboardParent = mockElement({ type: "artboard" });
    const layer = mockElement({ type: "layer" });
    (layer as any).parent = artboardParent;
    const parentLayer = mockLayer();
    const el = mockElement();
    el.parent = parentLayer as any;
    el.provide("layer", layer);
    expect(checkElement(el)).toBe(el);
  });

  it("layer.type !== 'artboard'，layer.parent.type === 'artboard'，object.parent.isLayer === false → 返回 undefined", () => {
    const artboardParent = mockElement({ type: "artboard" });
    const layer = mockElement({ type: "layer" });
    (layer as any).parent = artboardParent;
    const normalParent = mockElement({ type: "group" });
    const el = mockElement();
    el.parent = normalParent as any;
    el.provide("layer", layer);
    expect(checkElement(el)).toBeUndefined();
  });

  // ─── layer 过滤逻辑（artboard 分支） ──────────────────────

  it("layer.type === 'artboard' 且 object.parent === layer → 返回 resolved", () => {
    const artboard = mockArtboard();
    const el = mockElement();
    el.parent = artboard as any;
    el.provide("layer", artboard);
    expect(checkElement(el)).toBe(el);
  });

  it("layer.type === 'artboard' 且 object.parent !== layer → 返回 undefined", () => {
    const artboard = mockArtboard();
    const otherParent = mockElement();
    const el = mockElement();
    el.parent = otherParent as any;
    el.provide("layer", artboard);
    expect(checkElement(el)).toBeUndefined();
  });

  // ─── 边界 ─────────────────────────────────────────────────

  it("inject('layer') 为 undefined → 正常返回 resolved", () => {
    const el = mockElement();
    expect(checkElement(el)).toBe(el);
  });

  it("inject('group') 为 undefined（无 group）→ resolved 与 object 相同，不检查 excludes 第二次", () => {
    const el = mockElement();
    expect(checkElement(el, [])).toBe(el);
  });
});
