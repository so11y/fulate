import { describe, it, expect, vi, beforeEach } from "vitest";
import { Element, registerElement } from "@fulate/core";
import {
  serializeElements,
  serializeToJSON,
  deserializeElement,
  deserializeElements,
  isValidFileData,
  parseFileData,
  exportToFile,
  importFromJSON,
} from "../../src/file/index";
import type { ElementFilter, FileData } from "../../src/file/index";

// ─── Mock Element ────────────────────────────────────────────

class MockRect extends Element {
  type = "rect";
  backgroundColor?: string;
  paint() {}
  constructor(opts?: any) {
    super(opts);
    if (opts?.backgroundColor) this.backgroundColor = opts.backgroundColor;
  }
  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    if (this.backgroundColor) json.backgroundColor = this.backgroundColor;
    return json;
  }
}

class MockCircle extends Element {
  type = "circle";
  paint() {}
}

class MockText extends Element {
  type = "text";
  text = "";
  paint() {}
  constructor(opts?: any) {
    super(opts);
    if (opts?.text) this.text = opts.text;
  }
  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    if (this.text) json.text = this.text;
    return json;
  }
}

registerElement("f-rect", MockRect);
registerElement("f-circle", MockCircle);
registerElement("f-text", MockText);

function createEl(
  Ctor: new (opts?: any) => Element,
  overrides: Record<string, any> = {}
) {
  const el = new Ctor({ left: 0, top: 0, width: 100, height: 100, ...overrides });
  if ((el as any)._initProps) {
    el.attrs((el as any)._initProps);
    (el as any)._initProps = null;
  }
  return el;
}

// ─── serializeElements ──────────────────────────────────────

describe("serializeElements", () => {
  it("序列化单个元素", () => {
    const rect = createEl(MockRect, { left: 10, top: 20, width: 50, height: 30 });
    const result = serializeElements([rect]);

    expect(result.__fulate_file__).toBe(true);
    expect(result.version).toBe(1);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].type).toBe("rect");
    expect(result.elements[0].left).toBe(10);
  });

  it("序列化多个元素", () => {
    const rect = createEl(MockRect);
    const circle = createEl(MockCircle);
    const text = createEl(MockText, { text: "hello" });
    const result = serializeElements([rect, circle, text]);

    expect(result.elements).toHaveLength(3);
    expect(result.elements[0].type).toBe("rect");
    expect(result.elements[1].type).toBe("circle");
    expect(result.elements[2].type).toBe("text");
  });

  it("空元素数组 → 返回空 elements", () => {
    const result = serializeElements([]);
    expect(result.__fulate_file__).toBe(true);
    expect(result.elements).toHaveLength(0);
  });

  it("传入过滤函数 → 过滤掉不需要的元素", () => {
    const rect = createEl(MockRect);
    const circle = createEl(MockCircle);
    const text = createEl(MockText);
    const filter: ElementFilter = (el) => el.type !== "circle";

    const result = serializeElements([rect, circle, text], filter);
    expect(result.elements).toHaveLength(2);
    expect(result.elements.every((e: any) => e.type !== "circle")).toBe(true);
  });

  it("过滤函数过滤掉全部 → elements 为空", () => {
    const rect = createEl(MockRect);
    const result = serializeElements([rect], () => false);
    expect(result.elements).toHaveLength(0);
  });

  it("保留元素自定义属性", () => {
    const rect = createEl(MockRect, { backgroundColor: "#ff0000" });
    const result = serializeElements([rect]);
    expect(result.elements[0].backgroundColor).toBe("#ff0000");
  });
});

// ─── serializeToJSON ────────────────────────────────────────

describe("serializeToJSON", () => {
  it("返回合法 JSON 字符串", () => {
    const rect = createEl(MockRect, { left: 5, top: 10 });
    const json = serializeToJSON([rect]);

    const parsed = JSON.parse(json);
    expect(parsed.__fulate_file__).toBe(true);
    expect(parsed.elements).toHaveLength(1);
  });

  it("支持过滤函数", () => {
    const rect = createEl(MockRect);
    const circle = createEl(MockCircle);
    const json = serializeToJSON([rect, circle], (el) => el.type === "rect");

    const parsed = JSON.parse(json);
    expect(parsed.elements).toHaveLength(1);
    expect(parsed.elements[0].type).toBe("rect");
  });
});

// ─── deserializeElement ─────────────────────────────────────

