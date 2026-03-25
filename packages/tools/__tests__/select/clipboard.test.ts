import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyElements, pasteElements } from "../../src/select/clipboard";
import { registerElement } from "@fulate/core";
import { Element } from "@fulate/core";
import {
  createMockSelect,
  mockElement,
  type MockSelect,
} from "../helpers";

class MockRect extends Element {
  type = "rect";
  paint() {}
}

registerElement("f-rect", MockRect);

let select: MockSelect;

function mockNavigatorClipboard() {
  let stored = "";
  const clipboard = {
    writeText: vi.fn(async (text: string) => {
      stored = text;
    }),
    readText: vi.fn(async () => stored),
  };
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    writable: true,
    configurable: true,
  });
  return clipboard;
}

function createSelectableElement(overrides: Record<string, any> = {}) {
  const el = mockElement({ type: "rect", left: 10, top: 20, width: 50, height: 30, ...overrides });
  el.toJson = vi.fn((includeChildren?: boolean) => ({
    type: "rect",
    left: el.left,
    top: el.top,
    width: el.width,
    height: el.height,
  }));
  return el;
}

beforeEach(async () => {
  mockNavigatorClipboard();

  const layer = {
    append: vi.fn(),
    removeChild: vi.fn(),
    children: [],
  };

  select = createMockSelect();
  select.root.layers = [layer] as any;
  select.root.nextTick.mockImplementation((fn: () => void) => fn());

  await resetMemClipboard();
});

async function resetMemClipboard() {
  const emptySelect = createMockSelect();
  emptySelect.selectEls = [];
  await copyElements(emptySelect as any);

  (navigator.clipboard.writeText as any).mockClear();
}

// ─── copyElements ────────────────────────────────────────────

