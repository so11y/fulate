import type { Element } from "./node/element";

export type UserCanvasEvent = Event & { detail: CanvasPoint };

export type EventName =
  | "pointermove"
  | "click"
  | "pointerdown"
  | "pointerup"
  | "contextmenu"
  | "mouseenter"
  | "mouseleave"
  | "wheel"
  | "sizeUpdate";
export type CanvasPointEvent = (evt: UserCanvasEvent) => void;

export interface FulateEvent<T = Element> extends Omit<PointerEvent, "detail"> {
  detail: {
    x: number;
    y: number;
    target: T;
    buttons: number;
    deltaX: number;
    deltaY: number;
  };
}

export interface CanvasPoint<T = Element> {
  target: T;
  x: number;
  y: number;
  buttons: number;
  deltaY?: number;
  deltaX?: number;
  ctrlKey?: boolean;
  originalClientX: number;
  originalClientY: number;
}

export class EventManage {
  hasMouseEnter = false;
  //是否注册过事件
  hasUserEvent = false;
  constructor(private target: Element) {}

  notify(eventName: string, event: CanvasPoint) {
    if (eventName === "mouseenter") {
      if (this.hasMouseEnter) {
        return;
      }
      // if (this.target.cursor) {
      //   this.target.root.container.style.cursor = this.target.cursor;
      // }

      this.hasMouseEnter = true;
    }

    if (eventName === "mouseleave" && this.hasMouseEnter) {
      //@ts-ignore
      if (this.target.hasPointHint?.(event.x, event.y)) {
        return;
      }
      this.target.root.container.style.cursor = "default";
      this.hasMouseEnter = false;
    }

    let parent = this.target.parent as any;
    const customEvent = new CustomEvent(eventName, {
      detail: {
        target: event?.target ?? this.target,
        x: event?.x ?? 0,
        y: event?.y ?? 0,
        buttons: event?.buttons ?? 0,
        deltaY: event?.deltaY ?? 0,
        deltaX: event?.deltaX ?? 0
      }
    });
    this.target.dispatchEvent(customEvent);
    if (customEvent.cancelBubble) {
      return;
    }
    if (!parent) {
      return;
    }
    //@ts-ignore
    while (parent !== this.target.root) {
      parent = parent?.parent;
    }
    if (parent) {
      parent.eventManage.notify(eventName, event);
    }
  }

  mounted() {}

  unmounted() {}
}
