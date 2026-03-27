import { describe, it, expect, beforeEach, vi } from "vitest";
import { Text } from "../src/text/index";
import { TEXT_STYLE_DEFAULTS } from "../src/text/style";
import {
  createMockRoot,
  createMockLayer,
  resetNodeStatics,
} from "../../core/__tests__/helpers";

// ==================== 辅助 ====================

function createMockCtx() {
  return {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    textAlign: "left" as string,
    textBaseline: "top" as string,
    globalAlpha: 1,
    lineWidth: 1,
    measureText: vi.fn((text: string) => ({
      width: text.length * 8,
    })),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    transform: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

/**
 * 创建可直接测试的 Text 实例。
 * mockRoot.textDefaults 已填充完整默认值。
 */
function createText(opts?: any) {
  const t = new Text(opts);
  const mockRoot = createMockRoot();
  mockRoot.textDefaults = { ...TEXT_STYLE_DEFAULTS };
  t._provides = { root: mockRoot };
  t._root = mockRoot as any;
  return t;
}

/**
 * 为 syncTextLayout 准备好尺寸：
 * 设定显式宽度，以及足够大的显式高度避免行截断。
 */
function prepareLayout(t: Text, width = 500, height = 1000) {
  t._hasExplicitWidth = true;
  t.width = width;
  t._hasExplicitHeight = true;
  t.height = height;
}

function createActivatedText(opts?: any) {
  const t = new Text(opts);
  const mockRoot = createMockRoot();
  mockRoot.textDefaults = { ...TEXT_STYLE_DEFAULTS };
  const mockLayer = createMockLayer();
  t._provides = { root: mockRoot, layer: mockLayer };
  t._root = mockRoot as any;
  t._layer = mockLayer as any;
  t.isMounted = true;
  t.isActiveed = true;
  return { text: t, mockRoot, mockLayer };
}

// ==================== 构造与默认值 ====================

describe("Text 构造与默认值", () => {
  beforeEach(() => resetNodeStatics());

  it("type 为 text", () => {
    expect(createText().type).toBe("text");
  });

  it("默认字体属性（来自 root.textDefaults）", () => {
    const t = createText();
    const style = t.getResolvedTextStyle();
    expect(style.fontSize).toBe(14);
    expect(style.fontFamily).toBe("Arial");
    expect(style.fontWeight).toBe("normal");
    expect(style.fontStyle).toBe("normal");
    expect(style.color).toBe("#000000");
  });

  it("默认布局属性（来自 root.textDefaults）", () => {
    const t = createText();
    const style = t.getResolvedTextStyle();
    expect(t.text).toBe("");
    expect(style.textAlign).toBe("center");
    expect(style.textBaseline).toBe("top");
    expect(style.verticalAlign).toBe("middle");
    expect(style.underline).toBe(false);
    expect(style.lineHeight).toBe(1.5);
    expect(style.wordWrap).toBe(true);
    expect(t.overflow).toBe("hidden");
  });

  it("默认编辑属性", () => {
    const t = createText();
    expect(t.editable).toBe(false);
    expect(t.isEditing).toBe(false);
    expect(t.placeholder).toBe("");
    expect(t.placeholderColor).toBe("");
  });

  it("options 覆盖默认值", () => {
    const t = createText({
      text: "hello",
      fontSize: 20,
      color: "#ff0000",
      textAlign: "center",
      editable: true,
    });
    expect(t.text).toBe("hello");
    expect(t.fontSize).toBe(20);
    expect(t.color).toBe("#ff0000");
    expect(t.textAlign).toBe("center");
    expect(t.editable).toBe(true);
  });
});

// ==================== getFontString ====================

describe("Text.getFontString", () => {
  it("拼接正确的 CSS font 字符串", () => {
    const t = createText();
    const font = t.getFontString({
      fontSize: 16,
      fontFamily: "Helvetica",
      fontWeight: "bold",
      fontStyle: "italic",
      color: "#000",
      textAlign: "left",
      textBaseline: "top",
      verticalAlign: "top",
      underline: false,
      lineHeight: 1.5,
      wordWrap: true,
      maxLines: undefined as any,
    });
    expect(font).toBe("italic bold 16px Helvetica");
  });

  it("fontString getter 使用 resolved style", () => {
    const t = createText({ fontSize: 24, fontFamily: "monospace" });
    expect(t.fontString).toContain("24px");
    expect(t.fontString).toContain("monospace");
  });
});

// ==================== getResolvedTextStyle ====================

describe("Text.getResolvedTextStyle", () => {
  beforeEach(() => resetNodeStatics());

  it("无显式设置 → 返回 root.textDefaults 的值", () => {
    const t = createText();
    const style = t.getResolvedTextStyle();
    expect(style.fontSize).toBe(14);
    expect(style.color).toBe("#000000");
  });

  it("显式设置 → 使用实例值", () => {
    const t = createText({ fontSize: 18, color: "#333" });
    const style = t.getResolvedTextStyle();
    expect(style.fontSize).toBe(18);
    expect(style.color).toBe("#333");
  });

  it("修改 root.textDefaults → 未显式设置的属性跟着变", () => {
    const t = createText();
    (t._root as any).textDefaults = { ...TEXT_STYLE_DEFAULTS, fontSize: 24, color: "#aaa" };
    const style = t.getResolvedTextStyle();
    expect(style.fontSize).toBe(24);
    expect(style.color).toBe("#aaa");
  });

  it("显式设置的属性不被 textDefaults 覆盖", () => {
    const t = createText({ fontSize: 18 });
    (t._root as any).textDefaults = { ...TEXT_STYLE_DEFAULTS, fontSize: 24, color: "#aaa" };
    const style = t.getResolvedTextStyle();
    expect(style.fontSize).toBe(18);
    expect(style.color).toBe("#aaa");
  });

  it("textDefaults 中未提供的 key → 使用 TEXT_STYLE_DEFAULTS", () => {
    const t = createText();
    (t._root as any).textDefaults = { fontSize: 32 };
    const style = t.getResolvedTextStyle();
    expect(style.fontSize).toBe(32);
    expect(style.fontFamily).toBe("Arial");
  });
});

// ==================== attrs & style resolution ====================

describe("Text.attrs 样式设置", () => {
  beforeEach(() => resetNodeStatics());

  it("通过 attrs 设置 → 覆盖 textDefaults", () => {
    const t = createText();
    (t._root as any).textDefaults = { ...TEXT_STYLE_DEFAULTS, fontSize: 24 };
    t.attrs({ fontSize: 16 });
    expect(t.getResolvedTextStyle().fontSize).toBe(16);
  });

  it("attrs 传入 undefined → 回退到 textDefaults", () => {
    const t = createText({ fontSize: 16 });
    (t._root as any).textDefaults = { ...TEXT_STYLE_DEFAULTS, fontSize: 24 };
    expect(t.getResolvedTextStyle().fontSize).toBe(16);

    t.attrs({ fontSize: undefined });
    expect(t.getResolvedTextStyle().fontSize).toBe(24);
  });

  it("非 TEXT_STYLE_KEYS 的属性不影响样式解析", () => {
    const t = createText();
    (t._root as any).textDefaults = { ...TEXT_STYLE_DEFAULTS, fontSize: 24 };
    t.attrs({ text: "hello", width: 200 });
    expect(t.getResolvedTextStyle().fontSize).toBe(24);
    expect(t.text).toBe("hello");
  });
});

// ==================== syncTextLayout ====================

describe("Text.syncTextLayout", () => {
  beforeEach(() => resetNodeStatics());

  it("空文本 → _lines 空, _textHeight 为 0", () => {
    const t = createText();
    t.text = "";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toEqual([]);
    expect(t._textHeight).toBe(0);
  });

  it("空文本且无显式高度 → height 设为 0", () => {
    const t = createText();
    t.text = "";
    t._hasExplicitWidth = true;
    t.width = 500;
    t._hasExplicitHeight = false;
    t.fitHeight = false;
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t.height).toBe(0);
  });

  it("单行文本", () => {
    const t = createText();
    t.text = "Hello";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toEqual(["Hello"]);
  });

  it("换行符 → 多行", () => {
    const t = createText();
    t.text = "A\nB\nC";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toEqual(["A", "B", "C"]);
  });

  it("\\r\\n 规范化为 \\n", () => {
    const t = createText();
    t.text = "A\r\nB";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toEqual(["A", "B"]);
  });

  it("_textHeight = 行数 × fontSize × lineHeight", () => {
    const t = createText({ fontSize: 14, lineHeight: 1.5 });
    t.text = "A\nB";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._textHeight).toBeCloseTo(2 * 14 * 1.5);
  });

  it("maxLines 截断", () => {
    const t = createText({ maxLines: 2 });
    t.text = "A\nB\nC\nD";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toHaveLength(2);
  });

  it("wordWrap=false → 不自动换行", () => {
    const t = createText({ wordWrap: false });
    t.text = "A very long line that would wrap";
    prepareLayout(t, 50);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toHaveLength(1);
  });

  it("wordWrap=true → 超宽时折行", () => {
    const t = createText({ wordWrap: true });
    t.text = "ABCDEF";
    // 每字符 8px, width=24 → 每行最多 3 字符
    prepareLayout(t, 24);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines.length).toBeGreaterThan(1);
  });

  it("_lineCharOffsets 长度与 _lines 一致", () => {
    const t = createText();
    t.text = "A\nBCD";
    prepareLayout(t);
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lineCharOffsets).toHaveLength(t._lines.length);
  });

  it("overflow=hidden + 有限高度 → 按高度截断行数", () => {
    const lineHeightPx = 14 * 1.5; // 21
    const t = createText({ fontSize: 14, lineHeight: 1.5, overflow: "hidden" });
    t.text = "A\nB\nC\nD\nE";
    t._hasExplicitWidth = true;
    t.width = 500;
    t._hasExplicitHeight = true;
    t.height = lineHeightPx * 2; // 仅容纳 2 行
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines.length).toBeLessThanOrEqual(2);
  });

  it("overflow=visible → 不截断", () => {
    const t = createText({ overflow: "visible" });
    t.text = "A\nB\nC\nD\nE";
    t._hasExplicitWidth = true;
    t.width = 500;
    t._hasExplicitHeight = true;
    t.height = 10; // 很小的高度
    const ctx = createMockCtx();
    t.syncTextLayout(ctx);
    expect(t._lines).toEqual(["A", "B", "C", "D", "E"]);
  });
});

