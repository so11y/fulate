import type { Element } from "../base"

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
      (parent!.isInternal || parent!.eventMeager.hasUserEvent === false) &&
      parent !== this.target.root
    ) {
      parent = parent?.parent
    }
    if (parent) {
      parent.eventMeager.notify(eventName, event)
    }
  }

  mounted() {
    this.addEventListener("click", this.target.click)
  }

  unmounted() {
    this.removeEventListener("click", this.target.click)
  }
}