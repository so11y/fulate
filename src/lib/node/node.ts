import {
  FulateEvent,
  AddEventListenerOptions,
  CustomEvent,
  EventEmitter
} from "../../util/event";
import { Point } from "../../util/point";
import { Root } from "../root";
import { Layer } from "../layer";

function linkNode(child: Node, parent: Node) {
  child.parent = parent;
  const parentProvides = parent._provides ?? parent.root._provides;
  if (
    !child._provides ||
    Object.getPrototypeOf(child._provides) !== parentProvides
  ) {
    child._provides = Object.create(parentProvides);
  }
}

export class Node extends EventEmitter {
  type = "node";
  static uIndex = 1;
  static _uidSeq = 0;
  static genKey(): string {
    return `${Date.now().toString(36)}_${++Node._uidSeq}`;
  }

  id!: string;
  uIndex!: number;
  declare parent: this | undefined;
  children: this[] | null = null;

  nextSibling: this | null = null;
  previousSibling: this | null = null;

  isMounted = false;
  isActiveed = false;
  isUnmounted = false;

  isDirtyChild = false;
  isDirtyPaintChild = false;
  isDirty = true;

  key!: string;
  silent = false;

  isHover = false;
  hasUserEvent = false;

  _options: any = {};
  _provides: Record<string, any>;

  get layer(): Layer {
    return this.inject("layer");
  }

  get root(): Root {
    return this.inject("root");
  }

  get firstChild(): this | null {
    return this.children?.[0] ?? null;
  }

  get lastChild(): this | null {
    if (!this.children?.length) return null;
    return this.children[this.children.length - 1];
  }

  attrs(options: any) {}

  markChildDirty() {
    if (!this.isActiveed || this.parent?.isDirtyChild) {
      return;
    }
    let p = this.parent;
    while (p && !p.isDirtyChild) {
      p.isDirtyChild = true;
      p.isDirtyPaintChild = true;
      p = p.parent;
    }
    if (this.layer) {
      this.layer.requestRender?.();
    }
  }

  private _updateSiblings() {
    if (!this.children?.length) return;
    for (let i = 0; i < this.children.length; i++) {
      const cur = this.children[i];
      cur.previousSibling = (this.children[i - 1] ?? null) as any;
      cur.nextSibling = (this.children[i + 1] ?? null) as any;
      linkNode(cur, this);
    }
  }

  _afterMutate<T extends Node>(nodes: T[]) {
    nodes.forEach((child) => {
      if (child.parent && child.parent !== (this as any)) {
        child.parent.removeChild(child);
      }
    });

    this._updateSiblings();

    if (this.isActiveed) {
      nodes.forEach((child) => child.mount());
    }

    this.isDirtyChild = true;
    this.isDirtyPaintChild = true;
    this.markChildDirty();
  }

  // ================= 结构操作 =================
  append<T extends Node>(...children: T[]) {
    if (!this.children) this.children = [];
    const added: T[] = [];
    children.forEach((child) => {
      this.children!.push(child as any);
      added.push(child);
    });
    this._afterMutate(added);
    return this;
  }

  prepend<T extends Node>(...children: T[]) {
    if (!this.children) this.children = [];
    const added: T[] = [];
    children.forEach((child) => added.push(child));
    this.children.unshift(...(added as any[]));
    this._afterMutate(added);
    return this;
  }

