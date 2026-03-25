import { describe, it, expect, beforeEach, vi } from "vitest";
import { CustomEvent, EventEmitter } from "../src/event";
import { createEmitter, createBubbleChain } from "./helpers";

describe("CustomEvent", () => {
  it("构造时保存 type / detail / bubbles", () => {
    const e = new CustomEvent("click", { detail: { a: 1 }, bubbles: true });
    expect(e.type).toBe("click");
    expect(e.detail).toEqual({ a: 1 });
    expect(e.bubbles).toBe(true);
  });

  it("默认不冒泡", () => {
    const e = new CustomEvent("test");
    expect(e.bubbles).toBe(false);
  });

  it("stopPropagation 设置 _stopPropagationFlag", () => {
    const e = new CustomEvent("test");
    expect(e._stopPropagationFlag).toBe(false);
    e.stopPropagation();
    expect(e._stopPropagationFlag).toBe(true);
    expect(e.cancelBubble).toBe(true);
  });

  it("stopImmediatePropagation 同时设置两个标记", () => {
    const e = new CustomEvent("test");
    e.stopImmediatePropagation();
    expect(e._stopPropagationFlag).toBe(true);
    expect(e._stopImmediatePropagationFlag).toBe(true);
  });

  it("cancelBubble setter 设置 _stopPropagationFlag", () => {
    const e = new CustomEvent("test");
    e.cancelBubble = true;
    expect(e._stopPropagationFlag).toBe(true);
  });
});

