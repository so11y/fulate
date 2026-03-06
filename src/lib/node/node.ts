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

export class Node extends EventEmitter {
  type = "node";
  static uIndex = 1;
  static _uidSeq = 0;
  static genKey(): string {
    return `${Date.now().toString(36)}_${++Node._uidSeq}`;
  }

  id!: string;
  uIndex!: number;
  parent: this | undefined;
  children: this[] | null = null;

  // 链表指针
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

  // 事件管理器
  eventManage = new EventManage(this as any);

  _options: any = {};
  _provides: Record<string, any> = {};

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
    this.removeChild(oldChild); // 旧节点失活
    this.children.splice(idx, 0, newChild as any);
    this._afterMutate([newChild]);
    return this;
  }

  before<T extends Node>(...nodes: T[]) {
    if (!this.parent) return this;
    nodes.forEach((n) => this.parent!.insertBefore(n, this as any));
    this.eventManage.notify("childrenchange");
    return this;
  }

  after<T extends Node>(...nodes: T[]) {
    if (!this.parent) return this;
    let ref: any = this;
    nodes.forEach((n) => {
      this.parent!.insertAfter(n, ref);
      ref = n;
    });
    this.eventManage.notify("childrenchange");
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
        child.deactivate(); // 失活处理
      }
    });
    this._updateSiblings();
    this.isDirtyChild = true;
    this.isDirtyPaintChild = true;
    this.markChildDirty();
    this.eventManage.notify("childrenchange");
    return this;
  }

  // ================= 生命周期 (Lifecycle) =================
  /**
   挂载节点 (触发一次 mounted)
  */
  mount() {
    if (this.isUnmounted) return;
    if (!this.isMounted) {
      this.mounted();
    }
    // 挂载后，自动使其进入活跃状态
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

  /**
   激活节点 (对应 Vue 的 onActivated)
  */
  activate() {
    // 【重要拦截】这里保证了如果节点自身及其子节点本来就是活跃的，绝对不会被重复激活
    if (this.isActiveed || this.isUnmounted) return;
    this.isActiveed = true;

    // 添加到全局索引
    if (this.key && this.root) {
      this.root.keyElmenet.set(this.key, this as any);
    }
    if (this.id && this.root?.idElements) {
      this.root.idElements.set(this.id, this as any);
    }

    this.dispatchEvent(new CustomEvent("activated"));

    // 递归激活子节点
    this.children?.forEach((child) => {
      linkNode(child, this);
      child.mount(); // mount 内部会安全调用 activate
    });
  }

  /**
   失活节点 (对应 Vue 的 onDeactivated)
  */
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

    // 递归失活子节点
    this.children?.forEach((child) => child.deactivate());
  }

  /**
   彻底卸载与销毁 (取代原 distory 方法)
  */
  unmounted() {
    if (this.isUnmounted) return;
    // 1. 确保节点处于失活状态
    this.deactivate();

    // 2. 标记卸载并触发事件
    this.isUnmounted = true;
    this.dispatchEvent(new CustomEvent("unmounted"));

    // 3. 将自身从父节点的结构中剔除
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

    // 4. 递归销毁所有子节点
    this.children?.forEach((child) => child.unmounted());

    // 5. 彻底清理内存 (取代 distory 逻辑)
    this.children = [];
    this.nextSibling = null;
    this.previousSibling = null;
    this.parent = undefined;
    this._provides = null as any;
    this.clearEventListener();
  }

  // ================= 事件与依赖注入 =================
  addEventListener<T = FulateEvent>(
    type: string,
    callback: (ev: T) => void,
    options?: AddEventListenerOptions
  ) {
    this.eventManage.hasUserEvent = true;
    return super.addEventListener(type, callback as any, options);
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
    return this._provides?.[key];
  }
}
