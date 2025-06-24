import { AnimationController } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";
import { Layer, LayerManager } from "./layer";
import { TextOptions } from "./text";
import { linkEl } from "./utils/helper";
import { flatten } from "lodash-es";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLElement;
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
  quickElements: Array<Element> = [];
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
    this.calcRenderContext();
    this.render();
    this.calcEventSort();
    super.mounted();

    this.unmounted = () => {
      super.unmounted();
      this.keyMap.clear();
      this.quickElements = [];
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

  calcRenderContext() {
    this.renderContext = {
      layer: this.layerManager.getLayer()!
    };
    if (this.children?.length) {
      this.children?.forEach((child) => {
        linkEl(child, this);
        child.calcRenderContext();
      });
    }
  }

  calcEventSort() {
    //让事件先注册上去
    setTimeout(() => {
      const layerMap = {};
      this.renderContext?.layer.key;
      const stack: Element[] = [this]; // 初始化栈，放入根节点
      const resultStack: Element[] = [];
      while (stack.length > 0) {
        const currentNode = stack.pop()!; // 取出栈顶节点
        resultStack.push(currentNode);
        if (currentNode.children) {
          for (let i = currentNode.children.length - 1; i >= 0; i--) {
            stack.push(currentNode.children[i]);
          }
        }
      }
      while (resultStack.length > 0) {
        const currentNode = resultStack.pop()!;
        if (!layerMap[currentNode.renderContext?.layer.key!]) {
          layerMap[currentNode.renderContext?.layer.key!] = [];
        }
        if (currentNode.eventManage.hasUserEvent) {
          const layerNodes = layerMap[currentNode.renderContext?.layer.key!];
          layerNodes.push(currentNode);
        }
      }

      this.quickElements = flatten(
        Object.values(layerMap).reverse()
      ) as Element[];

      console.log(this.quickElements);
    }, 0);
  }

  hasPointHint(x: number, y: number) {
    const local = this.globalToLocal(x, y);
    return (
      local.x >= 0 &&
      local.x <= this.layerManager.width &&
      local.y >= 0 &&
      local.y <= this.layerManager.height
    );
  }
}

export function root(options: RootOptions) {
  return new Root(options);
}