// ==================== toJson ====================

describe("Text.toJson", () => {
  beforeEach(() => resetNodeStatics());

  it("序列化显式设置的文本属性", () => {
    const t = createText({
      text: "test",
      fontSize: 18,
      fontFamily: "Helvetica",
      fontWeight: "bold",
      fontStyle: "italic",
      color: "#ff0000",
      textAlign: "right",
      verticalAlign: "bottom",
      underline: true,
      lineHeight: 2,
      wordWrap: false,
      maxLines: 3,
      overflow: "visible",
      editable: true,
      placeholder: "Type here",
      placeholderColor: "#ccc",
    });
    const json = t.toJson();

    expect(json.text).toBe("test");
    expect(json.fontSize).toBe(18);
    expect(json.fontFamily).toBe("Helvetica");
    expect(json.fontWeight).toBe("bold");
    expect(json.fontStyle).toBe("italic");
    expect(json.color).toBe("#ff0000");
    expect(json.textAlign).toBe("right");
    expect(json.verticalAlign).toBe("bottom");
    expect(json.underline).toBe(true);
    expect(json.lineHeight).toBe(2);
    expect(json.wordWrap).toBe(false);
    expect(json.maxLines).toBe(3);
    expect(json.overflow).toBe("visible");
    expect(json.editable).toBe(true);
    expect(json.placeholder).toBe("Type here");
    expect(json.placeholderColor).toBe("#ccc");
  });

  it("默认 text 为空字符串 → toJson 不输出 text", () => {
    expect(createText().toJson().text).toBeUndefined();
  });

  it("未显式设置的样式属性不输出到 json", () => {
    const t = createText({ fontSize: 18 });
    const json = t.toJson();
    expect(json.fontSize).toBe(18);
    expect(json.fontFamily).toBeUndefined();
    expect(json.color).toBeUndefined();
  });
});

// ==================== 生命周期 ====================

describe("Text 生命周期", () => {
  beforeEach(() => resetNodeStatics());

  it("deactivate 调用 exitEditing", () => {
    const { text } = createActivatedText({ editable: true, text: "hi" });
    const spy = vi.spyOn(text, "exitEditing");
    text.deactivate();
    expect(spy).toHaveBeenCalled();
  });

  it("deactivate 清理 _clickToEditRemove", () => {
    const { text } = createActivatedText({ editable: true });
    const removeFn = vi.fn();
    (text as any)._clickToEditRemove = removeFn;
    text.deactivate();
    expect(removeFn).toHaveBeenCalled();
    expect((text as any)._clickToEditRemove).toBeNull();
  });
});
