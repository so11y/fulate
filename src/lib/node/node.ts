import { EventManage, FulateEvent } from "../eventManage";
import { type Root } from "../root";
import { type Layer } from "../layer";

export class Node extends EventTarget {
  type = "node";

  // 树结构关系
  root: Root;
  layer: Layer;
  parent: this | undefined;
  children: this[] | null = null;

  // 生命周期状态
  isMounted = false;
  key: string;

  hasDirtyChild = false;

  // 事件管理器
  eventManage = new EventManage(this as any);

  _options: any = {};

  _provides: Record<string, any>;

  attrs(options: any) {}

  /**
   * 向上冒泡通知祖先"我的分支脏了"
   * 性能优化：如果祖先已经标记为脏，立即停止冒泡
   */
  markChildDirty() {
    let p = this.parent;
    while (p && !p.hasDirtyChild) {
      p.hasDirtyChild = true;
      p = p.parent;
    }

    if (this.layer) {
      this.layer.requestRender?.();
    }
  }

  append(...children: this[]) {
    if (!this.children) this.children = [];

    children.forEach((child) => {
      if (child.parent) return;
      child.parent = this;
      this.children!.push(child);
    });

    this.hasDirtyChild = true;
    this.markChildDirty();

    if (this.isMounted) {
      children.forEach((v) => v.mounted());
    }

    if (this.root) {
      this.root.calcEventSort();
    }

    return this;
  }

  removeChild(...children: this[]) {
    children.forEach((child) => child.unmounted());

    this.hasDirtyChild = true;
    this.markChildDirty();
    this.root.calcEventSort();
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

    const oldParent = this.parent;

    if (oldParent && oldParent.children?.length) {
      const index = oldParent.children?.findIndex((v) => v === this);
      if (index !== -1) {
        oldParent.children.splice(index, 1);
        oldParent.hasDirtyChild = true;
        oldParent.markChildDirty();
      }
    }

    this.children?.forEach((child) => child.unmounted());
    this.children = [];
    this.parent = undefined;
    this.isMounted = false;
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
