import { Point } from "../util/point";
import type { Element } from "./base";

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

export interface CanvasPoint {
    target: Element;
    x: number;
    y: number;
    buttons: number;
    deltaY?: number;
    deltaX?: number;
}

export class EventManage {
    hasMouseEnter = false;
    //是否注册过事件
    hasUserEvent = false;
    constructor(private target: Element) {
    }

    notify(eventName: string, event: CanvasPoint) {
        if (eventName === "mouseenter") {
            if (this.hasMouseEnter) {
                return;
            }
            if (this.target.cursor) {
                this.target.root.canvasEl.style.cursor = this.target.cursor;
            }

            this.hasMouseEnter = true;
        }

        if (eventName === "mouseleave" && this.hasMouseEnter) {
            if (this.target.hasPointHint(event.x, event.y)) {
                return;
            }
            this.target.root.canvasEl.style.cursor = "default";
            this.hasMouseEnter = false;
        }

        let parent = this.target.parent;
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
        while (parent !== this.target.root) {
            parent = parent?.parent;
        }
        if (parent) {
            parent.eventManage.notify(eventName, event);
        }
    }

    mounted() { }

    unmounted() { }
}
