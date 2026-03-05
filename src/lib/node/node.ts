import { EventManage, FulateEvent } from "../eventManage";
import {
  AddEventListenerOptions,
  CustomEvent,
  EventEmitter
} from "../../util/event";
import { Root } from "../root";
import { Layer } from "../layer";

function linkNode(child: Node, parent: Node) {
  child.parent = parent;
  child._provides = parent._provides ?? parent.root._provides;
}

function moveNode(child: Node, parent: Node) {
  child.parent = parent;

  for (let key in parent._provides) {
    if (Object.hasOwn(child._provides, key)) {
      delete child._provides[key];
    }
  }

  Object.setPrototypeOf(
    child._provides,
    parent._provides ?? parent.root._provides
  );
}

export class Node extends EventEmitter {
  type = "node";

  static uIndex = 1;
  static _uidSeq = 0;
  static genKey(): string {
    return `${Date.now().toString(36)}_${++Node._uidSeq}`;
  }

  id!: string;
  uIndex: number;

  parent: this | undefined;
  children: this[] | null = null;

  // 链表指针
  nextSibling: this | null = null;
  previousSibling: this | null = null;

  // 生命周期状态
  isMounted = false;
  isUnMounted = false;
  key: string;

  hasDirtyChild = false;

  silent = false;

  // 事件管理器
  eventManage = new EventManage(this as any);

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

  /**
   * 向上冒泡通知祖先"我的分支脏了"
   * 性能优化：如果祖先已经标记为脏，立即停止冒泡
   */
  markChildDirty() {
    if (!this.isMounted || this.parent.hasDirtyChild) {
      return;
    }
    let p = this.parent;
    while (p && !p.hasDirtyChild) {
      p.hasDirtyChild = true;
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

  private _afterMutate(nodes: Node[]) {
    if (this.isMounted) {
      //先对节点进行move
      //move需要调整provide
      //然后在去_updateSiblings -> linkNode
      nodes.forEach((child) => {
        this.move(child);
        if (!child.isMounted && !child.isUnMounted) {
          child.mounted();
        }
      });
    }
    this._updateSiblings();
    this.hasDirtyChild = true;
    this.markChildDirty();
    if (this.root) {
      this.dispatchEvent(new CustomEvent("childrenchange"));
    }
  }

  append(...children: Node[]) {
    if (!this.children) this.children = [];
    const added: Node[] = [];
    children.forEach((child) => {
      this.children!.push(child as any);
      added.push(child);
    });
    this._afterMutate(added);
    return this;
  }

  move(node: Node) {
    if (node.parent && node.parent !== this) {
      node.unmounted();
      moveNode(node, this);
      node.layer.removeRbush(node);
    }
  }

  prepend(...children: Node[]) {
    if (!this.children) this.children = [];
    const added: Node[] = [];
    children.forEach((child) => {
      if (child.parent) return;
      child.parent = this as any;
      added.push(child);
    });
    this.children.unshift(...(added as any[]));
    this._afterMutate(added);
    return this;
  }

  insertBefore(newChild: Node, refChild: Node | null) {
    if (!refChild) return this.append(newChild);
    if (!this.children || newChild.parent) return this;
    const idx = this.children.indexOf(refChild as any);
    if (idx === -1) return this;
    this.children.splice(idx, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  insertAfter(newChild: Node, refChild: Node) {
    if (!this.children || newChild.parent) return this;
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
    oldChild.unmounted();
    this.children[idx] = newChild as any;
    this._afterMutate([newChild]);
    return this;
  }

  /** 在自身前面插入节点（操作父级children） */
  before(...nodes: Node[]) {
    if (!this.parent) return this;
    nodes.forEach((n) => this.parent!.insertBefore(n, this));
    return this;
  }

  /** 在自身后面插入节点（操作父级children） */
  after(...nodes: Node[]) {
    if (!this.parent) return this;
    let ref: Node = this;
    nodes.forEach((n) => {
      this.parent!.insertAfter(n, ref);
      ref = n;
    });
    return this;
  }

  removeChild(...children: this[]) {
    children.forEach((child) => child.unmounted());
    this.hasDirtyChild = true;
    this.markChildDirty();
    this.dispatchEvent(new CustomEvent("childrenchange"));
    return this;
  }

  mounted() {
    this.uIndex = Node.uIndex++;
    if (this.id === undefined) {
      this.id = Node.genKey();
    }
    this.isMounted = true;
    if (this.key && this.root) {
      this.root.keyElmenet.set(this.key, this as any);
    }
    this.root.idElements?.set(this.key, this as any);
    this.children?.forEach((child) => {
      linkNode(child, this);
      child.mounted();
    });
  }

  unmounted() {
    this.dispatchEvent(new CustomEvent("unmounted"));

    if (this.key && this.root) {
      this.root.keyElmenet.delete(this.key);
    }
    if (this.id && this.root?.idElements) {
      this.root.idElements.delete(this.id);
    }

    const oldParent = this.parent;
    if (oldParent && oldParent.children?.length) {
      const index = oldParent.children.findIndex((v) => v === this);
      if (index !== -1) {
        oldParent.children.splice(index, 1);
        oldParent._updateSiblings?.();
        oldParent.hasDirtyChild = true;
        oldParent.markChildDirty?.();
      }
    }

    this.children?.forEach((child) => child.unmounted());

    this.isUnMounted = true;
    this.nextSibling = null;
    this.previousSibling = null;
    this.layer?.removeRbush(this);
    /**
     * 保留_provides 因为move的时候用的到
     * parent 保留用于判断
     */
  }

  distory() {
    this.children?.forEach((child) => child.distory());
    this.children = [];
    this.nextSibling = null;
    this.previousSibling = null;
    this.parent = undefined;
    this.isMounted = false;
    this._provides = null;
    this.clearEventListener();
  }

  addEventListener<T = FulateEvent>(
    type: string,
    callback: (ev: T) => void,
    options?: AddEventListenerOptions
  ) {
    this.eventManage.hasUserEvent = true;
    return super.addEventListener(type, callback, options);
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
