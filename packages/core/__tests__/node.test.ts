import { describe, it, expect, beforeEach, vi } from "vitest";
import { Node } from "../src/node/node";
import { CustomEvent } from "../src/event";
import {
  createNode,
  createActivatedRoot,
  createMockRoot,
  createMockLayer,
  resetNodeStatics,
} from "./helpers";

// ==================== 辅助：在 activated 父节点下挂载子节点 ====================

function createActivatedNodeTree() {
  const { node: root, mockRoot, mockLayer } = createActivatedRoot();
  function makeChild(key?: string) {
    const child = new Node();
    if (key) child.key = key;
    return child;
  }
  return { root, mockRoot, mockLayer, makeChild };
}

// ==================== 结构操作 ====================

describe("Node 结构操作", () => {
  let root: Node;
  let mockRoot: ReturnType<typeof createMockRoot>;

  beforeEach(() => {
    resetNodeStatics();
    const ctx = createActivatedNodeTree();
    root = ctx.root;
    mockRoot = ctx.mockRoot;
  });

  describe("append", () => {
    it("append 单个子节点 → children 包含、parent 正确", () => {
      const child = createNode();
      root.append(child);
      expect(root.children).toContain(child);
      expect(child.parent).toBe(root);
    });

    it("append 多个子节点 → 顺序正确", () => {
      const a = createNode();
      const b = createNode();
      const c = createNode();
      root.append(a, b, c);
      expect(root.children).toEqual([a, b, c]);
    });
  });

  describe("prepend", () => {
    it("插入到头部", () => {
      const a = createNode();
      const b = createNode();
      root.append(a);
      root.prepend(b);
      expect(root.children![0]).toBe(b);
      expect(root.children![1]).toBe(a);
    });
  });

  describe("insertBefore", () => {
    it("插入到指定节点前", () => {
      const a = createNode();
      const b = createNode();
      const c = createNode();
      root.append(a, c);
      root.insertBefore(b, c);
      expect(root.children).toEqual([a, b, c]);
    });

    it("refChild 为 null 时等价于 append", () => {
      const a = createNode();
      const b = createNode();
      root.append(a);
      root.insertBefore(b, null);
      expect(root.children![root.children!.length - 1]).toBe(b);
    });
  });

  describe("insertAfter", () => {
    it("插入到指定节点后", () => {
      const a = createNode();
      const b = createNode();
      const c = createNode();
      root.append(a, c);
      root.insertAfter(b, a);
      expect(root.children).toEqual([a, b, c]);
    });
  });

  describe("replaceChild", () => {
    it("旧节点被移除、新节点在正确位置", () => {
      const a = createNode();
      const b = createNode();
      const c = createNode();
      const replacement = createNode();
      root.append(a, b, c);
      root.replaceChild(replacement, b);
      expect(root.children).toContain(replacement);
      expect(root.children).not.toContain(b);
      expect(root.children![1]).toBe(replacement);
    });

    it("替换三节点中的中间节点 → 位置正确", () => {
      const a = createNode();
      const b = createNode();
      const c = createNode();
      const newB = createNode();
      root.append(a, b, c);
      root.replaceChild(newB, b);
      expect(root.children![0]).toBe(a);
      expect(root.children![1]).toBe(newB);
      expect(root.children![2]).toBe(c);
    });
  });

  describe("removeChild", () => {
    it("children 不再包含被移除节点", () => {
      const a = createNode();
      const b = createNode();
      root.append(a, b);
      root.removeChild(a);
      expect(root.children).not.toContain(a);
      expect(root.children).toContain(b);
    });
  });

  describe("移动子节点", () => {
    it("从一个父节点移到另一个 → 旧父移除、新父添加", () => {
      const parent1 = createNode();
      const parent2 = createNode();
      const child = createNode();
      root.append(parent1, parent2);
      parent1.append(child);

      expect(parent1.children).toContain(child);

      parent2.append(child);
      expect(parent1.children).not.toContain(child);
      expect(parent2.children).toContain(child);
      expect(child.parent).toBe(parent2);
    });
  });

  describe("before / after 快捷方法", () => {
    it("before 等价于 parent.insertBefore", () => {
      const a = createNode();
      const b = createNode();
      root.append(b);
      b.before(a);
      expect(root.children![0]).toBe(a);
      expect(root.children![1]).toBe(b);
    });

    it("after 等价于 parent.insertAfter", () => {
      const a = createNode();
      const b = createNode();
      root.append(a);
      a.after(b);
      expect(root.children![0]).toBe(a);
      expect(root.children![1]).toBe(b);
    });
  });
});

// ==================== Sibling 链表 ====================

describe("sibling 链表", () => {
  let root: Node;

  beforeEach(() => {
    resetNodeStatics();
    root = createActivatedNodeTree().root;
  });

  it("三个子节点的 previousSibling / nextSibling 链正确", () => {
    const a = createNode();
    const b = createNode();
    const c = createNode();
    root.append(a, b, c);

    expect(a.previousSibling).toBeNull();
    expect(a.nextSibling).toBe(b);
    expect(b.previousSibling).toBe(a);
    expect(b.nextSibling).toBe(c);
    expect(c.previousSibling).toBe(b);
    expect(c.nextSibling).toBeNull();
  });

  it("移除中间节点后链表重建正确", () => {
    const a = createNode();
    const b = createNode();
    const c = createNode();
    root.append(a, b, c);
    root.removeChild(b);

    expect(a.nextSibling).toBe(c);
    expect(c.previousSibling).toBe(a);
  });

  it("firstChild / lastChild 正确", () => {
    const a = createNode();
    const b = createNode();
    const c = createNode();
    root.append(a, b, c);

    expect(root.firstChild).toBe(a);
    expect(root.lastChild).toBe(c);
  });

  it("无子节点时 firstChild / lastChild 为 null", () => {
    expect(root.firstChild).toBeNull();
    expect(root.lastChild).toBeNull();
  });
});

