import { AnimationController, AnimationType } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";
import { debounce } from "lodash-es";
import { Rect } from "./types";
import { LayerManager } from "./layer";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLElement;
  // width: number;
  // height: number;
  useDirtyRect?: boolean;
  dirtyDebug?: boolean;
  children?: Element[];
  // font?: TextOptions["font"] & {
  //   color?: string;
  // };
}

export class Root extends Element {
  el: HTMLElement;
  // ctx: CanvasRenderingContext2D;
  layerManager: LayerManager;
  type = "root";
  ac: AnimationController;
  keyMap = new Map<string, Element>();
  quickElements: Set<Element> = new Set();
  cursorElements: Set<Element> = new Set();
  // dirtys: Set<Element> = new Set();
  // font: Required<RootOptions["font"]>;
  currentElement?: Element;
  useDirtyRect: boolean;
  dirtyDebugRoot?: Root;
  constructor(options: RootOptions) {
    super(options);
    this.root = this;
    this.el = options.el;
    this.layerManager = new LayerManager(options.el, this);
    // this.useDirtyRect = options.useDirtyRect ?? false;
    this.ac = new AnimationController(
      options.animationSwitch ? options.animationTime ?? 300 : 0
    );
    // this.font = {
    //   style: options.font?.style ?? "normal",
    //   variant: options.font?.variant ?? "normal",
    //   stretch: options.font?.stretch ?? "normal",
    //   size: options.font?.size ?? 16,
    //   lineHeight: options.font?.lineHeight ?? 1.2,
    //   family: options.font?.family ?? "sans-serif",
    //   color: options.font?.color ?? "black",
    //   weight: options.font?.weight ?? "normal"
    // };

    // if (this.useDirtyRect && options.dirtyDebug) {
    //   const dirtyCanvas = document.createElement("canvas") as HTMLCanvasElement;
    //   const rect = this.el.getBoundingClientRect();
    //   dirtyCanvas.style.cssText = `
    //     position:absolute;
    //     top:${rect.top}px;
    //     left:${rect.left}px;
    //     pointer-events: none;
    //   `;
    //   this.el.parentElement?.append(dirtyCanvas);
    //   this.dirtyDebugRoot = new Root({
    //     el: dirtyCanvas,
    //     width: options.width,
    //     height: options.height
    //   });
    //   this.dirtyDebugRoot.mounted();
    // }
  }

  mounted() {
    this.root = this;
    this.layerManager.mounted();
    this.render();
    super.mounted();
    //忘记干嘛的
    this.eventManage.hasUserEvent = true;

    this.unmounted = () => {
      super.unmounted();
      this.keyMap.clear();
      this.quickElements.clear();
    };
  }

  getElementByKey<T = Element>(key: string): T | undefined {
    return this.keyMap.get(key) as any;
  }

  nextFrame() {
    return new Promise((resolve) => {
      this.ac.addEventListener(
        AnimationType.END,
        () => {
          this.ac.timeLine.progress = 0;
          resolve(null);
        },
        {
          once: true
        }
      );
      this.ac.timeLine.progress = 1;
      this.ac.play();
    });
  }

  render() {
    const point = this.getLocalPoint();
    // this.ctx.clearRect(0, 0, this.width!, this.height!);
    // this.ctx.font = generateFont(this.font);
    // this.ctx.textBaseline ="ideographic"
    this.layerManager.render();
    super.layout(Constraint.loose(this.width!, this.height!));
    super.calcMatrix();
    super.draw();
    // this.isDirty = false;
    return point;
  }

  // //就脏节点开始重绘制
  // dirtyRender = debounce(() => {
  //   if (this.dirtys.has(this)) {
  //     this.dirtys.clear();
  //     super.render();
  //     return;
  //   }
  //   console.time("dirtyRectMerger");
  //   const dirtys = Array.from(this.dirtys);
  //   this.dirtys.clear();
  //   const aabbs = dirtys.map((v) => v.getBoundingBox());
  //   const mergeDirtyAABB = mergeOverlappingRects(aabbs);
  //   const needRerender: Set<Element> = new Set();
  //   function walk(el: Element, dirtyAABB: Array<Rect>) {
  //     if (el.parent) {
  //       let parent: Element | undefined = el.parent;
  //       while (parent) {
  //         let aabb = parent.getBoundingBox();
  //         if (dirtyAABB.some((v) => isPartiallyIntersecting(aabb, v))) {
  //           needRerender.add(parent);
  //           return;
  //         }
  //         parent = parent?.parent;
  //       }
  //       const provide = el.parent.provideLocalCtx();
  //       if (provide.backgroundColorEl || provide.overflowHideEl) {
  //         const el = provide.backgroundColorEl || provide.overflowHideEl!;
  //         walk(el, [el.getBoundingBox()]);
  //         return;
  //       }
  //     }
  //     if (el.parent?.children) {
  //       const children = el.parent?.children;
  //       for (let index = 0; index < children.length; index++) {
  //         const element = children[index];
  //         const isDirty = element.isDirty;
  //         if (isDirty || needRerender.has(element)) {
  //           continue;
  //         }
  //         const isCurrent = element === el;
  //         const aabb = element.getBoundingBox();
  //         if (isCurrent && dirtyAABB.some((v) => isOverlap(v, aabb))) {
  //           needRerender.add(element);
  //         } else if (dirtyAABB.some((v) => isOverlapAndNotAdjacent(v, aabb))) {
  //           dirtyAABB.push(aabb);
  //           needRerender.add(element);
  //         }
  //       }
  //     }
  //   }
  //   dirtys.forEach((v) => walk(v, mergeDirtyAABB.slice(0)));
  //   console.log(needRerender);
  //   console.timeEnd("dirtyRectMerger");

  //   if (needRerender.has(this)) {
  //     needRerender.clear();
  //     needRerender.add(this);
  //   }

  //   // const mergeDirtyAABB1 = mergeOverlappingRects(mergeDirtyAABB);
  //   // console.log(mergeDirtyAABB1, "--");
  //   // if (this.dirtyDebugRoot) {
  //   //   this.dirtyDebugRoot.children = Array.from(needRerender).map((v) => {
  //   //     const point = v.getLocalPoint(v.getWordPoint());
  //   //     return new Element({
  //   //       x: point.x,
  //   //       y: point.y,
  //   //       width: v.size.width,
  //   //       height: v.size.height,
  //   //       backgroundColor: "rgba(128, 0, 128, 0.5)"
  //   //     });
  //   //   });
  //   //   this.dirtyDebugRoot.render();
  //   // }

  //   needRerender.forEach((v) => {
  //     v.isDirty = true;
  //     v.render();
  //   });
  //   if (this.dirtyDebugRoot) {
  //     setTimeout(() => {
  //       this.dirtyDebugRoot!.children = [];
  //       this.dirtyDebugRoot!.render();
  //     }, 300);
  //   }
  // });
}

export function root(options: RootOptions) {
  return new Root(options);
}
