import { createRenderer, type RendererOptions } from "@vue/runtime-core";
import { Element, getElementCtor } from "@fulate/core";

function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

function toEventName(key: string): string {
  return key.slice(2).toLowerCase();
}

function createPlaceholder() {
  const el = new Element();
  el.width = 0;
  el.height = 0;
  el.silent = true;
  el.pickable = false;
  (el as any)._isPlaceholder = true;
  return el;
}

const nodeOps: RendererOptions<any, any> = {
  createElement(type: string) {
    const Ctor = getElementCtor(type);
    if (!Ctor) {
      console.warn(
        `[fulate-vue] Unknown element: "${type}". ` +
          `Did you forget registerElement("${type}", YourClass)?`
      );
      return createPlaceholder();
    }
    return new Ctor();
  },

  insert(child, parent, anchor) {
    if (!parent) return;
    if (anchor) {
      parent.insertBefore(child, anchor);
    } else {
      parent.append(child);
    }
  },

  remove(child) {
    if ((child as any)._isPlaceholder) {
      child.parent?.removeChild(child);
    } else {
      child.unmounted();
    }
  },

  patchProp(el, key, prevValue, nextValue) {
    if ((el as any)._isPlaceholder) return;

    if (isEventProp(key)) {
      const eventName = toEventName(key);
      if (prevValue) el.removeEventListener(eventName, prevValue);
      if (nextValue) el.addEventListener(eventName, nextValue);
      return;
    }

    if (el.isActiveed) {
      el.setOptions({ [key]: nextValue });
    } else {
      el.attrs({ [key]: nextValue });
    }
  },

  createText() {
    return createPlaceholder();
  },

  createComment() {
    return createPlaceholder();
  },

  setText() {},

  setElementText(el, text) {
    if ((el as any)._isPlaceholder) return;
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
