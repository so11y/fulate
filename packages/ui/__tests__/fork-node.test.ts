import { describe, it, expect, beforeEach, vi } from "vitest";
import { Point } from "@fulate/util";
import { Element, Node } from "@fulate/core";
import { ForkNode } from "../src/fork-node";
import { Line } from "../src/line/straight";
import {
  createMockRoot,
  createMockLayer,
  resetNodeStatics
} from "../../core/__tests__/helpers";

// ==================== 辅助 ====================

/**
 * 初始化节点的 id / uIndex / _provides / root / layer，
 * 并应用 _initProps（模拟 mounted + activate）。
 */
function initNode(node: any, mockRoot: any, mockLayer: any) {
  node.id = Node.genKey();
  node.uIndex = Node.uIndex++;
  node._provides = { root: mockRoot, layer: mockLayer };
  node._root = mockRoot;
  node._layer = mockLayer;
  node.isMounted = true;
  node.isActiveed = true;

  if (node._initProps) {
    node.attrs(node._initProps);
    node._initProps = null;
  }

  mockRoot.idElements.set(node.id, node);
}

function createActivatedForkNode(opts?: any) {
  const node = new ForkNode(opts);
  const mockRoot = createMockRoot();
  const mockLayer = createMockLayer();
  Object.assign(mockRoot, {
    viewport: { scale: 1 },
    applyViewPointTransform: vi.fn()
  });
  initNode(node, mockRoot, mockLayer);
  return { node, mockRoot, mockLayer };
}

function createActivatedElement(mockRoot: any, mockLayer: any, opts?: any) {
  const el = new Element(opts);
  initNode(el, mockRoot, mockLayer);
  return el;
}

function createActivatedLine(
  mockRoot: any,
  mockLayer: any,
  points: Array<{ x: number; y: number; anchor?: any }>
) {
  const line = new Line();
  initNode(line, mockRoot, mockLayer);

  if (points.length > 0) {
    line.left = points[0].x;
    line.top = points[0].y;
    line.linePoints = points.map((p: any) => ({
      x: p.x - points[0].x,
      y: p.y - points[0].y,
      anchor: p.anchor ? { ...p.anchor } : undefined
    }));
    line._syncBoundsFromPoints();
  }
  line.calcWorldMatrix();

  return line;
}

// ==================== ForkNode 基础 ====================

describe("ForkNode 基础", () => {
  beforeEach(() => resetNodeStatics());

  describe("constructor", () => {
    it("默认尺寸 8×8", () => {
      const { node } = createActivatedForkNode();
      expect(node.width).toBe(8);
      expect(node.height).toBe(8);
    });

    it("type 为 forkNode", () => {
      expect(new ForkNode().type).toBe("forkNode");
    });

    it("默认禁用 rotation/resize/anchor，启用 anchorMultiLine", () => {
      const { node } = createActivatedForkNode();
      expect(node.enableRotation).toBe(false);
      expect(node.enableResize).toBe(false);
      expect(node.enableAnchor).toBe(false);
      expect(node.anchorMultiLine).toBe(true);
    });

    it("options 可覆盖默认值", () => {
      const { node } = createActivatedForkNode({ width: 20, height: 20 });
      expect(node.width).toBe(20);
      expect(node.height).toBe(20);
    });
  });

  describe("getAnchorSchema", () => {
    it("返回唯一 center 锚点", () => {
      const { node } = createActivatedForkNode();
      const schema = node.getAnchorSchema();
      expect(schema).toHaveLength(1);
      expect(schema[0].id).toBe("center");
    });

    it("localPosition 返回宽高中心", () => {
      const { node } = createActivatedForkNode({ width: 20, height: 10 });
      const pos = node.getAnchorSchema()[0].localPosition(node);
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(5);
    });
  });

  describe("toJson", () => {
    it("包含 type: forkNode", () => {
      const { node } = createActivatedForkNode();
      expect(node.toJson().type).toBe("forkNode");
    });
  });
});

// ==================== isAnchoredTo ====================

