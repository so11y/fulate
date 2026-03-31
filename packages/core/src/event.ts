import { Point } from "@fulate/util";

export type UserCanvasEvent = Event & FulateEvent;

export type EventName =
  | "pointermove"
  | "click"
  | "pointerdown"
  | "pointerup"
  | "contextmenu"
  | "mouseenter"
  | "mouseleave"
  | "wheel";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FulateEventMap {}

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
    shiftKey?: boolean;
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

  isHover = false;
  isSubscribed = false;

  private events: Map<string, Set<EventCallback>> = new Map();

  addEventListener<K extends keyof FulateEventMap>(
    eventName: K,
    callback: EventCallback<FulateEventMap[K]>,
    options?: AddEventListenerOptions
  ): () => void;
  addEventListener<T = FulateEvent>(
    eventName: string,
    callback: EventCallback<T>,
    options?: AddEventListenerOptions
  ): () => void;
  addEventListener(
    eventName: string,
    callback: EventCallback<any>,
    options?: AddEventListenerOptions
  ): () => void {
    this.isSubscribed = true;
    const once = options?.once ?? false;
    const handler: EventCallback<any> = once
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

  dispatchEvent(event: CustomEvent): void;
  dispatchEvent(
    eventName: string,
    detail?: Partial<FulateEvent["detail"]>
  ): void;
  dispatchEvent(
    eventOrName: CustomEvent | string,
    detail?: Partial<FulateEvent["detail"]>
  ) {
    let event: CustomEvent;

    if (typeof eventOrName === "string") {
      const eventName = eventOrName;

      if (eventName === "mouseenter") {
        if (this.isHover) return;
        this.isHover = true;
      }

      if (eventName === "mouseleave" && this.isHover) {
        if ((this as any).hasPointHint?.(new Point(detail?.x, detail?.y))) {
          return;
        }
        const root = (this as any).root;
        root?.container && (root.container.style.cursor = "default");
        this.isHover = false;
      }

      event = new CustomEvent(eventName, {
        detail: {
          target: detail?.target ?? this,
          x: detail?.x ?? 0,
          y: detail?.y ?? 0,
          buttons: detail?.buttons ?? 0,
          deltaY: detail?.deltaY ?? 0,
          deltaX: detail?.deltaX ?? 0,
          data: detail?.data ?? null,
          ctrlKey: detail?.ctrlKey,
          shiftKey: detail?.shiftKey
        },
        bubbles: true
      });
    } else {
      event = eventOrName;
    }

    this._fireCallbacks(event);

    if (event.bubbles && !event.cancelBubble) {
      let target = this.parent;
      while (target && !event.cancelBubble) {
        if ((target as any).isLayer || !(target as any).pickable) {
          target = target.parent;
          continue;
        }
        target._fireCallbacks(event);
        target = target.parent;
      }
    }
  }

  /** @internal */
  _fireCallbacks(event: CustomEvent) {
    const callbacks = this.events.get(event.type);
    if (!callbacks) return;
    for (const callback of callbacks) {
      try {
        callback.call(this, event);
        if (event._stopImmediatePropagationFlag) break;
      } catch (error) {
        console.error(`Error in event handler for "${event.type}":`, error);
      }
    }
  }

  clearEventListener(): void {
    this.events.clear();
  }
}

/**
 * Async-capable veto event. Listeners call `reject()` to synchronously veto,
 * or `rejectAsync(promise)` to veto asynchronously (e.g. confirm dialog,
 * server validation). After dispatching, the caller `await`s `resolve()` to
 * get the final verdict.
 */
export class AsyncVetoEvent<T extends Record<string, any> = Record<string, any>> {
  readonly data: T;

  private _rejected = false;
  private _promises: Promise<void>[] = [];

  constructor(data: T) {
    this.data = data;
  }

  get rejected() {
    return this._rejected;
  }

  reject() {
    this._rejected = true;
  }

  rejectAsync(promise: Promise<void>) {
    this._promises.push(promise);
  }

  async resolve(): Promise<boolean> {
    if (this._rejected) return false;
    if (this._promises.length === 0) return true;
    try {
      await Promise.all(this._promises);
      return !this._rejected;
    } catch {
      return false;
    }
  }
}
