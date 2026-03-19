import { Shape, registerElement } from "@fulate/core";
import {
  defineComponent,
  reactive,
  markRaw,
  h,
  type Component
} from "@vue/runtime-core";
import { baseCreateApp } from "./renderer";

const vueCompRegistry = new Map<string, Component>();

export function registerVueComponent(name: string, comp: Component) {
  vueCompRegistry.set(name, comp);
}

export function getVueComponent(name: string): Component | undefined {
  return vueCompRegistry.get(name);
}

export class VueShape extends Shape {
  type = "vue-component";

  _comp: Component | null = null;
  _compName: string = "";
  _compProps: Record<string, any> = {};
  _compPropKeys: Set<string> | null = null;
  _reactiveProps: Record<string, any> | null = null;
  _sizeRef: { width: number; height: number } | null = null;
  _app: any = null;
  _vnode: any = null;

  activate() {
    super.activate();
    if (this._comp) this._mountVue();
  }

  deactivate() {
    this._unmountVue();
    super.deactivate();
  }

  private _mountVue() {
    this._reactiveProps = reactive({ ...this._compProps });
    this._sizeRef = reactive({
      width: this.width ?? 0,
      height: this.height ?? 0
    });
    const rp = this._reactiveProps;
    const Comp = this._comp!;

    const Wrapper = defineComponent({
      setup() {
        return () => h(Comp, rp);
      }
    });

    this._app = baseCreateApp(Wrapper);

    const root = this.root;
    if (root) {
      this._app.provide("__fulate_root", root);
      if ((root as any)._overlay) {
        this._app.provide("__fulate_overlay", (root as any)._overlay);
      }
    }
    this._app.provide("__vueShapeSize", this._sizeRef);

    this._app.mount(markRaw(this) as any);
  }

  private _unmountVue() {
    if (this._app) {
      this._app.unmount();
      this._app = null;
      this._reactiveProps = null;
      this._sizeRef = null;
    }
  }

  private _isCompProp(key: string): boolean {
    return this._compPropKeys?.has(key) ?? false;
  }

  attrs(options: any, O?: any) {
    if (!options) return;
    for (const [key, val] of Object.entries(options)) {
      if (this._isCompProp(key)) {
        this._compProps[key] = val;
        if (this._reactiveProps) this._reactiveProps[key] = val;
      }
    }
    super.attrs(options, O);
  }

  setOptions(options?: any, syncCalc = false) {
    const result = super.setOptions(options, syncCalc);
    this._syncSize();
    return result;
  }

  private _syncSize() {
    if (this._sizeRef) {
      if (this.width !== undefined) this._sizeRef.width = this.width;
      if (this.height !== undefined) this._sizeRef.height = this.height;
    }
  }

  toJson(_includeChildren = false): any {
    const json = super.toJson(false) as any;
    json.component = this._compName;
    json.componentProps = { ...this._compProps };
    return json;
  }
}

registerElement("f-vue-component", VueShape);

export function fromVueToFulate(
  comp: Component,
  props?: Record<string, any>
): VueShape {
  const compPropsDef = (comp as any).props ?? {};
  const compPropKeys = new Set(Object.keys(compPropsDef));

  const shapeOpts: Record<string, any> = {};
  const compProps: Record<string, any> = {};

  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (compPropKeys.has(key)) compProps[key] = val;
      shapeOpts[key] = val;
    }
  }

  const el = markRaw(new VueShape(shapeOpts));
  el._comp = comp;
  el._compName = (comp as any).name ?? "";
  if (el._compName) {
    vueCompRegistry.set(el._compName, comp);
  }
  el._compProps = compProps;
  el._compPropKeys = compPropKeys;

  return el;
}
