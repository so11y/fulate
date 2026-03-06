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

interface ActionRecord {
  undo: () => void;
  redo: () => void;
}

type HistoryEntry = HistoryRecord[] | ActionRecord;

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private snapshotMap = new Map<Element, ElementState>();
  private limit: number;
  root?: Root;

  constructor(root: Root, limit = 50) {
    this.root = root;
    this.limit = limit;
  }

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

  snapshot(elements: Element[]) {
    this.snapshotMap.clear();
    elements.forEach((el) => {
      this.snapshotMap.set(el, this.getState(el));
    });
  }

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
        this.undoStack.shift();
      }
      this.redoStack = [];
    }

    this.snapshotMap.clear();
  }

  pushAction(undo: () => void, redo: () => void) {
    this.undoStack.push({ undo, redo });
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

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

  private executeHistory(config: {
    sourceStack: any[];
    targetStack: any[];
    isReverse: boolean; // 控制遍历方向
    getData: (record: any) => {
      state: any;
      isInsert: boolean;
      isRemove: boolean;
    };
  }) {
    const records = config.sourceStack.pop();
    if (!records) return;

    config.targetStack.push(records);

    const selectedElements: Element[] = [];

    const start = config.isReverse ? records.length - 1 : 0;
    const end = config.isReverse ? -1 : records.length;
    const step = config.isReverse ? -1 : 1;

    for (let i = start; i !== end; i += step) {
      const record = records[i];
      const { element, type } = record;
      const { state, isInsert, isRemove } = config.getData(record);

      if (isRemove) {
        element.parent?.removeChild(element);
      } else if (isInsert) {
        if (state.parent)
          this.insertElementAt(state.parent, element, state.index);
        element.quickSetOptions(state.props);
        selectedElements.push(element);
      } else {
        element.quickSetOptions(state.props);
        selectedElements.push(element);
      }
    }

    this.root.nextTick().then(() => {
      this.root.find<Select>("select")?.select(selectedElements);
    });
  }

  undo() {
    const entry = this.undoStack[this.undoStack.length - 1];
    if (!entry) return;

    if (!Array.isArray(entry)) {
      this.undoStack.pop();
      this.redoStack.push(entry);
      entry.undo();
      return;
    }

    this.executeHistory({
      sourceStack: this.undoStack,
      targetStack: this.redoStack,
      isReverse: true,
      getData: (r) => ({
        state: r.prev,
        isInsert: r.type === "delete",
        isRemove: r.type === "create"
      })
    });
  }

  redo() {
    const entry = this.redoStack[this.redoStack.length - 1];
    if (!entry) return;

    if (!Array.isArray(entry)) {
      this.redoStack.pop();
      this.undoStack.push(entry);
      entry.redo();
      return;
    }

    this.executeHistory({
      sourceStack: this.redoStack,
      targetStack: this.undoStack,
      isReverse: false,
      getData: (r) => ({
        state: r.next,
        isInsert: r.type === "create",
        isRemove: r.type === "delete"
      })
    });
  }
}
