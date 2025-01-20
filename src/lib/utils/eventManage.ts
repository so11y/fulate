import type { Element } from "../base"

export type UserCanvasEvent = Event & { detail: CanvasPoint }

export type EventName = "pointermove" | "click" | "pointerdown" | "pointerup" | "contextmenu" | "mouseenter" | "mouseleave" | "wheel"
export type CanvasPointEvent = (evt: (UserCanvasEvent)) => void

export interface CanvasPoint {
  target: Element
  x: number
  y: number
  buttons: number,
  deltaY?: number,
  deltaX?: number,
}


export class EventManage extends EventTarget {
  hasUserEvent = false
  hasMouseEnter = false
  constructor(private target: Element) {
    super()
  }

  notify(eventName: string, event: CanvasPoint) {

    if (eventName === "mouseenter") {
      if (this.hasMouseEnter) {
        return
      }
      this.hasMouseEnter = true
    }

    if (eventName === "mouseleave" && this.hasMouseEnter) {
      if (this.target.hasPointHint(event.x, event.y)) {
        return
      }
      this.hasMouseEnter = false
    }


    let parent = this.target.parent
    const customEvent = new CustomEvent(eventName, {
      detail: {
        target: event?.target ?? this.target,
        x: event?.x ?? 0,
        y: event?.y ?? 0,
        buttons: event?.buttons ?? 0,
        deltaY: event?.deltaY ?? 0,
        deltaX: event?.deltaX ?? 0,
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

  mounted() {

  }



  unmounted() {
  }
}