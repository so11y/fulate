import { CustomEvent } from "../util/event";
import { Point } from "../util/point";
import type { Element } from "./node/element";

export type UserCanvasEvent = Event & FulateEvent;

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
    data?: any;
    ctrlKey?: boolean;
  };
}

export class EventManage {
  hasMouseEnter = false;
  //是否注册过事件
  hasUserEvent = false;
  constructor(private target: Element) {}

  notify(eventName: string, event?: Partial<FulateEvent["detail"]>) {
    if (eventName === "mouseenter") {
      if (this.hasMouseEnter && event.target !== this.target) {
        return;
      }

      this.hasMouseEnter = true;
    }

    if (eventName === "mouseleave" && this.hasMouseEnter) {
      if (this.target.hasPointHint?.(new Point(event.x, event.y))) {
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
        deltaX: event?.deltaX ?? 0,
        data: event?.data ?? null
      }
    });
    this.target.dispatchEvent(customEvent);
    if (customEvent.cancelBubble) {
      return;
    }
    if (!parent) {
      return;
    }

    while (parent !== this.target.root) {
      parent = parent?.parent;
    }
    if (parent) {
      parent.eventManage.notify(eventName, event, event?.target ?? this.target);
    }
  }
}
