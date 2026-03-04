// types/event-emitter.ts

export interface CustomEventInit<T = any> {
  detail?: T;
  /** 是否处于捕获阶段 */
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

  /** 是否已取消冒泡（对应 stopPropagation，可写以兼容 DOM） */
  get cancelBubble(): boolean {
    return this._stopPropagationFlag;
  }
  set cancelBubble(value: boolean) {
    this._stopPropagationFlag = value;
  }

  /** 阻止事件冒泡 */
  stopPropagation(): void {
    this._stopPropagationFlag = true;
  }

  /** 阻止冒泡并阻止同一事件的其他监听器被调用 */
  stopImmediatePropagation(): void {
    this._stopPropagationFlag = true;
    this._stopImmediatePropagationFlag = true;
  }

  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    this.type = type;
    this.detail = eventInitDict?.detail as T;
    this.capture = eventInitDict?.capture ?? false;
  }
}

type EventCallback<T = any> = (data: T) => void;

export interface AddEventListenerOptions {
  /** 是否只触发一次后自动移除 */
  once?: boolean;
  /** 是否冒泡 */
  bubbles?: boolean;
  /** 是否处于捕获阶段 */
  capture?: boolean;
}

export class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param callback 回调函数
   * @param options 第三个参数：如 { once: true }、{ bubbles: true }、{ capture: true }
   * @returns 取消订阅的函数
   */
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

  /**
   * 取消订阅事件
   * @param eventName 事件名称
   * @param callback 回调函数（可选，不传则取消该事件的所有订阅）
   */
  removeEventListener(eventName: string, callback?: EventCallback): void {
    if (!this.events.has(eventName)) return;

    if (callback) {
      const callbacks = this.events.get(eventName)!;
      callbacks.delete(callback);

      // 如果没有回调了，删除事件
      if (callbacks.size === 0) {
        this.events.delete(eventName);
      }
    } else {
      // 删除该事件的所有订阅
      this.events.delete(eventName);
    }
  }

  dispatchEvent<T = any>(event: CustomEvent<T>): void {

    if (!this.events.has(event.type)) return;

    const callbacks = this.events.get(event.type)!;

    for (const callback of callbacks) {
      try {
        callback(event);
        if (event?._stopImmediatePropagationFlag) break;
      } catch (error) {
        console.error(`Error in event handler for "${event.type}":`, error);
      }
    }
  }

  /**
   * 清空所有事件订阅
   */
  clearEventListener(): void {
    this.events.clear();
  }
}
