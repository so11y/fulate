import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupInteraction } from "../../src/select/interaction";
import {
  createMockSelect,
  createFulateEvent,
  mockElement,
  type MockSelect,
} from "../helpers";

let select: MockSelect;
let cleanup: () => void;

function getRootHandler(eventName: string) {
  const call = (select.root.addEventListener as any).mock.calls.find(
    (c: any[]) => c[0] === eventName
  );
  return call?.[1] as Function | undefined;
}

function getContainerHandler(eventName: string) {
  const calls = (
    select.root.container.addEventListener as any
  )?.mock?.calls;
  if (!calls) {
    const realCalls: any[][] = [];
    const origAdd = select.root.container.addEventListener.bind(
      select.root.container
    );
    return undefined;
  }
  const call = calls.find((c: any[]) => c[0] === eventName);
  return call?.[1] as Function | undefined;
}

beforeEach(() => {
  select = createMockSelect();
  select.root.getCurrnetEelement.mockReturnValue(null);

  vi.spyOn(select.root.container, "addEventListener");
  vi.spyOn(select.root.container, "removeEventListener");
  vi.spyOn(select.root.container, "focus").mockImplementation(() => {});

  cleanup = setupInteraction(select as any);
});

afterEach(() => {
  cleanup?.();
});

// ─── keydown 快捷键 ──────────────────────────────────────────

describe("keydown 快捷键", () => {
  function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    });
    select.root.container.dispatchEvent(event);
  }

  it("Ctrl+Z → undo", () => {
    dispatchKey("z", { ctrlKey: true });
    expect(select.history.undo).toHaveBeenCalledOnce();
  });

  it("Ctrl+Y → redo", () => {
    dispatchKey("y", { ctrlKey: true });
    expect(select.history.redo).toHaveBeenCalledOnce();
  });

  it("Ctrl+G → doGroup", () => {
    dispatchKey("g", { ctrlKey: true });
    expect(select.doGroup).toHaveBeenCalledOnce();
  });

  it("Ctrl+Shift+G → unGroup", () => {
    dispatchKey("g", { ctrlKey: true, shiftKey: true });
    expect(select.unGroup).toHaveBeenCalledOnce();
  });

  it("Ctrl+C → copy", () => {
    dispatchKey("c", { ctrlKey: true });
    expect(select.copy).toHaveBeenCalledOnce();
  });

  it("Ctrl+V → paste", () => {
    dispatchKey("v", { ctrlKey: true });
    expect(select.paste).toHaveBeenCalledOnce();
  });

  it("Escape → select([])", () => {
    dispatchKey("Escape");
    expect(select.select).toHaveBeenCalledWith([]);
  });

  it("Delete → delete()", () => {
    dispatchKey("Delete");
    expect(select.delete).toHaveBeenCalledOnce();
  });

  it("Backspace → delete()", () => {
    dispatchKey("Backspace");
    expect(select.delete).toHaveBeenCalledOnce();
  });
});

// ─── mouseenter / mouseleave ─────────────────────────────────

describe("mouseenter / mouseleave", () => {
  it("mouseenter → 设置 hoverElement", () => {
    const handler = getRootHandler("mouseenter");
    expect(handler).toBeTruthy();

    const target = mockElement({ type: "rect" });
    (target as any).parent = {
      type: "artboard",
      isLayer: true,
      parent: null,
    };
    (target as any)._provides = {};
    (target as any).inject = (key: string) => {
      if (key === "layer") return target.parent;
      if (key === "selectctbale") return undefined;
      if (key === "group") return undefined;
      return (target as any)._provides?.[key];
    };

    handler!(createFulateEvent({ target }));

    expect(select.hoverElement).toBe(target);
  });

  it("mouseenter target=select → 不设置 hoverElement", () => {
    const handler = getRootHandler("mouseenter");
    handler!(createFulateEvent({ target: select }));
    expect(select.hoverElement).toBeNull();
  });

  it("mouseleave → 清空 hoverElement", () => {
    select.hoverElement = mockElement() as any;
    select.root.getCurrnetEelement.mockReturnValue(null);
    const handler = getRootHandler("mouseleave");
    expect(handler).toBeTruthy();
    handler!();
    expect(select.hoverElement).toBeNull();
  });

  it("mouseleave + currentElement 存在 → 不清空", () => {
    select.hoverElement = mockElement() as any;
    select.root.getCurrnetEelement.mockReturnValue({ element: select });
    const handler = getRootHandler("mouseleave");
    handler!();
    expect(select.hoverElement).not.toBeNull();
  });
});

