import { describe, it, expect, vi, beforeEach } from "vitest";
import { HistoryManager } from "../../src/history/index";
import {
  createToolsMockRoot,
  mockElement,
  mockElementWithParent,
  mockElementWithToJson,
  type ToolsMockRoot,
} from "../helpers";
import type { Element } from "@fulate/core";

let root: ToolsMockRoot;
let history: HistoryManager;
let mockSelect: any;

function setupSelect(selectEls: Element[] = []) {
  mockSelect = {
    selectEls,
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    currentControl: null,
    hoverElement: null,
    setOptions: vi.fn((opts: any) => {
      if (opts) Object.assign(mockSelect, opts);
    }),
  };
  root.find.mockReturnValue(mockSelect);
}

beforeEach(() => {
  root = createToolsMockRoot();
  history = new HistoryManager(root as any, 50);
  setupSelect();
});

// ─── snapshot + commit ───────────────────────────────────────

describe("snapshot / commit", () => {
  it("无 snapshot 时 commit 不推栈", () => {
    history.commit();
    expect((history as any).undoStack.length).toBe(0);
  });

  it("snapshot 后属性未变 → commit 不产生记录", () => {
    const el = mockElement({ left: 10, top: 20 });
    history.snapshot([el]);
    history.commit();
    expect((history as any).undoStack.length).toBe(0);
  });

  it("属性变化后 commit → undoStack +1，redoStack 清空", () => {
    const el = mockElement({ left: 10, top: 20 });
    history.snapshot([el]);
    el.left = 50;
    history.commit();

    expect((history as any).undoStack.length).toBe(1);
    expect((history as any).redoStack.length).toBe(0);
  });

  it("parent 变化 → commit 产生记录", () => {
    const { el, parent } = mockElementWithParent();
    history.snapshot([el]);
    (el as any).parent = undefined;
    parent.children.length = 0;
    history.commit();

    expect((history as any).undoStack.length).toBe(1);
  });

  it("index 变化 → commit 产生记录", () => {
    const { el, parent } = mockElementWithParent();
    const el2 = mockElement();
    parent.children.unshift(el2);
    history.snapshot([el]);
    parent.children.reverse();
    history.commit();

    expect((history as any).undoStack.length).toBe(1);
  });

  it("记录类型：delete（isActiveed → false）", () => {
    const { el, parent } = mockElementWithParent();
    (el as any).isActiveed = true;
    (el as any).isMounted = true;
    history.snapshot([el]);
    parent.removeChild(el);
    (el as any).parent = undefined;
    (el as any).isActiveed = false;
    history.commit();

    const batch = (history as any).undoStack[0];
    expect(batch.records[0].type).toBe("delete");
  });

  it("记录类型：create（isMounted false → true）", () => {
    const el = mockElement({ left: 10 });
    (el as any).isMounted = false;
    history.snapshot([el]);
    (el as any).isMounted = true;
    el.left = 20;
    history.commit();

    const batch = (history as any).undoStack[0];
    expect(batch.records[0].type).toBe("create");
  });

  it("超出 limit 时自动丢弃最旧记录", () => {
    const mgr = new HistoryManager(root as any, 3);
    root.find.mockReturnValue(mockSelect);

    for (let i = 0; i < 5; i++) {
      const el = mockElement({ left: i });
      mgr.snapshot([el]);
      el.left = i + 100;
      mgr.commit();
    }

    expect((mgr as any).undoStack.length).toBe(3);
  });
});

// ─── undo / redo ─────────────────────────────────────────────

describe("undo / redo", () => {
  it("undo 恢复属性", () => {
    const el = mockElement({ left: 10 });
    history.snapshot([el]);
    el.left = 50;
    history.commit();

    history.undo();
    expect(el.left).toBe(10);
  });

  it("redo 重新应用属性", () => {
    const el = mockElement({ left: 10 });
    history.snapshot([el]);
    el.left = 50;
    history.commit();

    history.undo();
    expect(el.left).toBe(10);
    history.redo();
    expect(el.left).toBe(50);
  });

  it("undo 空栈 → 无操作", () => {
    expect(() => history.undo()).not.toThrow();
  });

  it("redo 空栈 → 无操作", () => {
    expect(() => history.redo()).not.toThrow();
  });

  it("commit 清空 redoStack", () => {
    const el = mockElement({ left: 0 });
    history.snapshot([el]);
    el.left = 10;
    history.commit();

    history.undo();

    const el2 = mockElement({ left: 100 });
    history.snapshot([el2]);
    el2.left = 200;
    history.commit();

    expect((history as any).redoStack.length).toBe(0);
  });

  it("undo delete → 元素被重新插入 parent", () => {
    const { el, parent } = mockElementWithParent();
    (el as any).isActiveed = true;
    (el as any).isMounted = true;

    history.snapshot([el]);
    parent.removeChild(el);
    (el as any).isActiveed = false;
    (el as any).parent = undefined;
    history.commit();

    history.undo();
    expect(parent.append).toHaveBeenCalled();
  });

  it("undo → 调用 restoreSelect 恢复选区快照", () => {
    mockSelect.selectEls = [];
    mockSelect.width = 100;

    const el = mockElement({ left: 0 });
    history.snapshot([el]);
    el.left = 50;

    mockSelect.selectEls = [el as any];
    mockSelect.width = 200;
    history.commit();

    history.undo();

    expect(root.nextTick).toHaveBeenCalled();
    expect(mockSelect.setOptions).toHaveBeenCalled();
  });
});

// ─── pushAction ──────────────────────────────────────────────

describe("pushAction", () => {
  it("pushAction undo/redo 调用自定义回调", () => {
    const undoFn = vi.fn();
    const redoFn = vi.fn();
    history.pushAction(undoFn, redoFn);

    history.undo();
    expect(undoFn).toHaveBeenCalledOnce();

    history.redo();
    expect(redoFn).toHaveBeenCalledOnce();
  });

  it("pushAction 清空 redoStack", () => {
    const el = mockElement({ left: 0 });
    history.snapshot([el]);
    el.left = 10;
    history.commit();
    history.undo();

    history.pushAction(vi.fn(), vi.fn());
    expect((history as any).redoStack.length).toBe(0);
  });

  it("pushAction 超出 limit 也丢弃最旧", () => {
    const mgr = new HistoryManager(root as any, 2);
    mgr.pushAction(vi.fn(), vi.fn());
    mgr.pushAction(vi.fn(), vi.fn());
    mgr.pushAction(vi.fn(), vi.fn());

    expect((mgr as any).undoStack.length).toBe(2);
  });
});
