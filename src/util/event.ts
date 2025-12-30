// types/event-emitter.ts
type EventCallback<T = any> = (data: T) => void;
type EventMap = Record<string, EventCallback>;

export class EventEmitter {
    private events: Map<string, Set<EventCallback>> = new Map();

    /**
     * 订阅事件
     * @param eventName 事件名称
     * @param callback 回调函数
     * @returns 取消订阅的函数
     */
    on<T = any>(eventName: string, callback: EventCallback<T>): () => void {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        const callbacks = this.events.get(eventName)!;
        callbacks.add(callback);

        // 返回取消订阅的函数
        return () => this.off(eventName, callback);
    }

    /**
     * 订阅一次事件（触发后自动取消订阅）
     * @param eventName 事件名称
     * @param callback 回调函数
     * @returns 取消订阅的函数
     */
    once<T = any>(eventName: string, callback: EventCallback<T>): () => void {
        const onceWrapper: EventCallback<T> = (data) => {
            callback(data);
            this.off(eventName, onceWrapper);
        };

        return this.on(eventName, onceWrapper);
    }

    /**
     * 取消订阅事件
     * @param eventName 事件名称
     * @param callback 回调函数（可选，不传则取消该事件的所有订阅）
     */
    off(eventName: string, callback?: EventCallback): void {
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

    /**
     * 发布/触发事件
     * @param eventName 事件名称
     * @param data 传递给回调函数的数据
     */
    emit<T = any>(eventName: string, data?: T): void {
        if (!this.events.has(eventName)) return;

        const callbacks = this.events.get(eventName)!;

        // 复制回调集合，避免在遍历时修改导致的错误
        const callbacksCopy = new Set(callbacks);

        callbacksCopy.forEach(callback => {
            try {
                callback(data as T);
            } catch (error) {
                console.error(`Error in event handler for "${eventName}":`, error);
            }
        });
    }


    /**
     * 清空所有事件订阅
     */
    clear(): void {
        this.events.clear();
    }
}