  insertBefore<T extends Node>(newChild: T, refChild: T | null) {
    if (!refChild) return this.append(newChild);
    if (!this.children) return this;
    const idx = this.children.indexOf(refChild as any);
    if (idx === -1) return this;
    this.children.splice(idx, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  insertAfter<T extends Node>(newChild: T, refChild: T) {
    if (!this.children) return this;
    const idx = this.children.indexOf(refChild as any);
    if (idx === -1) return this;
    this.children.splice(idx + 1, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  replaceChild<T extends Node>(newChild: T, oldChild: T) {
    if (!this.children) return this;
    const idx = this.children.indexOf(oldChild as any);
    if (idx === -1) return this;
    this.removeChild(oldChild);
    this.children.splice(idx, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  before<T extends Node>(...nodes: T[]) {
    if (!this.parent) return this;
    nodes.forEach((n) => this.parent!.insertBefore(n, this as any));
    this.dispatchEvent(new CustomEvent("childrenchange"));
    return this;
  }

  after<T extends Node>(...nodes: T[]) {
    if (!this.parent) return this;
    let ref: any = this;
    nodes.forEach((n) => {
      this.parent!.insertAfter(n, ref);
      ref = n;
    });
    this.dispatchEvent(new CustomEvent("childrenchange"));
    return this;
  }

  /**
   移除节点：仅从父级数组中剥离，并使其失活 (unactive)，不销毁。可以复用。
  */
  removeChild<T extends Node>(...children: T[]) {
    if (!this.children) return this;
    children.forEach((child) => {
      const idx = this.children!.indexOf(child as any);
      if (idx !== -1) {
        this.children!.splice(idx, 1);
        child.deactivate();
      }
    });
    this._updateSiblings();
    this.isDirtyChild = true;
    this.isDirtyPaintChild = true;
    this.markChildDirty();
    this.dispatchEvent(new CustomEvent("childrenchange"));
    return this;
  }

  // ================= 生命周期 (Lifecycle) =================
  mount() {
    if (this.isUnmounted) return;
    if (!this.isMounted) {
      this.mounted();
    }
    this.activate();
  }

  mounted() {
    if (this.isMounted) {
      return;
    }
    this.isMounted = true;
    this.uIndex = Node.uIndex++;
    if (this.id === undefined) {
      this.id = Node.genKey();
    }
    this._updateSiblings();
    this.dispatchEvent(new CustomEvent("mounted"));
  }

  activate() {
    if (this.isActiveed || this.isUnmounted) return;
    this.isActiveed = true;

    if (this.key && this.root) {
      this.root.keyElmenet.set(this.key, this as any);
    }
    if (this.id && this.root?.idElements) {
      this.root.idElements.set(this.id, this as any);
    }

    this.dispatchEvent(new CustomEvent("activated"));

    this.children?.forEach((child) => {
      linkNode(child, this);
      child.mount();
    });
  }

  deactivate() {
    if (!this.isActiveed) return;
    this.isActiveed = false;

    if (this.key && this.root) {
      this.root.keyElmenet.delete(this.key);
    }
    if (this.id && this.root?.idElements) {
      this.root.idElements.delete(this.id);
    }
    this.layer?.removeRbush(this as any);

    this.dispatchEvent(new CustomEvent("deactivated"));

    this.children?.forEach((child) => child.deactivate());
  }

  unmounted() {
    if (this.isUnmounted) return;
    this.deactivate();

    this.isUnmounted = true;
    this.dispatchEvent(new CustomEvent("unmounted"));

    const oldParent = this.parent;
    if (oldParent && oldParent.children?.length) {
      const index = oldParent.children.findIndex((v) => v === this);
      if (index !== -1) {
        oldParent.children.splice(index, 1);
        (oldParent as any)._updateSiblings?.();
        oldParent.isDirtyChild = true;
        this.isDirtyPaintChild = true;
        (oldParent as any).markChildDirty?.();
      }
    }

    this.children?.forEach((child) => child.unmounted());

    this.children = [];
    this.nextSibling = null;
    this.previousSibling = null;
    this.parent = undefined;
    this._provides = null as any;
    this.clearEventListener();
  }

  // ================= 事件与依赖注入 =================

  dispatchEvent(event: CustomEvent): void;
  dispatchEvent(
    eventName: string,
    detail?: Partial<FulateEvent["detail"]>
  ): void;
  dispatchEvent(
    eventOrName: CustomEvent | string,
    detail?: Partial<FulateEvent["detail"]>
  ) {
    if (typeof eventOrName === "string") {
      const eventName = eventOrName;

      if (eventName === "mouseenter") {
        if (this.isHover && detail?.target !== (this as any)) return;
        this.isHover = true;
      }

      if (eventName === "mouseleave" && this.isHover) {
        if ((this as any).hasPointHint?.(new Point(detail?.x, detail?.y))) {
          return;
        }
        this.root?.container && (this.root.container.style.cursor = "default");
        this.isHover = false;
      }

      const event = new CustomEvent(eventName, {
        detail: {
          target: detail?.target ?? this,
          x: detail?.x ?? 0,
          y: detail?.y ?? 0,
          buttons: detail?.buttons ?? 0,
          deltaY: detail?.deltaY ?? 0,
          deltaX: detail?.deltaX ?? 0,
          data: detail?.data ?? null,
          ctrlKey: detail?.ctrlKey
        },
        bubbles: true
      });

      super.dispatchEvent(event);
    } else {
      super.dispatchEvent(eventOrName);
    }
  }

  addEventListener<T = FulateEvent>(
    type: string,
    callback: (ev: T) => void,
    options?: AddEventListenerOptions
  ) {
    this.hasUserEvent = true;
    return super.addEventListener(type, callback as any, options);
  }

  provide(key: string, value: any) {
    this._provides[key] = value;
    return this;
  }

  inject<T = any>(key: string): T | undefined {
    return this._provides?.[key];
  }
}
