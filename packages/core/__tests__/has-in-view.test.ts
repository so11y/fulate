import { describe, it, expect, beforeEach } from "vitest";
import { Element } from "../src/node/element";
import { Shape } from "../src/node/shape";
import {
  createMockRoot,
  createMockLayer,
  resetNodeStatics,
} from "./helpers";

const VIEW = { left: 0, top: 0, width: 800, height: 600 };

function activateElement<T extends Element>(
  el: T,
  viewRect = VIEW
): T {
  const mockRoot = createMockRoot(viewRect);
  const mockLayer = createMockLayer();
  el._provides = { root: mockRoot, layer: mockLayer };
  el._root = mockRoot as any;
  el._layer = mockLayer as any;
  el.isMounted = true;
  el.isActiveed = true;
  el.syncProps();
  el.calcWorldMatrix();
  return el;
}

// ==================== Element.hasInView ====================

describe("Element.hasInView", () => {
  beforeEach(() => resetNodeStatics());

  it("完全在视口内 → true", () => {
    const el = activateElement(new Element({ left: 100, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  it("完全在视口左侧 → false", () => {
    const el = activateElement(new Element({ left: -300, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(false);
  });

  it("完全在视口右侧 → false", () => {
    const el = activateElement(new Element({ left: 900, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(false);
  });

  it("完全在视口上方 → false", () => {
    const el = activateElement(new Element({ left: 100, top: -300, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(false);
  });

  it("完全在视口下方 → false", () => {
    const el = activateElement(new Element({ left: 100, top: 700, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(false);
  });

  it("左边部分可见 → true", () => {
    const el = activateElement(new Element({ left: -100, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  it("右边部分可见 → true", () => {
    const el = activateElement(new Element({ left: 700, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  it("顶部部分可见 → true", () => {
    const el = activateElement(new Element({ left: 100, top: -100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  it("底部部分可见 → true", () => {
    const el = activateElement(new Element({ left: 100, top: 500, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  it("visible=false → false", () => {
    const el = activateElement(new Element({ left: 100, top: 100, width: 200, height: 200 }));
    el.visible = false;
    expect(el.hasInView()).toBe(false);
  });

  it("width=0 → false", () => {
    const el = activateElement(new Element({ left: 100, top: 100, width: 0, height: 200 }));
    expect(el.hasInView()).toBe(false);
  });

  it("isActiveed=false → false", () => {
    const el = activateElement(new Element({ left: 100, top: 100, width: 200, height: 200 }));
    el.isActiveed = false;
    expect(el.hasInView()).toBe(false);
  });

  // ---- angle=180° 场景（m.a≈-1, m.d≈-1，快速路径负缩放）----

  it("angle=180° 完全在视口内 → true", () => {
    const el = activateElement(
      new Element({ left: 100, top: 100, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=180° 顶部部分可见 → true", () => {
    const el = activateElement(
      new Element({ left: 100, top: -100, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=180° 底部部分可见 → true", () => {
    const el = activateElement(
      new Element({ left: 100, top: 500, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=180° 完全在视口下方 → false", () => {
    const el = activateElement(
      new Element({ left: 100, top: 700, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(false);
  });

  it("angle=180° 完全在视口上方 → false", () => {
    const el = activateElement(
      new Element({ left: 100, top: -300, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(false);
  });

  // ---- scaleX=-1 / scaleY=-1（翻转）----

  it("scaleX=-1 完全在视口内 → true", () => {
    const el = activateElement(
      new Element({ left: 100, top: 100, width: 200, height: 200, scaleX: -1 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("scaleX=-1 左边部分可见 → true", () => {
    const el = activateElement(
      new Element({ left: -100, top: 100, width: 200, height: 200, scaleX: -1 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("scaleX=-1 完全在视口左侧 → false", () => {
    const el = activateElement(
      new Element({ left: -300, top: 100, width: 200, height: 200, scaleX: -1 })
    );
    expect(el.hasInView()).toBe(false);
  });

  it("scaleY=-1 底部部分可见 → true", () => {
    const el = activateElement(
      new Element({ left: 100, top: 500, width: 200, height: 200, scaleY: -1 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("scaleY=-1 完全在视口下方 → false", () => {
    const el = activateElement(
      new Element({ left: 100, top: 700, width: 200, height: 200, scaleY: -1 })
    );
    expect(el.hasInView()).toBe(false);
  });

  // ---- 高度很大 + angle=180° (复现原始 bug 场景) ----

  it("窄高元素 angle=180° 大部分在视口 → true", () => {
    const el = activateElement(
      new Element({ left: 0, top: 48, width: 34, height: 1008, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("窄高元素 angle=180° 完全在视口下方 → false", () => {
    const el = activateElement(
      new Element({ left: 0, top: 700, width: 34, height: 1008, angle: 180 }),
      { left: 0, top: 1800, width: 800, height: 600 }
    );
    expect(el.hasInView()).toBe(false);
  });

  // ---- 带偏移的视口 ----

  it("视口有偏移，元素在视口内 → true", () => {
    const el = activateElement(
      new Element({ left: 1100, top: 100, width: 200, height: 200 }),
      { left: 1000, top: 0, width: 800, height: 600 }
    );
    expect(el.hasInView()).toBe(true);
  });

  it("视口有偏移，元素在视口外 → false", () => {
    const el = activateElement(
      new Element({ left: 100, top: 100, width: 200, height: 200 }),
      { left: 1000, top: 0, width: 800, height: 600 }
    );
    expect(el.hasInView()).toBe(false);
  });

  // ---- 旋转走 else 分支 (getBoundingRect) ----

  it("angle=45° 元素在视口内 → true", () => {
    const el = activateElement(
      new Element({ left: 200, top: 200, width: 100, height: 100, angle: 45 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=45° 元素在视口外 → false", () => {
    const el = activateElement(
      new Element({ left: 900, top: 900, width: 100, height: 100, angle: 45 })
    );
    expect(el.hasInView()).toBe(false);
  });
});

// ==================== Shape.hasInView ====================

describe("Shape.hasInView", () => {
  beforeEach(() => resetNodeStatics());

  it("完全在视口内 → true", () => {
    const el = activateElement(new Shape({ left: 100, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  it("完全在视口外 → false", () => {
    const el = activateElement(new Shape({ left: -300, top: 100, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(false);
  });

  it("部分可见 → true", () => {
    const el = activateElement(new Shape({ left: 700, top: 500, width: 200, height: 200 }));
    expect(el.hasInView()).toBe(true);
  });

  // ---- angle=180° ----

  it("angle=180° 完全在视口内 → true", () => {
    const el = activateElement(
      new Shape({ left: 100, top: 100, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=180° 顶部部分可见 → true", () => {
    const el = activateElement(
      new Shape({ left: 100, top: -100, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=180° 底部部分可见 → true", () => {
    const el = activateElement(
      new Shape({ left: 100, top: 500, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=180° 完全在视口下方 → false", () => {
    const el = activateElement(
      new Shape({ left: 100, top: 700, width: 200, height: 200, angle: 180 })
    );
    expect(el.hasInView()).toBe(false);
  });

  // ---- scaleX=-1 / scaleY=-1 ----

  it("scaleX=-1 完全在视口内 → true", () => {
    const el = activateElement(
      new Shape({ left: 100, top: 100, width: 200, height: 200, scaleX: -1 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("scaleY=-1 底部部分可见 → true", () => {
    const el = activateElement(
      new Shape({ left: 100, top: 500, width: 200, height: 200, scaleY: -1 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("scaleX=-1 完全在视口左侧 → false", () => {
    const el = activateElement(
      new Shape({ left: -300, top: 100, width: 200, height: 200, scaleX: -1 })
    );
    expect(el.hasInView()).toBe(false);
  });

  // ---- 带 shadow 的 visual outset ----

  it("有 shadow 时 outset 扩大可见范围 → true", () => {
    const el = activateElement(
      new Shape({
        left: -200, top: 100, width: 200, height: 200,
        shadow: { color: "#000", blur: 20, offsetX: 10, offsetY: 0 },
      })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("有 shadow + angle=180° → true", () => {
    const el = activateElement(
      new Shape({
        left: 100, top: 100, width: 200, height: 200, angle: 180,
        shadow: { color: "#000", blur: 10, offsetX: 0, offsetY: 0 },
      })
    );
    expect(el.hasInView()).toBe(true);
  });

  // ---- 窄高 + 180°（复现原始 bug）----

  it("窄高元素 angle=180° 大部分在视口 → true", () => {
    const el = activateElement(
      new Shape({ left: 0, top: 48, width: 34, height: 1008, angle: 180 })
    );
    expect(el.hasInView()).toBe(true);
  });

  // ---- 旋转 45° 走 else 分支 ----

  it("angle=45° 元素在视口内 → true", () => {
    const el = activateElement(
      new Shape({ left: 200, top: 200, width: 100, height: 100, angle: 45 })
    );
    expect(el.hasInView()).toBe(true);
  });

  it("angle=45° 元素在视口外 → false", () => {
    const el = activateElement(
      new Shape({ left: 900, top: 900, width: 100, height: 100, angle: 45 })
    );
    expect(el.hasInView()).toBe(false);
  });
});