describe("EventEmitter", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = createEmitter();
  });

  describe("addEventListener / removeEventListener", () => {
    it("注册回调后能被触发，参数正确", () => {
      const cb = vi.fn();
      emitter.addEventListener("click", cb);

      const evt = new CustomEvent("click", { detail: { x: 10 } });
      emitter.dispatchEvent(evt);

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(evt);
    });

    it("多个回调按注册顺序触发", () => {
      const order: number[] = [];
      emitter.addEventListener("click", () => order.push(1));
      emitter.addEventListener("click", () => order.push(2));

      emitter.dispatchEvent(new CustomEvent("click"));
      expect(order).toEqual([1, 2]);
    });

    it("removeEventListener 移除后不再触发", () => {
      const cb = vi.fn();
      emitter.addEventListener("click", cb);
      emitter.removeEventListener("click", cb);

      emitter.dispatchEvent(new CustomEvent("click"));
      expect(cb).not.toHaveBeenCalled();
    });

    it("removeEventListener 不传 callback 则移除该事件的全部回调", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      emitter.addEventListener("click", cb1);
      emitter.addEventListener("click", cb2);

      emitter.removeEventListener("click");

      emitter.dispatchEvent(new CustomEvent("click"));
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });

    it("addEventListener 返回取消函数", () => {
      const cb = vi.fn();
      const dispose = emitter.addEventListener("click", cb);

      dispose();
      emitter.dispatchEvent(new CustomEvent("click"));
      expect(cb).not.toHaveBeenCalled();
    });

    it("注册后 isSubscribed = true", () => {
      expect(emitter.isSubscribed).toBe(false);
      emitter.addEventListener("click", vi.fn());
      expect(emitter.isSubscribed).toBe(true);
    });
  });

  describe("once 选项", () => {
    it("只触发一次，之后自动移除", () => {
      const cb = vi.fn();
      emitter.addEventListener("click", cb, { once: true });

      emitter.dispatchEvent(new CustomEvent("click"));
      emitter.dispatchEvent(new CustomEvent("click"));

      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe("dispatchEvent 字符串重载", () => {
    it("传入字符串 + detail 自动构造冒泡事件", () => {
      const cb = vi.fn();
      emitter.addEventListener("click", cb);

      emitter.dispatchEvent("click", { x: 5, y: 10 });

      expect(cb).toHaveBeenCalledOnce();
      const evt: CustomEvent = cb.mock.calls[0][0];
      expect(evt.type).toBe("click");
      expect(evt.bubbles).toBe(true);
      expect(evt.detail.x).toBe(5);
      expect(evt.detail.y).toBe(10);
    });
  });

  describe("冒泡", () => {
    it("沿 parent 链逐级触发", () => {
      const { top, middle, child } = createBubbleChain();
      const topCb = vi.fn();
      const midCb = vi.fn();
      top.addEventListener("click", topCb);
      middle.addEventListener("click", midCb);

      child.dispatchEvent(new CustomEvent("click", { bubbles: true }));

      expect(midCb).toHaveBeenCalledOnce();
      expect(topCb).toHaveBeenCalledOnce();
    });

    it("stopPropagation 阻止冒泡后父级不触发", () => {
      const { top, middle, child } = createBubbleChain();
      const topCb = vi.fn();
      top.addEventListener("click", topCb);
      middle.addEventListener("click", (e: CustomEvent) => {
        e.stopPropagation();
      });

      child.dispatchEvent(new CustomEvent("click", { bubbles: true }));
      expect(topCb).not.toHaveBeenCalled();
    });

    it("stopImmediatePropagation 阻止同一事件后续回调", () => {
      const cb1 = vi.fn((e: CustomEvent) => {
        e.stopImmediatePropagation();
      });
      const cb2 = vi.fn();
      emitter.addEventListener("click", cb1);
      emitter.addEventListener("click", cb2);

      emitter.dispatchEvent(new CustomEvent("click"));

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).not.toHaveBeenCalled();
    });

    it("跳过 isLayer 节点但继续向上冒泡", () => {
      const { top, middle, child } = createBubbleChain();
      (middle as any).isLayer = true;
      const midCb = vi.fn();
      const topCb = vi.fn();
      middle.addEventListener("click", midCb);
      top.addEventListener("click", topCb);

      child.dispatchEvent(new CustomEvent("click", { bubbles: true }));

      expect(midCb).not.toHaveBeenCalled();
      expect(topCb).toHaveBeenCalledOnce();
    });

    it("跳过 pickable=false 节点但继续向上冒泡", () => {
      const { top, middle, child } = createBubbleChain();
      (middle as any).pickable = false;
      const midCb = vi.fn();
      const topCb = vi.fn();
      middle.addEventListener("click", midCb);
      top.addEventListener("click", topCb);

      child.dispatchEvent(new CustomEvent("click", { bubbles: true }));

      expect(midCb).not.toHaveBeenCalled();
      expect(topCb).toHaveBeenCalledOnce();
    });

    it("不冒泡的事件不触发父级", () => {
      const { top, child } = createBubbleChain();
      const topCb = vi.fn();
      top.addEventListener("test", topCb);

      child.dispatchEvent(new CustomEvent("test", { bubbles: false }));
      expect(topCb).not.toHaveBeenCalled();
    });
  });

  describe("mouseenter / mouseleave 去重", () => {
    it("mouseenter 连续 dispatch 两次，回调只触发一次", () => {
      const cb = vi.fn();
      emitter.addEventListener("mouseenter", cb);

      emitter.dispatchEvent("mouseenter");
      emitter.dispatchEvent("mouseenter");

      expect(cb).toHaveBeenCalledOnce();
      expect(emitter.isHover).toBe(true);
    });

    it("mouseleave 重置 isHover", () => {
      emitter.isHover = true;
      const cb = vi.fn();
      emitter.addEventListener("mouseleave", cb);

      emitter.dispatchEvent("mouseleave", { x: -100, y: -100 });
      expect(emitter.isHover).toBe(false);
    });
  });

  describe("clearEventListener", () => {
    it("清除后所有事件不触发", () => {
      const clickCb = vi.fn();
      const moveCb = vi.fn();
      emitter.addEventListener("click", clickCb);
      emitter.addEventListener("pointermove", moveCb);

      emitter.clearEventListener();

      emitter.dispatchEvent(new CustomEvent("click"));
      emitter.dispatchEvent(new CustomEvent("pointermove"));

      expect(clickCb).not.toHaveBeenCalled();
      expect(moveCb).not.toHaveBeenCalled();
    });
  });

  describe("回调中的错误处理", () => {
    it("回调抛错不阻断后续回调", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const cb1 = vi.fn(() => { throw new Error("oops"); });
      const cb2 = vi.fn();
      emitter.addEventListener("click", cb1);
      emitter.addEventListener("click", cb2);

      emitter.dispatchEvent(new CustomEvent("click"));

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
