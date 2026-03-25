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
});
