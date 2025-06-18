import { AnimationController } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";
import { LayerManager } from "./layer";
import { TextOptions } from "./text";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLElement;
  // width: number;
  // height: number;
  useDirtyRect?: boolean;
  dirtyDebug?: boolean;
  children?: Element[];
  font?: TextOptions["font"] & {
    color?: string;
  };
}

export class Root extends Element {
  el: HTMLElement;
  layerManager: LayerManager;
  type = "root";
  ac: AnimationController;
  keyMap = new Map<string, Element>();
  quickElements: Set<Element> = new Set();
  // cursorElements: Set<Element> = new Set();
  font: Required<RootOptions["font"]>;
  currentElement?: Element;

  constructor(options: RootOptions) {
    super(options);
    this.root = this;
    this.el = options.el;
    this.layerManager = new LayerManager(options.el, this);
    this.ac = new AnimationController(
      options.animationSwitch ? options.animationTime ?? 300 : 0
    );
    this.font = {
      style: options.font?.style ?? "normal",
      variant: options.font?.variant ?? "normal",
      stretch: options.font?.stretch ?? "normal",
      size: options.font?.size ?? 16,
      lineHeight: options.font?.lineHeight ?? 1.2,
      family: options.font?.family ?? "sans-serif",
      color: options.font?.color ?? "black",
      weight: options.font?.weight ?? "normal"
    };
  }

  mounted() {
    this.root = this;
    this.layerManager.mounted();
    this.render();
    super.mounted();

    this.unmounted = () => {
      super.unmounted();
      this.keyMap.clear();
      this.quickElements.clear();
    };
  }

  getElementByKey<T = Element>(key: string): T | undefined {
    return this.keyMap.get(key) as any;
  }

  nextFrame(callback?: () => void) {
    requestAnimationFrame(() => {
      callback?.();
      this.render();
    });
  }

  render() {
    const point = this.getLocalPoint();
    this.layerManager.renderStart();
    super.layout(
      Constraint.loose(this.layerManager.width, this.layerManager.height!)
    );
    super.calcMatrix();
    super.draw();
    this.layerManager.renderEnd();
    return point;
  }
}

export function root(options: RootOptions) {
  return new Root(options);
}