describe("ForkNode.isAnchoredTo", () => {
  it("anchor 指向 forkNode → true", () => {
    const mockLine = {
      linePoints: [{ anchor: { elementId: "fk1" } }],
      root: { idElements: new Map([["fk1", { type: "forkNode" }]]) }
    };
    expect(ForkNode.isAnchoredTo(mockLine, 0)).toBe(true);
  });

  it("anchor 指向非 forkNode 元素 → false", () => {
    const mockLine = {
      linePoints: [{ anchor: { elementId: "r1" } }],
      root: { idElements: new Map([["r1", { type: "rect" }]]) }
    };
    expect(ForkNode.isAnchoredTo(mockLine, 0)).toBe(false);
  });

  it("无 anchor → false", () => {
    const mockLine = {
      linePoints: [{ x: 0, y: 0 }],
      root: { idElements: new Map() }
    };
    expect(ForkNode.isAnchoredTo(mockLine, 0)).toBe(false);
  });

  it("pointIndex 越界 → false", () => {
    const mockLine = {
      linePoints: [{ anchor: { elementId: "fk1" } }],
      root: { idElements: new Map([["fk1", { type: "forkNode" }]]) }
    };
    expect(ForkNode.isAnchoredTo(mockLine, 5)).toBe(false);
  });

  it("elementId 不存在 → false", () => {
    const mockLine = {
      linePoints: [{ anchor: { elementId: "missing" } }],
      root: { idElements: new Map() }
    };
    expect(ForkNode.isAnchoredTo(mockLine, 0)).toBe(false);
  });

  it("linePoints 为 undefined → false", () => {
    expect(ForkNode.isAnchoredTo({}, 0)).toBe(false);
    expect(ForkNode.isAnchoredTo({ linePoints: undefined }, 0)).toBe(false);
  });
});

// ==================== hasPointHint ====================

describe("ForkNode.hasPointHint", () => {
  beforeEach(() => resetNodeStatics());

  it("visible=false → false", () => {
    const { node } = createActivatedForkNode();
    node.visible = false;
    expect(node.hasPointHint(new Point(0, 0))).toBe(false);
  });

  it("点在中心附近 → true", () => {
    const { node } = createActivatedForkNode({ left: 10, top: 10 });
    node.calcWorldMatrix();
    // center = (10 + 4, 10 + 4) = (14, 14)
    expect(node.hasPointHint(new Point(14, 14))).toBe(true);
  });

  it("点远离中心 → false", () => {
    const { node } = createActivatedForkNode({ left: 10, top: 10 });
    node.calcWorldMatrix();
    expect(node.hasPointHint(new Point(100, 100))).toBe(false);
  });

  it("scale 增大 → hitRadius 缩小", () => {
    const { node, mockRoot } = createActivatedForkNode({ left: 0, top: 0 });
    (mockRoot as any).viewport.scale = 4;
    node.calcWorldMatrix();
    // hitRadius = 8/4 = 2, center = (4, 4)
    expect(node.hasPointHint(new Point(4, 4))).toBe(true);
    // 距中心 2.5 > hitRadius 2
    expect(node.hasPointHint(new Point(6.5, 4))).toBe(false);
  });
});

// ==================== getControlSchema ====================

