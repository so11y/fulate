import type { Element } from "../base"


export type EventName = "pointermove" | "click" | "pointerdown" | "pointerup" | "contextmenu"
export type CanvasPointEvent = (evt: (Event & { detail: CanvasPoint })) => void

export interface CanvasPoint {
  target: Element
  x: number
  y: number
  buttons: number
}


export class EventManage extends EventTarget {
  hasUserEvent = false
  constructor(private target: Element) {
    super()
  }

  notify(eventName: string, event?: CanvasPoint) {
    let parent = this.target.parent
    const customEvent = new CustomEvent(eventName, {
      detail: {
        target: event?.target ?? this.target,
        x: event?.x ?? 0,
        y: event?.y ?? 0,
        buttons: event?.buttons ?? 0,
      },
    })
    if (this.hasUserEvent) {
      this.target.dispatchEvent(customEvent)
      if (customEvent.cancelBubble) {
        return
      }
    }
    if (!parent) {
      return
    }
    while (
      (parent!.isInternal || parent!.eventManage.hasUserEvent === false) &&
      parent !== this.target.root
    ) {
      parent = parent?.parent
    }
    if (parent) {
      parent.eventManage.notify(eventName, event)
    }
  }
  //还不知道是不是要改成setimeout来简单切一下
  // notify(eventName: string, event?: CanvasPoint) {
  //   const customEvent = new CustomEvent(eventName, {
  //     detail: {
  //       target: event?.target ?? this.target,
  //       x: event?.x ?? 0,
  //       y: event?.y ?? 0,
  //       buttons: event?.buttons ?? 0,
  //     },
  //   });

  //   if (this.hasUserEvent) {
  //     this.target.dispatchEvent(customEvent);
  //     if (customEvent.cancelBubble) {
  //       return;
  //     }
  //   }

  //   const notifyParent = (parent: Element | null) => {
  //     if (!parent) {
  //       return;
  //     }

  //     // 检查是否满足条件
  //     if (
  //       (parent.isInternal || parent.eventMeager.hasUserEvent === false) &&
  //       parent !== this.target.root
  //     ) {
  //       // 继续向上查找父节点
  //       setTimeout(() => notifyParent(parent.parent), 0);
  //     } else {
  //       // 找到符合条件的父节点，触发事件
  //       parent.eventMeager.notify(eventName, event);
  //     }
  //   };

  //   // 开始查找父节点
  //   notifyParent(this.target.parent);
  // }

  mounted() {
    this.addEventListener("click", this.target.click)
  }

  unmounted() {
    this.removeEventListener("click", this.target.click)
  }
}