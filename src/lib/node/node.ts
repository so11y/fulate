import { EventManage, FulateEvent } from "../eventManage";
import { type Root } from "../root";
import { type Layer } from "../layer";

export class Node extends EventTarget {
  type = "node";

  // 树结构关系
  root: Root;
  layer: Layer;
  parent: Node | undefined;
  children: Node[] | null = null;

  // 生命周期状态
  isMounted = false;
  key: string;

  // 事件管理器
  eventManage = new EventManage(this as any);

  append(...children: Node[]) {
    if (!this.children) this.children = [];
    children.forEach((child) => {
      if (child.parent) return;
      child.parent = this;
      this.children!.push(child);
    });
    return this;
  }

  // 生命周期钩子
  mounted() {
    this.isMounted = true;
    if (this.key && this.root) {
      this.root.keyElmenet.set(this.key, this as any);
    }
    this.children?.forEach((child) => {
      child.parent = this;
      child.root = this.root;
      if (!child.layer && this.layer) child.layer = this.layer;
      child.mounted();
    });
  }

  unmounted() {
    this.dispatchEvent(new CustomEvent("unmounted"));
    if (this.key && this.root) {
      this.root.keyElmenet.delete(this.key);
    }
    this.children?.forEach((child) => child.unmounted());
  }

  addEventListener<T = FulateEvent>(
    type: string,
    callback: (ev: T) => void,
    options?: AddEventListenerOptions | boolean
  ): void {
    this.eventManage.hasUserEvent = true;
    //@ts-ignore
    super.addEventListener(type, callback, options);
  }
}
