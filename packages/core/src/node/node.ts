import { CustomEvent, EventEmitter } from "@fulate/util";
import type { Root } from "@fulate/core";
import type { Layer } from "@fulate/core";

function linkNode(child: Node, parent: Node) {
  child.parent = parent;
  if (parent.isActiveed) {
    const parentProvides = parent._provides ?? parent.root._provides;
    if (
      !child._provides ||
      Object.getPrototypeOf(child._provides) !== parentProvides
    ) {
      child._provides = Object.create(parentProvides);
    }
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
  isDirty = true;
  _lastUpdateFrame = 0;

  key!: string;
  silent = false;
  pickable = true; //false 事件跳过这个节点，继续往上冒

  _options: any = {};
  _provides: Record<string, any>;

  _root: Root | null = null;
  _layer: Layer | null = null;

  get layer(): Layer {
    return this._layer ?? this.inject("layer");
  }

  get root(): Root {
    return this._root ?? this.inject("root");
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

      const layer = this._layer;
      if (layer && (layer as any)._frameId > 0) {
        for (const child of nodes) {
          if ((child as any).isDirty) layer.addDirtyNode(child as any);
        }
      }
    }

    this.isDirtyChild = true;
    this.markChildDirty();
  }

  // ================= 结构操作 =================
  private _detachFromSameParent(child: Node) {
    if (child.parent !== this || !this.children) return;
    const oldIdx = this.children.indexOf(child as any);
    if (oldIdx !== -1) this.children.splice(oldIdx, 1);
  }

  append(...children: Node[]) {
    if (!this.children) this.children = [];
    const added: Node[] = [];
    children.forEach((child) => {
      this._detachFromSameParent(child);
      this.children!.push(child as any);
      added.push(child);
    });
    this._afterMutate(added);
    return this;
  }

  prepend(...children: Node[]) {
    if (!this.children) this.children = [];
    const added: Node[] = [];
    children.forEach((child) => {
      this._detachFromSameParent(child);
      added.push(child);
    });
    this.children.unshift(...(added as any[]));
    this._afterMutate(added);
    return this;
  }

  insertBefore(newChild: Node, refChild: Node | null) {
    if (!refChild) return this.append(newChild);
    if (!this.children) return this;
    this._detachFromSameParent(newChild);
    const idx = this.children.indexOf(refChild as any);
    if (idx === -1) return this;
    this.children.splice(idx, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  insertAfter(newChild: Node, refChild: Node) {
    if (!this.children) return this;
    this._detachFromSameParent(newChild);
    const idx = this.children.indexOf(refChild as any);
    if (idx === -1) return this;
    this.children.splice(idx + 1, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  replaceChild(newChild: Node, oldChild: Node) {
    if (!this.children) return this;
    const idx = this.children.indexOf(oldChild as any);
    if (idx === -1) return this;
    this.removeChild(oldChild);
    this.children.splice(idx, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  before(...nodes: Node[]) {
    if (!this.parent) return this;
    nodes.forEach((n) => this.parent!.insertBefore(n, this as any));
    return this;
  }

  after(...nodes: Node[]) {
    if (!this.parent) return this;
    let ref: any = this;
    nodes.forEach((n) => {
      this.parent!.insertAfter(n, ref);
      ref = n;
    });
    return this;
  }

  /**
   移除节点：仅从父级数组中剥离，并使其失活 (unactive)，不销毁。可以复用。
  */
  removeChild(...children: Node[]) {
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
    this.markChildDirty();
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

    this._root = this.inject("root") ?? null;
    this._layer = this.inject("layer") ?? null;

    if (this.key && this._root) {
      this._root.keyElmenet.set(this.key, this as any);
    }
    if (this.id && this._root?.idElements) {
      this._root.idElements.set(this.id, this as any);
    }

    this.dispatchEvent(new CustomEvent("activated"));

    this.children?.forEach((child) => {
      linkNode(child, this);
      child.mount();
    });
  }

  protected shouldFastDeactivate() {
    return (
      (this._root?.isUnmounted ?? false) || (this._layer?.isUnmounted ?? false)
    );
  }

  deactivate() {
    if (!this.isActiveed) return;
    this.isActiveed = false;

    const fastDestroy = this.shouldFastDeactivate();

    if (!fastDestroy) {
      if (this.key && this._root) {
        this._root.keyElmenet.delete(this.key);
      }
      if (this.id && this._root?.idElements) {
        this._root.idElements.delete(this.id);
      }
      this._layer?.addDirtyNode(this as any);
      this._layer?.removeRbush(this as any);
    }
    this.dispatchEvent(
      new CustomEvent("deactivated", {
        bubbles: false
      })
    );

    this.children?.forEach((child) => child.deactivate());

    this._root = null;
    this._layer = null;
  }

  unmounted() {
    if (this.isUnmounted) return;
    this.isUnmounted = true;
    this.deactivate();

    this.dispatchEvent(
      new CustomEvent("unmounted", {
        bubbles: false
      })
    );

    if (!this.parent?.isUnmounted) {
      const oldParent = this.parent;
      if (oldParent && oldParent.children?.length) {
        const index = oldParent.children.findIndex((v) => v === this);
        if (index !== -1) {
          oldParent.children.splice(index, 1);
          (oldParent as any)._updateSiblings?.();
          oldParent.isDirtyChild = true;
          (oldParent as any).markChildDirty?.();
        }
      }
    }

    this.children?.forEach((child) => child.unmounted());

    this.children = null;
    this.nextSibling = null;
    this.previousSibling = null;
    this.parent = undefined;
    this._provides = null as any;
    this.clearEventListener();
  }

  // ================= 依赖注入 =================

  provide(key: string, value: any) {
    this._provides[key] = value;
    return this;
  }

  inject<T = any>(key: string): T | undefined {
    return this._provides?.[key];
  }
}
