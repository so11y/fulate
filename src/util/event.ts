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

export interface FulateEvent<T = any> extends Omit<PointerEvent, "detail"> {
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

export interface CustomEventInit<T = any> {
  detail?: T;
  bubbles?: boolean;
  capture?: boolean;
}

export class CustomEvent<T = any> {
  readonly type: string;
  readonly detail: T;
  readonly bubbles: boolean;
  readonly capture: boolean;

  /** @internal */
  _stopPropagationFlag = false;
  /** @internal */
  _stopImmediatePropagationFlag = false;

  get cancelBubble(): boolean {
    return this._stopPropagationFlag;
  }
  set cancelBubble(value: boolean) {
    this._stopPropagationFlag = value;
  }

  stopPropagation(): void {
    this._stopPropagationFlag = true;
  }

  stopImmediatePropagation(): void {
    this._stopPropagationFlag = true;
    this._stopImmediatePropagationFlag = true;
  }

  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    this.type = type;
    this.detail = eventInitDict?.detail as T;
    this.bubbles = eventInitDict?.bubbles ?? false;
    this.capture = eventInitDict?.capture ?? false;
  }
}

type EventCallback<T = any> = (data: T) => void;

export interface AddEventListenerOptions {
  once?: boolean;
}

export class EventEmitter {
  parent?: EventEmitter;

  private events: Map<string, Set<EventCallback>> = new Map();

  addEventListener<T = any>(
    eventName: string,
    callback: EventCallback<T>,
    options?: AddEventListenerOptions
  ): () => void {
    const once = options?.once ?? false;
    const handler: EventCallback<T> = once
      ? (data) => {
          callback(data);
          this.removeEventListener(eventName, handler);
        }
      : callback;

    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }

    const callbacks = this.events.get(eventName)!;
    callbacks.add(handler);

    return () => this.removeEventListener(eventName, handler);
  }

  removeEventListener(eventName: string, callback?: EventCallback): void {
    if (!this.events.has(eventName)) return;

    if (callback) {
      const callbacks = this.events.get(eventName)!;
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(eventName);
      }
    } else {
      this.events.delete(eventName);
    }
  }

  dispatchEvent<T = any>(event: CustomEvent<T>): void {
    const callbacks = this.events.get(event.type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event);
          if (event._stopImmediatePropagationFlag) break;
        } catch (error) {
          console.error(`Error in event handler for "${event.type}":`, error);
        }
      }
    }

    if (event.bubbles && !event.cancelBubble && this.parent) {
      this.parent.dispatchEvent(event);
    }
  }

  clearEventListener(): void {
    this.events.clear();
  }
}