// ─── pointerdown 分支 ────────────────────────────────────────

describe("pointerdown 分支", () => {
  it("无选中 → 走 handleSelect 路径（设置 selectEls=[] + setOptionsSync）", () => {
    select.selectEls = [];
    select.root.getCurrnetEelement.mockReturnValue(null);

    const handler = getRootHandler("pointerdown");
    handler!(createFulateEvent({ x: 50, y: 50 }));

    expect(select.setOptionsSync).toHaveBeenCalled();
  });

  it("lineTool.isDrawingMode → 不处理", () => {
    select.root.keyElmenet.set("lineTool", { isDrawingMode: true });
    const handler = getRootHandler("pointerdown");
    handler!(createFulateEvent({ x: 50, y: 50 }));
    expect(select.setOptionsSync).not.toHaveBeenCalled();
  });

  it("有选中 + currentControl → 走 handleControl（history.snapshot）", () => {
    select.selectEls = [mockElement() as any];
    select.root.getCurrnetEelement.mockReturnValue({ element: select });
    select.currentControl = {
      control: { id: "tl", onDrag: vi.fn() },
      point: { x: 0, y: 0 },
    };

    const handler = getRootHandler("pointerdown");
    handler!(createFulateEvent({ x: 0, y: 0 }));

    expect(select.history.snapshot).toHaveBeenCalledWith(select.selectEls);
  });

  it("有选中 + 无 currentControl → 走 handleSelectMove（history.snapshot）", () => {
    select.selectEls = [mockElement() as any];
    select.root.getCurrnetEelement.mockReturnValue({ element: select });
    select.currentControl = null;

    const handler = getRootHandler("pointerdown");
    handler!(createFulateEvent({ x: 10, y: 10 }));

    expect(select.history.snapshot).toHaveBeenCalledWith(select.selectEls);
  });
});

// ─── dblclick ────────────────────────────────────────────────

describe("dblclick", () => {
  function getDblclickHandler() {
    const calls = (select.root.container.addEventListener as any).mock.calls;
    const call = calls.find((c: any[]) => c[0] === "dblclick");
    return call?.[1] as Function | undefined;
  }

  it("非单选 → 不执行", () => {
    select.selectEls = [];
    const handler = getDblclickHandler();
    handler!();
    expect(select.select).not.toHaveBeenCalled();
  });

  it("单选 group + canDiveIn → searchHitElements 并选中子元素", () => {
    const child = mockElement({ type: "rect" });
    (child as any).groupParent = { type: "group" };
    (child as any).inject = (key: string) => {
      if (key === "diveInContainer") return null;
      return undefined;
    };

    const group = mockElement({ type: "group" });
    select.selectEls = [group as any];
    select.canDiveIn.mockReturnValue(true);

    select.root.searchHitElements.mockImplementation((_: any, cb: any) => {
      (child as any).groupParent = group;
      return cb({ element: child });
    });

    const handler = getDblclickHandler();
    handler!();

    expect(select.select).toHaveBeenCalledWith([child]);
  });

  it("单选 + 不能 diveIn + enterEditing → 进入编辑", () => {
    const el = mockElement({ type: "text" });
    (el as any).enterEditing = vi.fn();
    select.selectEls = [el as any];
    select.canDiveIn.mockReturnValue(false);

    const handler = getDblclickHandler();
    handler!();

    expect((el as any).enterEditing).toHaveBeenCalled();
    expect(select.select).toHaveBeenCalledWith([]);
  });
});

// ─── cleanup ─────────────────────────────────────────────────

describe("cleanup", () => {
  it("返回的 cleanup 函数移除所有监听", () => {
    cleanup();
    expect(select.root.removeEventListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function)
    );
    expect(select.root.removeEventListener).toHaveBeenCalledWith(
      "mouseenter",
      expect.any(Function)
    );
    expect(select.root.removeEventListener).toHaveBeenCalledWith(
      "mouseleave",
      expect.any(Function)
    );
    expect(select.root.container.removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
    expect(select.root.container.removeEventListener).toHaveBeenCalledWith(
      "dblclick",
      expect.any(Function)
    );
  });
});
