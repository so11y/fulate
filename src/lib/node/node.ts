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

  _options: any = {};

  _provides: Record<string, any>;

  attrs(options: any) {}

  append(...children: Node[]) {
    if (!this.children) this.children = [];
    children.forEach((child) => {
      if (child.parent) return;
      child.parent = this;
      this.children!.push(child);
    });
    if (this.isMounted) {
      children.forEach((v) => v.mounted());
    }
    return this;
  }

  removeChild(...children: Node[]) {
    children.forEach((child) => child.unmounted());
    return this;
  }

  mounted() {
    this.isMounted = true;
    if (this.key && this.root) {
      this.root.keyElmenet.set(this.key, this as any);
    }
    this.children?.forEach((child) => {
      child.parent = this;
      child.root = this.root;
      child._provides = this._provides ?? this.root._provides;
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
    this.children = [];
    if (this.parent && this.parent.children?.length) {
      const index = this.parent.children?.findIndex((v) => v === this);
      this.parent.children.splice(index, 1);
    }
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

  provide(key: string, value: any) {
    const parentProvides = this.parent ? this.parent._provides : {};
    if (this._provides === parentProvides) {
      this._provides = Object.create(parentProvides);
    }
    this._provides[key] = value;
    return this;
  }

  inject<T = any>(key: string): T | undefined {
    return this._provides[key];
  }

}