describe("ForkNode.getControlSchema", () => {
  beforeEach(() => resetNodeStatics());

  it("controls/edges 为空, enableRotation=false, enableBodyMove=true", () => {
    const { node } = createActivatedForkNode();
    const schema = node.getControlSchema();
    expect(schema.controls).toEqual([]);
    expect(schema.edges).toEqual([]);
    expect(schema.enableRotation).toBe(false);
    expect(schema.enableBodyMove).toBe(true);
  });

  it("bodyHitTest 委托给 hasPointHint", () => {
    const { node } = createActivatedForkNode();
    const spy = vi.spyOn(node, "hasPointHint").mockReturnValue(true);
    const schema = node.getControlSchema();
    const p = new Point(5, 5);
    schema.bodyHitTest(null, p);
    expect(spy).toHaveBeenCalledWith(p);
  });

  it("paintFrame 不抛异常", () => {
    const { node } = createActivatedForkNode();
    expect(() => node.getControlSchema().paintFrame()).not.toThrow();
  });

  describe("getSnapExcludes", () => {
    it("无 connectedLines → 空对象", () => {
      const { node } = createActivatedForkNode();
      const result = node.getControlSchema().getSnapExcludes();
      expect(result).toEqual({});
    });

    it("headPoint 锚定到 forkNode → 排除 index 0", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode();
      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0, anchor: { elementId: node.id, anchorType: "center" } },
        { x: 100, y: 0 }
      ]);
      node.connectedLines = new Set([line.id]);

      const result = node.getControlSchema().getSnapExcludes();
      expect(result.excludePoints).toHaveLength(1);
      expect(result.excludePoints![0].element).toBe(line);
      expect(result.excludePoints![0].indices).toContain(0);
    });

    it("tailPoint 锚定到 forkNode → 排除末尾 index", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode();
      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 100, y: 0, anchor: { elementId: node.id, anchorType: "center" } }
      ]);
      node.connectedLines = new Set([line.id]);

      const result = node.getControlSchema().getSnapExcludes();
      expect(result.excludePoints).toHaveLength(1);
      expect(result.excludePoints![0].indices).toContain(
        line.linePoints.length - 1
      );
    });

    it("两端都锚定 → 两个 index 都排除", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode();
      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0, anchor: { elementId: node.id, anchorType: "center" } },
        { x: 100, y: 0, anchor: { elementId: node.id, anchorType: "center" } }
      ]);
      node.connectedLines = new Set([line.id]);

      const result = node.getControlSchema().getSnapExcludes();
      expect(result.excludePoints).toHaveLength(1);
      expect(result.excludePoints![0].indices).toContain(0);
      expect(result.excludePoints![0].indices).toContain(
        line.linePoints.length - 1
      );
    });

    it("connectedLine 在 idElements 中不存在 → 跳过", () => {
      const { node } = createActivatedForkNode();
      node.connectedLines = new Set(["non-existent-line"]);
      const result = node.getControlSchema().getSnapExcludes();
      expect(result).toEqual({ excludePoints: [] });
    });
  });
});

// ==================== Line ↔ ForkNode 协作 ====================

