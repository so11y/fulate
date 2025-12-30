import { Layer } from './layer';
import { type Element } from "./base"

export class Root extends Layer {
    type = "root";
    container: HTMLElement;

    currentElement?: Element

    quickElements: Array<Element> = []

    constructor(el: HTMLElement, options: any) {
        super(options);
        this.container = el;
        //TODO 未来根据最大layer动态调整
        this.container.style.position = "relative"
        this.container.style.zIndex = (10).toString()
        this.cursor = "default"
    }

    mounted() {
        this.root = this;
        super.mounted();
        this.calcOwnMatrix()
        this.calcEventSort();
        this.calcEvent();
        this.render()
    }

    calcEvent() {
        const el = this.container;
        const rect = el.getBoundingClientRect();
        const abortController = new AbortController();

        //为了如果鼠标按下那么即便鼠标已经移动出canvas之外
        //也能继续触发的这个元素的事件
        let hasLockPoint = false;

        document.addEventListener(
            "pointermove",
            (e) => {
                const offsetX = e.clientX - rect.x;
                const offsetY = e.clientY - rect.y;
                const prevElement = this.currentElement;
                if (hasLockPoint === false) {
                    this.currentElement = undefined;
                    for (const element of this.quickElements) {
                        if (element.hasInView() && element.hasPointHint(offsetX, offsetY)) {
                            this.currentElement = element;
                            break;
                        }
                    }
                }

                if (!this.currentElement) {
                    el.style.cursor = "default";
                    return;
                }

                if (this.currentElement.cursor) {
                    el.style.cursor = this.currentElement.cursor;
                }

                if (this.currentElement !== prevElement) {
                    notify(e, "mouseleave", prevElement);
                    notify(e, "mouseenter");
                }

                notify(e, "pointermove");
            },
            {
                signal: abortController.signal
            }
        );

        document.addEventListener("click", (e) => notify(e, "click"), {
            signal: abortController.signal
        });
        document.addEventListener("pointerdown", (e) => notify(e, "pointerdown"), {
            signal: abortController.signal
        });
        document.addEventListener("pointerup", (e) => notify(e, "pointerup"), {
            signal: abortController.signal
        });

        document.addEventListener("contextmenu", (e) => notify(e, "contextmenu"), {
            signal: abortController.signal
        });

        el.addEventListener(
            "wheel",
            (e: any) => {
                e.preventDefault();
                notify(e, "wheel");
            },
            {
                signal: abortController.signal,
                passive: false
            }
        );

        const notify = (
            e: PointerEvent | MouseEvent | WheelEvent,
            eventName: string,
            el = this.currentElement
        ) => {

            if (!el) {
                hasLockPoint = false;
                return;
            }
            if (eventName === "contextmenu") {
                e.preventDefault();
            }
            if (eventName === "pointerdown") {
                hasLockPoint = true;
            } else if (eventName === "pointerup") {
                hasLockPoint = false;
            }
            const offsetX = e.clientX - rect.x;
            const offsetY = e.clientY - rect.y;
            el.eventManage.notify(eventName, {
                target: el,
                x: offsetX,
                y: offsetY,
                buttons: e.buttons,
                deltaY: (e as WheelEvent).deltaY ?? 0,
                deltaX: (e as WheelEvent).deltaX ?? 0
            });
        };

        this.unmounted = () => {
            abortController.abort();
            super.unmounted()
        };
    }

    calcEventSort() {
        const stack: Element[] = [this];
        const resultStack: Element[] = [];
        while (stack.length > 0) {
            const currentNode = stack.pop()!; // 取出栈顶节点
            if (currentNode.eventManage.hasUserEvent) {
                resultStack.unshift(currentNode);
            }
            if (currentNode.children) {
                for (let i = currentNode.children.length - 1; i >= 0; i--) {
                    stack.push(currentNode.children[i]);
                }
            }
        }
        this.quickElements = resultStack
    }
}