describe("deserializeElement", () => {
  it("反序列化已注册的 type", () => {
    const data = { type: "rect", left: 10, top: 20, width: 50, height: 30 };
    const el = deserializeElement(data);

    expect(el).toBeDefined();
    expect(el!.type).toBe("rect");
    expect(el!.left).toBe(10);
  });

  it("type 已有 f- 前缀 → 不重复拼", () => {
    const data = { type: "f-rect", left: 0, top: 0 };
    const el = deserializeElement(data);
    expect(el).toBeDefined();
    expect(el!.type).toBe("rect");
  });

  it("未注册的 type → 返回 undefined", () => {
    const data = { type: "unknown-widget", left: 0, top: 0 };
    const el = deserializeElement(data);
    expect(el).toBeUndefined();
  });

  it("data 无 type → 返回 undefined", () => {
    const el = deserializeElement({ left: 0, top: 0 });
    expect(el).toBeUndefined();
  });

  it("删除 key 属性避免 id 冲突", () => {
    const data = { type: "rect", key: "old-key-123", left: 0, top: 0 };
    const el = deserializeElement(data);
    expect(el).toBeDefined();
    expect((el as any).key).not.toBe("old-key-123");
  });

  it("递归反序列化 children", () => {
    const data = {
      type: "rect",
      left: 0,
      top: 0,
      children: [
        { type: "circle", left: 5, top: 5 },
        { type: "rect", left: 10, top: 10 },
      ],
    };
    const el = deserializeElement(data);
    expect(el).toBeDefined();
    expect(el!.children).toHaveLength(2);
  });

  it("children 中部分 type 未注册 → 只保留成功的", () => {
    const data = {
      type: "rect",
      left: 0,
      top: 0,
      children: [
        { type: "circle", left: 5, top: 5 },
        { type: "non-exist", left: 0, top: 0 },
        { type: "rect", left: 10, top: 10 },
      ],
    };
    const el = deserializeElement(data);
    expect(el).toBeDefined();
    expect(el!.children).toHaveLength(2);
  });

  it("空 children 数组 → 不挂载子元素", () => {
    const data = { type: "rect", left: 0, top: 0, children: [] };
    const el = deserializeElement(data);
    expect(el).toBeDefined();
  });
});

// ─── deserializeElements ────────────────────────────────────

describe("deserializeElements", () => {
  it("批量反序列化多个元素", () => {
    const data = [
      { type: "rect", left: 0, top: 0 },
      { type: "circle", left: 10, top: 10 },
    ];
    const els = deserializeElements(data);
    expect(els).toHaveLength(2);
    expect(els[0].type).toBe("rect");
    expect(els[1].type).toBe("circle");
  });

  it("跳过反序列化失败的元素", () => {
    const data = [
      { type: "rect", left: 0, top: 0 },
      { type: "unknown", left: 0, top: 0 },
      { type: "circle", left: 10, top: 10 },
    ];
    const els = deserializeElements(data);
    expect(els).toHaveLength(2);
  });

  it("传入过滤函数 → 反序列化后再过滤", () => {
    const data = [
      { type: "rect", left: 0, top: 0 },
      { type: "circle", left: 10, top: 10 },
      { type: "text", left: 20, top: 20 },
    ];
    const filter: ElementFilter = (el) => el.type !== "circle";
    const els = deserializeElements(data, filter);
    expect(els).toHaveLength(2);
    expect(els.every((el) => el.type !== "circle")).toBe(true);
  });

  it("空数组 → 返回空", () => {
    const els = deserializeElements([]);
    expect(els).toHaveLength(0);
  });

  it("过滤函数过滤掉全部 → 返回空", () => {
    const data = [{ type: "rect", left: 0, top: 0 }];
    const els = deserializeElements(data, () => false);
    expect(els).toHaveLength(0);
  });
});

// ─── isValidFileData ────────────────────────────────────────

describe("isValidFileData", () => {
  it("合法 FileData → true", () => {
    const data: FileData = {
      __fulate_file__: true,
      version: 1,
      elements: [],
    };
    expect(isValidFileData(data)).toBe(true);
  });

  it("缺少标记 → false", () => {
    expect(isValidFileData({ version: 1, elements: [] })).toBe(false);
  });

  it("标记为 false → false", () => {
    expect(
      isValidFileData({ __fulate_file__: false, version: 1, elements: [] })
    ).toBe(false);
  });

  it("elements 不是数组 → false", () => {
    expect(
      isValidFileData({ __fulate_file__: true, version: 1, elements: "bad" })
    ).toBe(false);
  });

  it("null → false", () => {
    expect(isValidFileData(null)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isValidFileData(undefined)).toBe(false);
  });

  it("普通对象 → false", () => {
    expect(isValidFileData({ foo: "bar" })).toBe(false);
  });
});

// ─── parseFileData ──────────────────────────────────────────

describe("parseFileData", () => {
  it("合法 JSON → 返回 FileData", () => {
    const fileData: FileData = {
      __fulate_file__: true,
      version: 1,
      elements: [{ type: "rect", left: 0, top: 0 }],
    };
    const result = parseFileData(JSON.stringify(fileData));
    expect(result).not.toBeNull();
    expect(result!.elements).toHaveLength(1);
  });

  it("非法 JSON → 返回 null", () => {
    expect(parseFileData("not json at all")).toBeNull();
  });

  it("合法 JSON 但不是 FileData → 返回 null", () => {
    expect(parseFileData(JSON.stringify({ foo: 1 }))).toBeNull();
  });

  it("合法 JSON 数组 → 返回 null（不是对象）", () => {
    expect(parseFileData(JSON.stringify([1, 2, 3]))).toBeNull();
  });

  it("空字符串 → 返回 null", () => {
    expect(parseFileData("")).toBeNull();
  });
});