describe("Line ↔ ForkNode 协作", () => {
  beforeEach(() => resetNodeStatics());

  // --- isAnchoredTo 对 Line control schema 的影响 ---

  describe("Line.getControlSchema 与 ForkNode", () => {
    it("端点锚定到 forkNode → 该端点不生成 vertex control", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 0,
        top: 0
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 4, y: 4, anchor: { elementId: node.id, anchorType: "center" } },
        { x: 100, y: 100 }
      ]);

      const schema = line.getControlSchema();
      const vertexIds = schema.controls
        .filter((c: any) => c.id.startsWith("v"))
        .map((c: any) => c.id);

      expect(vertexIds).not.toContain("v0");
      expect(vertexIds).toContain("v1");
    });

    it("端点锚定到 forkNode → enableBodyMove=false", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 0,
        top: 0
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 4, y: 4, anchor: { elementId: node.id, anchorType: "center" } },
        { x: 100, y: 100 }
      ]);

      expect(line.getControlSchema().enableBodyMove).toBe(false);
    });

    it("端点锚定到普通元素 → 仍生成 vertex control 且允许 body move", () => {
      const { mockRoot, mockLayer } = createActivatedForkNode();
      const rect = createActivatedElement(mockRoot, mockLayer, {
        left: 0,
        top: 0,
        width: 50,
        height: 50
      });
      rect.type = "rect";
      rect.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 25, y: 0, anchor: { elementId: rect.id, anchorType: "top" } },
        { x: 100, y: 100 }
      ]);

      const schema = line.getControlSchema();
      const vertexIds = schema.controls
        .filter((c: any) => c.id.startsWith("v"))
        .map((c: any) => c.id);

      expect(vertexIds).toContain("v0");
      expect(schema.enableBodyMove).toBe(true);
    });

    it("无锚点 → 所有端点都有 control, enableBodyMove=true", () => {
      const { mockRoot, mockLayer } = createActivatedForkNode();
      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ]);

      const schema = line.getControlSchema();
      const vertexIds = schema.controls
        .filter((c: any) => c.id.startsWith("v"))
        .map((c: any) => c.id);

      expect(vertexIds).toContain("v0");
      expect(vertexIds).toContain("v1");
      expect(schema.enableBodyMove).toBe(true);
    });

    it("两端都锚定到 forkNode → 两端都无 vertex control", () => {
      const {
        node: fk1,
        mockRoot,
        mockLayer
      } = createActivatedForkNode({ left: 0, top: 0 });
      fk1.calcWorldMatrix();

      const fk2 = new ForkNode({ left: 100, top: 0 });
      initNode(fk2, mockRoot, mockLayer);
      fk2.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 4, y: 4, anchor: { elementId: fk1.id, anchorType: "center" } },
        { x: 104, y: 4, anchor: { elementId: fk2.id, anchorType: "center" } }
      ]);

      const schema = line.getControlSchema();
      const vertexIds = schema.controls
        .filter((c: any) => c.id.startsWith("v"))
        .map((c: any) => c.id);

      expect(vertexIds).not.toContain("v0");
      expect(vertexIds).not.toContain("v1");
      expect(schema.enableBodyMove).toBe(false);
    });
  });

  // --- BaseLine.hasPointHint 穿透 forkNode ---

  describe("BaseLine.hasPointHint forkNode 穿透", () => {
    it("点击在 forkNode 区域内 → line 返回 false（让出命中）", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 96,
        top: -4
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 100, y: 0, anchor: { elementId: node.id, anchorType: "center" } }
      ]);

      // forkNode center = (96+4, -4+4) = (100, 0)
      expect(line.hasPointHint(new Point(100, 0))).toBe(false);
    });

    it("点击在线段中间（远离 forkNode）→ 返回 true", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 96,
        top: -4
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 100, y: 0, anchor: { elementId: node.id, anchorType: "center" } }
      ]);

      expect(line.hasPointHint(new Point(50, 0))).toBe(true);
    });

    it("无 forkNode 锚定 → 端点正常命中", () => {
      const { mockRoot, mockLayer } = createActivatedForkNode();
      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ]);

      expect(line.hasPointHint(new Point(100, 0))).toBe(true);
    });
  });

  // --- onSelectMoveEnd: forkNode 锚定保持 vs 普通元素断开 ---

  describe("onSelectMoveEnd 锚定保持/断开", () => {
    it("锚定到 forkNode → 移动后 anchor 不断开", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 0,
        top: 0
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 4, y: 4, anchor: { elementId: node.id, anchorType: "center" } }
      ]);

      node.left = 50;
      node.top = 50;
      node.calcWorldMatrix();

      line.onSelectMoveEnd();

      expect(line.tailPoint.anchor).toBeDefined();
      expect(line.tailPoint.anchor!.elementId).toBe(node.id);
    });

    it("锚定到普通元素 → 偏移后 anchor 断开", () => {
      const { mockRoot, mockLayer } = createActivatedForkNode();
      const rect = createActivatedElement(mockRoot, mockLayer, {
        left: 0,
        top: 0,
        width: 50,
        height: 50
      });
      rect.type = "rect";
      rect.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 25, y: 0, anchor: { elementId: rect.id, anchorType: "top" } }
      ]);

      rect.left = 200;
      rect.top = 200;
      rect.calcWorldMatrix();

      line.onSelectMoveEnd();

      expect(line.tailPoint.anchor).toBeUndefined();
    });
  });

  // --- syncAnchors: forkNode 移动时 line 端点跟随 ---

  describe("syncAnchors 位置跟随", () => {
    it("forkNode 移动后 syncAnchors → line 端点坐标更新", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 0,
        top: 0
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 4, y: 4, anchor: { elementId: node.id, anchorType: "center" } },
        { x: 100, y: 100 }
      ]);

      // 先同步一次对齐初始位置
      line.syncAnchors();
      const oldX = line.headPoint.x;
      const oldY = line.headPoint.y;

      node.left = 50;
      node.top = 50;
      node.calcWorldMatrix();

      const changed = line.syncAnchors();
      expect(changed).toBe(true);
      expect(
        Math.abs(line.headPoint.x - oldX) > 0.01 ||
          Math.abs(line.headPoint.y - oldY) > 0.01
      ).toBe(true);
    });

    it("forkNode 未移动 → syncAnchors 返回 false", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 0,
        top: 0
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 4, y: 4, anchor: { elementId: node.id, anchorType: "center" } },
        { x: 100, y: 100 }
      ]);

      line.syncAnchors();
      const changed = line.syncAnchors();
      expect(changed).toBe(false);
    });
  });

  // --- 连接/断开管理 ---

  describe("连接管理 (_connect / _disconnect)", () => {
    it("addPoint 带 anchor → forkNode.connectedLines 包含 line id", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 50,
        top: 50
      });
      node.calcWorldMatrix();

      const line = new Line();
      initNode(line, mockRoot, mockLayer);

      line.addPoint(0, 0);
      line.addPoint(54, 54, { elementId: node.id, anchorType: "center" });

      expect(node.connectedLines).toBeDefined();
      expect(node.connectedLines!.has(line.id)).toBe(true);
    });

    it("movePoint 清除唯一端点 anchor → 因 _unregisterAnchor 时机，连接仍保留", () => {
      // _unregisterAnchor 在 anchor 被清除前调用，
      // 检测到 tailPoint.anchor 仍指向 node → 认为 stillConnected
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 50,
        top: 50
      });
      node.calcWorldMatrix();

      const line = new Line();
      initNode(line, mockRoot, mockLayer);

      line.addPoint(0, 0);
      line.addPoint(54, 54, { elementId: node.id, anchorType: "center" });
      expect(node.connectedLines!.has(line.id)).toBe(true);

      line.movePoint(1, 200, 200);
      // anchor 已被移除
      expect(line.tailPoint.anchor).toBeUndefined();
      // 但连接仍保留（_unregisterAnchor 先于 anchor 清除）
      expect(node.connectedLines!.has(line.id)).toBe(true);
    });

    it("movePoint 清除其中一端 → head 仍锚定则连接保留", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 50,
        top: 50
      });
      node.calcWorldMatrix();

      const line = new Line();
      initNode(line, mockRoot, mockLayer);

      line.addPoint(54, 54, { elementId: node.id, anchorType: "center" });
      line.addPoint(100, 100);
      line.addPoint(54, 54, { elementId: node.id, anchorType: "center" });
      expect(node.connectedLines!.has(line.id)).toBe(true);

      // 移动 tail（index 2）清除该端 anchor，但 head 仍锚定
      line.movePoint(2, 200, 200);
      expect(node.connectedLines!.has(line.id)).toBe(true);
    });

    it("removePoint 清除锚定中间点 → head/tail 不受影响则连接保留", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 50,
        top: 50
      });
      node.calcWorldMatrix();

      const line = new Line();
      initNode(line, mockRoot, mockLayer);

      line.addPoint(0, 0);
      line.addPoint(54, 54, { elementId: node.id, anchorType: "center" });
      line.addPoint(100, 100);
      expect(node.connectedLines!.has(line.id)).toBe(true);

      // 删除中间点（index 1），该点有 anchor
      // _unregisterAnchor 检查 head/tail → head 无 anchor, tail 无 anchor → 断开
      line.removePoint(1);
      expect(node.connectedLines!.has(line.id)).toBe(false);
    });
  });

  // --- setOptions 恢复（历史操作）---

  describe("setOptions linePoints 恢复连接", () => {
    it("setOptions 更新 linePoints 后重新绑定锚点", () => {
      const { node, mockRoot, mockLayer } = createActivatedForkNode({
        left: 50,
        top: 50
      });
      node.calcWorldMatrix();

      const line = createActivatedLine(mockRoot, mockLayer, [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ]);

      expect(node.connectedLines?.has(line.id)).toBeFalsy();

      line.setOptions({
        linePoints: [
          { x: 0, y: 0 },
          { x: 54, y: 54, anchor: { elementId: node.id, anchorType: "center" } }
        ]
      });

      expect(node.connectedLines).toBeDefined();
      expect(node.connectedLines!.has(line.id)).toBe(true);
    });
  });
});
