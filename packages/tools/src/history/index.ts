import { Element, BaseElementOption, Node, TransformableOptions } from "@fulate/core";
import type { Root } from "@fulate/core";
import type { Select } from "../select/index";

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
  passive?: boolean;
}

type SelectTransform = Required<
  Pick<
    TransformableOptions,
    "left" | "top" | "width" | "height" | "angle" | "scaleX" | "scaleY" | "skewX" | "skewY"
  >
>;

interface SelectSnapshot extends SelectTransform {
  selectEls: Element[];
}

interface HistoryBatch {
  records: HistoryRecord[];
  selectPrev: SelectSnapshot;
  selectNext: SelectSnapshot;
}

interface ActionRecord {
  undo: () => void;
  redo: () => void;
}

type HistoryEntry = HistoryBatch | ActionRecord;

function isActionRecord(entry: HistoryEntry): entry is ActionRecord {
  return "undo" in entry;
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private snapshotMap = new Map<Element, ElementState>();
  private _passiveElements?: Set<Element>;
  private _selectPrev: SelectSnapshot | null = null;
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

  private getSelectSnapshot(): SelectSnapshot {
    const select = this.root!.find<Select>("select");
    if (!select) {
      return {
        selectEls: [], left: 0, top: 0, width: 0, height: 0,
        angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0
      };
    }
    return {
      selectEls: [...select.selectEls],
      left: select.left,
      top: select.top,
      width: select.width ?? 0,
      height: select.height ?? 0,
      angle: select.angle,
      scaleX: select.scaleX,
      scaleY: select.scaleY,
      skewX: select.skewX,
      skewY: select.skewY
    };
  }

  private restoreSelect(snapshot: SelectSnapshot) {
    const select = this.root!.find<Select>("select");
    if (!select) return;

    select.selectEls = snapshot.selectEls;
    select.currentControl = null as any;
    select.hoverElement = null;

    if (!snapshot.selectEls.length) {
      select.setOptions({ width: 0, height: 0 });
    } else {
      select.setOptions({
        left: snapshot.left,
        top: snapshot.top,
        width: snapshot.width,
        height: snapshot.height,
        angle: snapshot.angle,
        scaleX: snapshot.scaleX,
        scaleY: snapshot.scaleY,
        skewX: snapshot.skewX,
        skewY: snapshot.skewY
      });
      select.snapshotChildren();
    }
  }

  snapshot(elements: Element[], passiveElements?: Set<Element>) {
    this.snapshotMap.clear();
    this._passiveElements = passiveElements;
    this._selectPrev = this.getSelectSnapshot();
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
          type,
          passive: this._passiveElements?.has(element) || undefined
        });
      }
    });

    if (changes.length > 0) {
      const batch: HistoryBatch = {
        records: changes,
        selectPrev: this._selectPrev!,
        selectNext: this.getSelectSnapshot()
      };
      this.undoStack.push(batch);
      if (this.undoStack.length > this.limit) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    }

    this.snapshotMap.clear();
    this._passiveElements = undefined;
    this._selectPrev = null;
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
        parent.insertBefore(element, ref);
      }
    }
  }

  private executeHistory(config: {
    sourceStack: HistoryEntry[];
    targetStack: HistoryEntry[];
    isReverse: boolean;
    selectKey: "selectPrev" | "selectNext";
    getData: (record: HistoryRecord) => {
      state: ElementState;
      isInsert: boolean;
      isRemove: boolean;
    };
  }) {
    const entry = config.sourceStack.pop() as HistoryBatch;
    if (!entry) return;

    config.targetStack.push(entry);

    const { records } = entry;
    const start = config.isReverse ? records.length - 1 : 0;
    const end = config.isReverse ? -1 : records.length;
    const step = config.isReverse ? -1 : 1;

    for (let i = start; i !== end; i += step) {
      const record = records[i];
      const { state, isInsert, isRemove } = config.getData(record);

      if (isRemove) {
        record.element.parent?.removeChild(record.element);
      } else if (isInsert) {
        if (state.parent)
          this.insertElementAt(state.parent, record.element, state.index);
        record.element.setOptions(state.props);
      } else {
        const oldW = record.element.width;
        const oldH = record.element.height;
        record.element.setOptions(state.props);
        const newW = record.element.width;
        const newH = record.element.height;
        if (record.element.children?.length && oldW && oldH && (newW !== oldW || newH !== oldH)) {
          for (const child of record.element.children) {
            child.onParentResize(newW / oldW, newH / oldH);
          }
        }
      }
    }

    const snapshot = entry[config.selectKey];
    this.root.nextTick(() => {
      this.restoreSelect(snapshot);
    });
  }

  undo() {
    const entry = this.undoStack[this.undoStack.length - 1];
    if (!entry) return;

    if (isActionRecord(entry)) {
      this.undoStack.pop();
      this.redoStack.push(entry);
      entry.undo();
      return;
    }

    this.executeHistory({
      sourceStack: this.undoStack,
      targetStack: this.redoStack,
      isReverse: true,
      selectKey: "selectPrev",
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

    if (isActionRecord(entry)) {
      this.redoStack.pop();
      this.undoStack.push(entry);
      entry.redo();
      return;
    }

    this.executeHistory({
      sourceStack: this.redoStack,
      targetStack: this.undoStack,
      isReverse: false,
      selectKey: "selectNext",
      getData: (r) => ({
        state: r.next,
        isInsert: r.type === "create",
        isRemove: r.type === "delete"
      })
    });
  }
}
