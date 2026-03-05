import { Element, BaseElementOption } from "../node/element";
import { Node } from "../node/node";
import { Root } from "../root";
import { Select } from "../tools/select";

interface ElementState {
  props: BaseElementOption;
  parent: Node | undefined;
  index: number;
  isActiveed: boolean;
  isMounted: boolean;
}

interface HistoryRecord {
  element: Element; // 核心：始终保持同一个对象的引用，绝对不要 new
  prev: ElementState;
  next: ElementState;
  type: "modify" | "delete" | "create";
}

export class HistoryManager {
  private undoStack: HistoryRecord[][] = [];
  private redoStack: HistoryRecord[][] = [];
  private snapshotMap = new Map<Element, ElementState>();
  private limit: number;
  root?: Root;

  constructor(root: Root, limit = 50) {
    this.root = root;
    this.limit = limit;
  }

  // 获取当前状态
  private getState(element: Element): ElementState {
    const parent = element.parent;
    const index =
      parent && parent.children ? parent.children.indexOf(element) : -1;
    return {
      isMounted: element.isMounted,
      isActiveed: element.isActiveed,
      props: JSON.parse(JSON.stringify(element.toJson())),
      parent,
      index
    };
  }

  // 1. 记录快照（操作前调用）
  snapshot(elements: Element[]) {
    this.snapshotMap.clear();
    elements.forEach((el) => {
      this.snapshotMap.set(el, this.getState(el));
    });
  }

  // 2. 提交变更（操作后调用）
  commit() {
    if (this.snapshotMap.size === 0) return;


    const changes: HistoryRecord[] = [];

    this.snapshotMap.forEach((prevState, element) => {
      const nextState = this.getState(element);

      const isPropsChanged =
        JSON.stringify(prevState.props) !== JSON.stringify(nextState.props);
      const isParentChanged = prevState.parent !== nextState.parent;
      const isIndexChanged = prevState.index !== nextState.index;

      if (isPropsChanged || isParentChanged || isIndexChanged) {
        let type: "modify" | "delete" | "create" = "modify";
        if (prevState.isActiveed && !nextState.isActiveed) {
          type = "delete";
        } else if (!prevState.isMounted && nextState.isMounted) {
          type = "create";
        }

        changes.push({
          element,
          prev: prevState,
          next: nextState,
          type
        });
      }
    });

    if (changes.length > 0) {
      this.undoStack.push(changes);
      if (this.undoStack.length > this.limit) {
        this.undoStack.shift(); // 超过限制，移除最旧的记录
      }
      this.redoStack = []; // 只要有了新操作，清空重做栈
      console.log("History saved:", changes.length, "changes");
    }

    this.snapshotMap.clear();
  }

  // 辅助方法：将元素准确插入到旧位置
  private insertElementAt(parent: Node, element: Element, index: number) {
    if (!parent.children) return;
    if (index >= parent.children.length || index === -1) {
      parent.append(element);
    } else {
      const ref = parent.children[index];
      if (ref !== element) {
        // 防止重复插入自身
        parent.insertBefore(element, ref);
      }
    }
  }

  // 3. 撤销 (Undo)
  undo() {
    const records = this.undoStack.pop();
    if (!records) return;

    this.redoStack.push(records);

    const selectedElements: Element[] = [];

    const layerPromise = new Set();

    for (let i = records.length - 1; i >= 0; i--) {
      const { element, prev, type } = records[i];

      if (type === "create") {
        // 撤销创建 -> 移除DOM
        element.parent?.removeChild(element);
      } else if (type === "delete") {
        // 撤销删除 -> 直接复用原对象插入回原父节点
        if (prev.parent) {
          this.insertElementAt(prev.parent, element, prev.index);
        }
        element.quickSetOptions(prev.props); // 恢复属性
        selectedElements.push(element);
      } else {
        // 撤销修改
        element.quickSetOptions(prev.props);
        selectedElements.push(element);
      }
      layerPromise.add(element.layer?._renderPromise ?? Promise.resolve());
    }

    // this.root.requestRender();

    Promise.all(Array.from(layerPromise)).then(() => {
      this.root.find<Select>("select")?.select(selectedElements);
    });
  }

  redo() {
    const records = this.redoStack.pop();
    if (!records) return;

    this.undoStack.push(records);

    const selectedElements: Element[] = [];
    const layerPromise = new Set();

    for (let i = 0; i < records.length; i++) {
      const { element, next, type } = records[i];

      if (type === "delete") {
        element.parent?.removeChild(element);
      } else if (type === "create") {
        if (next.parent) {
          this.insertElementAt(next.parent, element, next.index);
        }
        element.quickSetOptions(next.props);
        selectedElements.push(element);
      } else {
        // 重做修改
        element.quickSetOptions(next.props);
        selectedElements.push(element);
      }
      layerPromise.add(element.layer?._renderPromise ?? Promise.resolve());
    }

    this.root.find<Select>("select")?.select(selectedElements);

    Promise.all(Array.from(layerPromise)).then(() => {
      this.root.find<Select>("select")?.select(selectedElements);
    });
  }
}
