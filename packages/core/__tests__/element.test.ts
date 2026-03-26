import { describe, it, expect, beforeEach, vi } from "vitest";
import { Element } from "../src/node/element";
import { Point } from "@fulate/util";
import {
  createElement,
  createActivatedElement,
  expectRectCloseTo,
  resetNodeStatics,
} from "./helpers";

describe("Element", () => {
  beforeEach(() => {
    resetNodeStatics();
  });

  // ==================== attrs / setOptions ====================

  describe("attrs / setOptions", () => {
    it("attrs 赋值属性 → left/top/width 等正确赋值", () => {
      const el = createElement();
      el.attrs({ left: 10, top: 20, width: 200, height: 100 });
      expect(el.left).toBe(10);
      expect(el.top).toBe(20);
      expect(el.width).toBe(200);
      expect(el.height).toBe(100);
    });

    it("attrs 设置 width → _hasExplicitWidth=true", () => {
      const el = createElement();
      expect(el._hasExplicitWidth).toBe(false);
      el.attrs({ width: 100 });
      expect(el._hasExplicitWidth).toBe(true);
    });

    it("attrs 设置 height → _hasExplicitHeight=true", () => {
      const el = createElement();
      expect(el._hasExplicitHeight).toBe(false);
      el.attrs({ height: 100 });
      expect(el._hasExplicitHeight).toBe(true);
    });

    it("attrs 设置事件 → addEventListener 被调用", () => {
      const el = createElement();
      const clickFn = vi.fn();
      el.attrs({ onclick: clickFn });

      el.dispatchEvent("click");
      expect(clickFn).toHaveBeenCalled();
    });

    it("setOptions 触发 markNeedsLayout → isDirty=true", () => {
      const { el } = createActivatedElement();
      el.isDirty = false;
      el.setOptions({ left: 50 });
      expect(el.isDirty).toBe(true);
    });

    it("setOptions 返回 this（链式调用）", () => {
      const { el } = createActivatedElement();
      const ret = el.setOptions({ left: 10 });
      expect(ret).toBe(el);
    });
  });

  // ==================== getDirtyRect ====================

  describe("getDirtyRect", () => {
    it("无旧位置 → 返回当前 boundingRect", () => {
      const { el } = createActivatedElement({ left: 10, top: 10, width: 100, height: 100 });
      el.calcWorldMatrix();
      const dirty = el.getDirtyRect();
      expectRectCloseTo(dirty, { left: 10, top: 10, width: 100, height: 100 });
    });

    it("有旧位置 → 返回新旧合并区域", () => {
      const { el } = createActivatedElement({ left: 0, top: 0, width: 50, height: 50 });
      el.calcWorldMatrix();
      el.getBoundingRect();

      el.isDirty = false;
      el.markNeedsLayout();

      el.left = 100;
      el.calcWorldMatrix();

      const dirty = el.getDirtyRect();
      expect(dirty.left).toBeLessThanOrEqual(0);
      expect(dirty.left + dirty.width).toBeGreaterThanOrEqual(150);
    });

    it("_ownMatrixCache 为空时返回 _lastBoundingRect 或默认值", () => {
      const el = createElement({ width: 100, height: 100 });
      (el as any)._ownMatrixCache = null;
      const dirty = el.getDirtyRect();
      expect(dirty).toHaveProperty("left");
      expect(dirty).toHaveProperty("width");
    });
  });

  // ==================== toJson ====================

  describe("toJson", () => {
    it("关键属性完整输出", () => {
      const { el } = createActivatedElement({
        left: 10, top: 20, width: 100, height: 50,
        angle: 45, visible: true, cursor: "pointer",
      });
      el.scaleX = 2;
      el.scaleY = 1.5;

      const json = el.toJson();
      expect(json).toMatchObject({
        type: "element",
        left: 10,
        top: 20,
        width: 100,
        height: 50,
        angle: 45,
        scaleX: 2,
        scaleY: 1.5,
        cursor: "pointer",
      });
    });

    it("includeChildren=true → children 被序列化", () => {
      const { el: parent } = createActivatedElement();
      const child = new Element({ width: 30, height: 30 });
      child._provides = parent._provides;
      parent.children = [child as any];
      child.parent = parent as any;
      child.isMounted = true;
      child.isActiveed = true;
      child.width = 30;
      child.height = 30;

      const json = parent.toJson(true) as any;
      expect(json.children).toBeDefined();
      expect(json.children.length).toBe(1);
      expect(json.children[0].width).toBe(30);
    });
  });

  // ==================== hasPointHint (Element 覆写) ====================

  describe("hasPointHint", () => {
    it("visible=false → false", () => {
      const { el } = createActivatedElement({ width: 100, height: 100 });
      el.visible = false;
      el.calcWorldMatrix();
      expect(el.hasPointHint(new Point(50, 50))).toBe(false);
    });

    it("visible=true → 正常检测", () => {
      const { el } = createActivatedElement({ width: 100, height: 100 });
      el.calcWorldMatrix();
      expect(el.hasPointHint(new Point(50, 50))).toBe(true);
      expect(el.hasPointHint(new Point(200, 200))).toBe(false);
    });
  });

  // ==================== connectedLines ====================

  describe("connectedLines", () => {
    it("getAffectedElements → 返回连接的 line 元素", () => {
      const { el, mockRoot } = createActivatedElement();
      const fakeLine = { type: "line" } as any;
      mockRoot.idElements.set("line-1", fakeLine);
      el.connectedLines = new Set(["line-1"]);

      const affected = el.getAffectedElements();
      expect(affected).toContain(fakeLine);
    });

    it("无 connectedLines → getAffectedElements 返回空数组", () => {
      const { el } = createActivatedElement();
      expect(el.getAffectedElements()).toEqual([]);
    });

    it("deactivate 清除关联 line 的 anchor 引用", () => {
      const { el, mockRoot } = createActivatedElement();
      el.id = "elem-1";
      mockRoot.idElements.set("elem-1", el);

      const linePoint = { anchor: { elementId: "elem-1", anchorType: "top" } };
      const fakeLine = {
        linePoints: [linePoint],
        markNeedsLayout: vi.fn(),
        parent: { removeChild: vi.fn() },
      };
      mockRoot.idElements.set("line-1", fakeLine);
      el.connectedLines = new Set(["line-1"]);

      el.deactivate();
      expect(linePoint.anchor).toBeUndefined();
    });
  });

  // ==================== constructor with options ====================

  describe("constructor", () => {
    it("传入 options → mounted 后属性被赋值", () => {
      const { el: parent, mockRoot, mockLayer } = createActivatedElement();
      const child = new Element({ left: 42, top: 17, width: 200, height: 100 });
      child._provides = parent._provides;
      parent.append(child);

      expect(child.left).toBe(42);
      expect(child.top).toBe(17);
      expect(child.width).toBe(200);
    });
  });
});
