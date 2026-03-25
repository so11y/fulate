import { describe, it, expect, beforeEach } from "vitest";
import { registerElement, getElementCtor } from "../src/registry";

class FakeRect {
  type = "rect";
}
class FakeCircle {
  type = "circle";
}
class FakeRectV2 {
  type = "rect-v2";
}

describe("registry", () => {
  it("注册后能通过 getElementCtor 查到", () => {
    registerElement("f-rect", FakeRect as any);
    expect(getElementCtor("f-rect")).toBe(FakeRect);
  });

  it("未注册的 tag 返回 undefined", () => {
    expect(getElementCtor("f-nonexistent")).toBeUndefined();
  });

  it("同 tag 二次注册覆盖旧值", () => {
    registerElement("f-override", FakeRect as any);
    expect(getElementCtor("f-override")).toBe(FakeRect);

    registerElement("f-override", FakeRectV2 as any);
    expect(getElementCtor("f-override")).toBe(FakeRectV2);
  });

  it("不同 tag 互不干扰", () => {
    registerElement("f-a", FakeRect as any);
    registerElement("f-b", FakeCircle as any);

    expect(getElementCtor("f-a")).toBe(FakeRect);
    expect(getElementCtor("f-b")).toBe(FakeCircle);
  });
});
