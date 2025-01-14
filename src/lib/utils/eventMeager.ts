import type { Element } from "../base"

interface MousePoint {
  clientX: number
  clientY: number
}


export class EventManage extends EventTarget {
  constructor(private target: Element) {
    super()
  }

  notify(eventName: string, event?: MousePoint) {
    let parent = this.target.parent
    const clickEvent = new CustomEvent(eventName, {
      detail: {
        target: this.target,
        clientX: event?.clientX ?? 0,
        clientY: event?.clientY ?? 0,
      },
    })
    this.target.dispatchEvent(clickEvent)
    if (clickEvent.cancelBubble) {
      return
    }
    while (parent?.isInternal) {
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