describe("copyElements", () => {
  it("无选中 → 不写剪贴板", async () => {
    select.selectEls = [];
    await copyElements(select as any);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("选中元素 → 写入 JSON 到剪贴板", async () => {
    const el = createSelectableElement();
    select.selectEls = [el as any];
    await copyElements(select as any);

    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const data = JSON.parse(
      (navigator.clipboard.writeText as any).mock.calls[0][0]
    );
    expect(data.__fulate_clipboard__).toBe(true);
    expect(data.elements).toHaveLength(1);
    expect(data.elements[0].type).toBe("rect");
  });

  it("保存选框几何信息", async () => {
    const el = createSelectableElement();
    select.selectEls = [el as any];
    Object.assign(select, { left: 5, top: 10, width: 200, height: 100 });
    await copyElements(select as any);

    const data = JSON.parse(
      (navigator.clipboard.writeText as any).mock.calls[0][0]
    );
    expect(data.selectGeometry.left).toBe(5);
    expect(data.selectGeometry.width).toBe(200);
  });

  it("剪贴板不可用 → 静默降级不抛异常", async () => {
    (navigator.clipboard.writeText as any).mockRejectedValueOnce(
      new Error("Not allowed")
    );
    const el = createSelectableElement();
    select.selectEls = [el as any];
    await expect(copyElements(select as any)).resolves.not.toThrow();
  });

  it("多个选中元素 → elements 数量与类型正确", async () => {
    const el1 = createSelectableElement({ left: 10, top: 20 });
    const el2 = createSelectableElement({ left: 30, top: 40 });
    select.selectEls = [el1 as any, el2 as any];
    await copyElements(select as any);

    const data = JSON.parse(
      (navigator.clipboard.writeText as any).mock.calls[0][0]
    );
    expect(data.elements).toHaveLength(2);
    expect(data.elements[0].type).toBe("rect");
    expect(data.elements[1].type).toBe("rect");
  });

  it("序列化调用 toJson(true) 包含 children", async () => {
    const el = createSelectableElement();
    select.selectEls = [el as any];
    await copyElements(select as any);
    expect(el.toJson).toHaveBeenCalledWith(true);
  });

  it("每个 element entry 包含 type 和 props", async () => {
    const el = createSelectableElement();
    select.selectEls = [el as any];
    await copyElements(select as any);

    const data = JSON.parse(
      (navigator.clipboard.writeText as any).mock.calls[0][0]
    );
    const entry = data.elements[0];
    expect(entry).toHaveProperty("type");
    expect(entry).toHaveProperty("props");
    expect(entry.props.left).toBe(el.left);
  });

  it("selectGeometry 包含完整几何字段", async () => {
    const el = createSelectableElement();
    select.selectEls = [el as any];
    Object.assign(select, {
      left: 1, top: 2, width: 3, height: 4,
      angle: 45, scaleX: 2, scaleY: 0.5, skewX: 10, skewY: 15,
    });
    await copyElements(select as any);

    const data = JSON.parse(
      (navigator.clipboard.writeText as any).mock.calls[0][0]
    );
    const geo = data.selectGeometry;
    expect(geo).toEqual({
      left: 1, top: 2, width: 3, height: 4,
      angle: 45, scaleX: 2, scaleY: 0.5, skewX: 10, skewY: 15,
    });
  });
});

// ─── pasteElements（内存粘贴） ──────────────────────────────

describe("pasteElements — from memory", () => {
  async function doCopy() {
    const el = createSelectableElement({ left: 100, top: 200 });
    (el as any)._layer = select.root.layers[0];
    select.selectEls = [el as any];
    Object.assign(select, { left: 100, top: 200, width: 50, height: 30 });
    await copyElements(select as any);
    return el;
  }

  it("复制后粘贴 → 调用 history.pushAction", async () => {
    await doCopy();
    await pasteElements(select as any);
    expect(select.history.pushAction).toHaveBeenCalledOnce();
  });

  it("粘贴后调用 select.select 选中新元素", async () => {
    await doCopy();
    await pasteElements(select as any);
    expect(select.select).toHaveBeenCalled();
  });

  it("粘贴的元素 append 到 layer", async () => {
    await doCopy();
    await pasteElements(select as any);
    const layer = select.root.layers[0];
    expect(layer.append).toHaveBeenCalled();
  });

  it("undo 回调 → 移除粘贴的元素", async () => {
    await doCopy();
    await pasteElements(select as any);

    const [undoFn] = (select.history.pushAction as any).mock.calls[0];
    undoFn();
    expect(select.select).toHaveBeenCalledWith([]);
  });

  it("redo 回调 → 重新 append 元素并选中", async () => {
    await doCopy();
    await pasteElements(select as any);

    const layer = select.root.layers[0];
    const [, redoFn] = (select.history.pushAction as any).mock.calls[0];
    (layer.append as any).mockClear();
    (select.select as any).mockClear();

    redoFn();
    expect(layer.append).toHaveBeenCalled();
    expect(select.select).toHaveBeenCalled();
  });

  it("粘贴后 select.select 收到偏移后的几何", async () => {
    await doCopy();
    await pasteElements(select as any);

    const selectCalls = (select.select as any).mock.calls;
    const lastCall = selectCalls[selectCalls.length - 1];
    if (lastCall[1]) {
      expect(lastCall[1].left).toBe(100 + 20);
      expect(lastCall[1].top).toBe(200 + 20);
    }
  });

  it("多元素复制粘贴 → 全部 append 到 layer", async () => {
    const el1 = createSelectableElement({ left: 10, top: 20 });
    const el2 = createSelectableElement({ left: 30, top: 40 });
    (el1 as any)._layer = select.root.layers[0];
    (el2 as any)._layer = select.root.layers[0];
    select.selectEls = [el1 as any, el2 as any];
    Object.assign(select, { left: 10, top: 20, width: 100, height: 80 });
    await copyElements(select as any);

    (select.root.layers[0].append as any).mockClear();
    await pasteElements(select as any);
    expect(select.root.layers[0].append).toHaveBeenCalledTimes(2);
  });
});

// ─── pasteElements（系统剪贴板）─────────────────────────────
// 这些用例必须在 memClipboard 为 null 时运行。
// 由于 memClipboard 是模块级变量，只能通过 import 顺序保证初始为 null。
// 将这些用例放在独立文件或用 vi.resetModules() 隔离。
// 这里用 resetModules 重新导入以清除模块状态。

describe("pasteElements — from system clipboard", () => {
  let freshCopy: typeof copyElements;
  let freshPaste: typeof pasteElements;
  let freshSelect: MockSelect;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../../src/select/clipboard");
    freshCopy = mod.copyElements;
    freshPaste = mod.pasteElements;

    const { registerElement: reReg } = await import("@fulate/core");
    reReg("f-rect", MockRect);

    mockNavigatorClipboard();
    const layer = { append: vi.fn(), removeChild: vi.fn(), children: [] };
    freshSelect = createMockSelect();
    freshSelect.root.layers = [layer] as any;
    freshSelect.root.nextTick.mockImplementation((fn: () => void) => fn());
  });

  it("剪贴板含有效数据 → 反序列化并粘贴", async () => {
    const clipData = {
      __fulate_clipboard__: true,
      selectGeometry: {
        left: 0, top: 0, width: 50, height: 30,
        angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      },
      elements: [
        { type: "rect", id: "old1", props: { type: "rect", left: 10, top: 20, width: 50, height: 30 } },
      ],
    };
    (navigator.clipboard.readText as any).mockResolvedValueOnce(
      JSON.stringify(clipData)
    );

    await freshPaste(freshSelect as any);
    const layer = freshSelect.root.layers[0];
    expect(layer.append).toHaveBeenCalled();
  });

  it("剪贴板无效数据 → 不粘贴", async () => {
    (navigator.clipboard.readText as any).mockResolvedValueOnce("not json");
    await freshPaste(freshSelect as any);
    expect(freshSelect.history.pushAction).not.toHaveBeenCalled();
  });

  it("剪贴板不可用 → 不抛异常", async () => {
    (navigator.clipboard.readText as any).mockRejectedValueOnce(
      new Error("Not allowed")
    );
    await expect(freshPaste(freshSelect as any)).resolves.not.toThrow();
  });

  it("多元素从系统剪贴板反序列化粘贴", async () => {
    const clipData = {
      __fulate_clipboard__: true,
      selectGeometry: {
        left: 0, top: 0, width: 100, height: 80,
        angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      },
      elements: [
        { type: "rect", id: "a1", props: { type: "rect", left: 10, top: 20, width: 50, height: 30 } },
        { type: "rect", id: "a2", props: { type: "rect", left: 60, top: 70, width: 40, height: 40 } },
      ],
    };
    (navigator.clipboard.readText as any).mockResolvedValueOnce(
      JSON.stringify(clipData)
    );

    await freshPaste(freshSelect as any);
    const layer = freshSelect.root.layers[0];
    expect(layer.append).toHaveBeenCalledTimes(2);
    expect(freshSelect.history.pushAction).toHaveBeenCalledOnce();
  });

  it("部分 entry type 未注册 → 只粘贴成功的", async () => {
    const clipData = {
      __fulate_clipboard__: true,
      selectGeometry: {
        left: 0, top: 0, width: 100, height: 80,
        angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      },
      elements: [
        { type: "rect", id: "a1", props: { type: "rect", left: 10, top: 20 } },
        { type: "non-registered-type", id: "a2", props: { type: "non-registered-type", left: 0, top: 0 } },
      ],
    };
    (navigator.clipboard.readText as any).mockResolvedValueOnce(
      JSON.stringify(clipData)
    );

    await freshPaste(freshSelect as any);
    const layer = freshSelect.root.layers[0];
    expect(layer.append).toHaveBeenCalledTimes(1);
  });

  it("缺少 __fulate_clipboard__ 标记 → 不粘贴", async () => {
    const clipData = {
      elements: [
        { type: "rect", id: "a1", props: { type: "rect", left: 10, top: 20 } },
      ],
    };
    (navigator.clipboard.readText as any).mockResolvedValueOnce(
      JSON.stringify(clipData)
    );

    await freshPaste(freshSelect as any);
    expect(freshSelect.history.pushAction).not.toHaveBeenCalled();
  });

  it("反序列化后元素 left/top 带偏移(PASTE_OFFSET=20)", async () => {
    const clipData = {
      __fulate_clipboard__: true,
      selectGeometry: {
        left: 0, top: 0, width: 50, height: 30,
        angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      },
      elements: [
        { type: "rect", id: "old1", props: { type: "rect", left: 10, top: 20, width: 50, height: 30 } },
      ],
    };
    (navigator.clipboard.readText as any).mockResolvedValueOnce(
      JSON.stringify(clipData)
    );

    await freshPaste(freshSelect as any);
    const layer = freshSelect.root.layers[0];
    const appendedEl = (layer.append as any).mock.calls[0][0];
    expect(appendedEl.left).toBe(30);
    expect(appendedEl.top).toBe(40);
  });
});