// ─── importFromJSON ─────────────────────────────────────────

describe("importFromJSON", () => {
  it("合法 JSON → 返回反序列化的元素", () => {
    const fileData: FileData = {
      __fulate_file__: true,
      version: 1,
      elements: [
        { type: "rect", left: 10, top: 20, width: 50, height: 30 },
        { type: "circle", left: 40, top: 50 },
      ],
    };
    const els = importFromJSON(JSON.stringify(fileData));
    expect(els).toHaveLength(2);
    expect(els[0].type).toBe("rect");
    expect(els[0].left).toBe(10);
    expect(els[1].type).toBe("circle");
  });

  it("非法 JSON → 返回空数组", () => {
    const els = importFromJSON("bad json");
    expect(els).toHaveLength(0);
  });

  it("合法 JSON 但非 FileData → 返回空数组", () => {
    const els = importFromJSON(JSON.stringify({ random: true }));
    expect(els).toHaveLength(0);
  });

  it("传入过滤函数 → 过滤反序列化后的元素", () => {
    const fileData: FileData = {
      __fulate_file__: true,
      version: 1,
      elements: [
        { type: "rect", left: 0, top: 0 },
        { type: "circle", left: 0, top: 0 },
        { type: "text", left: 0, top: 0 },
      ],
    };
    const els = importFromJSON(JSON.stringify(fileData), (el) => el.type === "rect");
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("rect");
  });

  it("elements 中部分 type 未注册 → 跳过", () => {
    const fileData: FileData = {
      __fulate_file__: true,
      version: 1,
      elements: [
        { type: "rect", left: 0, top: 0 },
        { type: "not-registered", left: 0, top: 0 },
      ],
    };
    const els = importFromJSON(JSON.stringify(fileData));
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("rect");
  });
});

// ─── exportToFile ───────────────────────────────────────────

describe("exportToFile", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => "blob:mock-url");
    revokeObjectURLSpy = vi.fn();
    clickSpy = vi.fn();

    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { click: clickSpy, href: "", download: "" } as any;
      }
      return document.createElement(tag);
    });
  });

  it("创建下载链接并点击", () => {
    const rect = createEl(MockRect, { left: 10, top: 20 });
    exportToFile([rect]);

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledOnce();
  });

  it("使用自定义文件名", () => {
    const rect = createEl(MockRect);
    let downloadName = "";
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const a = { click: clickSpy, href: "", download: "" };
        Object.defineProperty(a, "download", {
          set(v: string) { downloadName = v; },
          get() { return downloadName; },
        });
        return a as any;
      }
      return document.createElement(tag);
    });

    exportToFile([rect], "my-design.json");
    expect(downloadName).toBe("my-design.json");
  });

  it("传入过滤函数 → 只导出过滤后的元素", () => {
    const rect = createEl(MockRect);
    const circle = createEl(MockCircle);

    let blobContent = "";
    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      blob.text().then((t) => (blobContent = t));
      return "blob:mock";
    });

    exportToFile([rect, circle], "test.json", (el) => el.type === "rect");

    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });
});

// ─── 序列化 → 反序列化 往返测试 ─────────────────────────────

describe("serialize → deserialize roundtrip", () => {
  it("单元素往返保持属性一致", () => {
    const rect = createEl(MockRect, {
      left: 42,
      top: 84,
      width: 200,
      height: 150,
      backgroundColor: "#abcdef",
    });

    const json = serializeToJSON([rect]);
    const els = importFromJSON(json);

    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("rect");
    expect(els[0].left).toBe(42);
    expect(els[0].top).toBe(84);
    expect(els[0].width).toBe(200);
    expect(els[0].height).toBe(150);
  });

  it("多元素往返", () => {
    const rect = createEl(MockRect, { left: 10, top: 20 });
    const circle = createEl(MockCircle, { left: 30, top: 40 });
    const text = createEl(MockText, { left: 50, top: 60, text: "hello" });

    const json = serializeToJSON([rect, circle, text]);
    const els = importFromJSON(json);

    expect(els).toHaveLength(3);
    expect(els[0].type).toBe("rect");
    expect(els[1].type).toBe("circle");
    expect(els[2].type).toBe("text");
  });

  it("序列化时过滤 → 反序列化不含被过滤元素", () => {
    const rect = createEl(MockRect);
    const circle = createEl(MockCircle);

    const json = serializeToJSON([rect, circle], (el) => el.type !== "circle");
    const els = importFromJSON(json);

    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("rect");
  });

  it("反序列化时过滤 → 只返回匹配的元素", () => {
    const rect = createEl(MockRect);
    const circle = createEl(MockCircle);

    const json = serializeToJSON([rect, circle]);
    const els = importFromJSON(json, (el) => el.type === "circle");

    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("circle");
  });

  it("空列表往返", () => {
    const json = serializeToJSON([]);
    const els = importFromJSON(json);
    expect(els).toHaveLength(0);
  });
});