// ==================== 生命周期 ====================

describe("生命周期", () => {
  let root: Node;
  let mockRoot: ReturnType<typeof createMockRoot>;

  beforeEach(() => {
    resetNodeStatics();
    const ctx = createActivatedNodeTree();
    root = ctx.root;
    mockRoot = ctx.mockRoot;
  });

  it("mount → isMounted=true, isActiveed=true", () => {
    const child = createNode();
    root.append(child);
    expect(child.isMounted).toBe(true);
    expect(child.isActiveed).toBe(true);
  });

  it("activate → id 注册到 root.idElements", () => {
    const child = createNode();
    child.id = "test-id";
    root.append(child);
    expect(mockRoot.idElements.get("test-id")).toBe(child);
  });

  it("activate → key 注册到 root.keyElmenet", () => {
    const child = new Node();
    child._provides = {};
    child.key = "my-key";
    root.append(child);
    expect(mockRoot.keyElmenet.get("my-key")).toBe(child);
  });

  it("deactivate → isActiveed=false", () => {
    const child = createNode();
    root.append(child);
    expect(child.isActiveed).toBe(true);

    root.removeChild(child);
    expect(child.isActiveed).toBe(false);
  });

  it("deactivate → id/key 从 root 注销", () => {
    const child = new Node();
    child._provides = {};
    child.id = "del-id";
    child.key = "del-key";
    root.append(child);

    expect(mockRoot.idElements.has("del-id")).toBe(true);
    expect(mockRoot.keyElmenet.has("del-key")).toBe(true);

    root.removeChild(child);
    expect(mockRoot.idElements.has("del-id")).toBe(false);
    expect(mockRoot.keyElmenet.has("del-key")).toBe(false);
  });

  it("unmounted → isUnmounted=true", () => {
    const child = createNode();
    root.append(child);
    child.unmounted();
    expect(child.isUnmounted).toBe(true);
  });

  it("unmounted → children=null, parent=undefined", () => {
    const child = createNode();
    root.append(child);
    child.unmounted();
    expect(child.children).toBeNull();
    expect(child.parent).toBeUndefined();
  });

  it("unmounted 后 mount 无效（不可逆终态）", () => {
    const child = createNode();
    root.append(child);
    child.unmounted();

    child.mount();
    expect(child.isActiveed).toBe(false);
    expect(child.isUnmounted).toBe(true);
  });

  it("递归 activate → 子节点跟随父节点", () => {
    const parent = createNode();
    const child = createNode();
    const grandchild = createNode();
    parent.children = [child as any];
    child.children = [grandchild as any];

    root.append(parent);

    expect(parent.isActiveed).toBe(true);
    expect(child.isActiveed).toBe(true);
    expect(grandchild.isActiveed).toBe(true);
  });

  it("递归 deactivate → 子节点跟随父节点", () => {
    const parent = createNode();
    const child = createNode();
    parent.children = [child as any];
    root.append(parent);

    root.removeChild(parent);

    expect(parent.isActiveed).toBe(false);
    expect(child.isActiveed).toBe(false);
  });

  it("mounted 事件触发", () => {
    const child = createNode();
    const cb = vi.fn();
    child.addEventListener("mounted", cb);
    root.append(child);
    expect(cb).toHaveBeenCalledOnce();
  });

  it("activated 事件触发", () => {
    const child = createNode();
    const cb = vi.fn();
    child.addEventListener("activated", cb);
    root.append(child);
    expect(cb).toHaveBeenCalledOnce();
  });

  it("deactivated 事件触发", () => {
    const child = createNode();
    root.append(child);
    const cb = vi.fn();
    child.addEventListener("deactivated", cb);
    root.removeChild(child);
    expect(cb).toHaveBeenCalledOnce();
  });
});

// ==================== provide / inject ====================

describe("provide / inject", () => {
  let root: Node;

  beforeEach(() => {
    resetNodeStatics();
    root = createActivatedNodeTree().root;
  });

  it("父 provide → 子 inject 能获取到值", () => {
    root.provide("theme", "dark");
    const child = createNode();
    root.append(child);
    expect(child.inject("theme")).toBe("dark");
  });

  it("子覆盖 provide → 不影响父和兄弟", () => {
    root.provide("theme", "dark");

    const child1 = createNode();
    const child2 = createNode();
    root.append(child1, child2);

    child1.provide("theme", "light");

    expect(child1.inject("theme")).toBe("light");
    expect(child2.inject("theme")).toBe("dark");
    expect(root.inject("theme")).toBe("dark");
  });

  it("深层嵌套 inject → 能穿透多层找到值", () => {
    root.provide("appName", "fulate");

    const mid = createNode();
    root.append(mid);

    const deep = createNode();
    mid.append(deep);

    expect(deep.inject("appName")).toBe("fulate");
  });

  it("未 provide 的 key → inject 返回 undefined", () => {
    const child = createNode();
    root.append(child);
    expect(child.inject("nonexistent")).toBeUndefined();
  });
});
