import { createRenderer, type RendererOptions } from "@vue/runtime-core";
import { getElementCtor } from "@fulate/core";

function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

function toEventName(key: string): string {
  return key.slice(2).toLowerCase();
}

class NoopNode {
  _isNoop = true as const;
  parent: any = null;
  nextSibling: any = null;
  previousSibling: any = null;
}

const nodeOps: RendererOptions<any, any> = {
  createElement(type: string) {
    const Ctor = getElementCtor(type);
    if (!Ctor) {
      console.warn(
        `[fulate-vue] Unknown element: "${type}". ` +
          `Did you forget registerElement("${type}", YourClass)?`
      );
      return new NoopNode();
    }
    return new Ctor();
  },

  insert(child, parent, anchor) {
    if (!parent || child._isNoop || parent._isNoop) return;

    if (anchor && !anchor._isNoop) {
      parent.insertBefore(child, anchor);
    } else {
      parent.append(child);
    }
  },

  remove(child) {
    if (child._isNoop) return;
    child.parent?.removeChild(child);
  },

  patchProp(el, key, prevValue, nextValue) {
    if (el._isNoop) return;

    if (isEventProp(key)) {
      const eventName = toEventName(key);
      if (prevValue) el.removeEventListener(eventName, prevValue);
      if (nextValue) el.addEventListener(eventName, nextValue);
      return;
    }

    if (el.isActiveed) {
      el.setOptions({ [key]: nextValue });
    } else {
      el[key] = nextValue;
    }
  },

  createText() {
    return new NoopNode();
  },

  createComment() {
    return new NoopNode();
  },

  setText() {},

  setElementText(el, text) {
    if (el._isNoop) return;
    if (el.type === "text") {
      el.setOptions({ text });
    }
  },

  parentNode(node) {
    return node?.parent ?? null;
  },

  nextSibling(node) {
    return node?.nextSibling ?? null;
  },
};

export const { render, createApp: baseCreateApp } = createRenderer(nodeOps);
