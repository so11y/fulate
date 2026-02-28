import { BaseElementOption, Element } from "../node/element";
import { Rectangle } from "./rectangle";

export interface WorkspaceOption extends BaseElementOption {
  backgroundColor?: string;
}

export class Workspace extends Rectangle {
  type = "workspace";
  key = "workspace";

  constructor(options?: WorkspaceOption) {
    super(options);
    this.backgroundColor = options?.backgroundColor ?? "#E5E5E5";
  }

  focusNode(node: Element, padding = 10) {
    const root = this.root;
    const RULER_SIZE = root.keyElmenet.get("rule")?.rulerSize ?? 0;
    const aabb = node.getBoundingRect();

    const activeWidth = root.width - RULER_SIZE;
    const activeHeight = root.height - RULER_SIZE;

    const scaleX = (activeWidth - padding * 2) / aabb.width;
    const scaleY = (activeHeight - padding * 2) / aabb.height;
    const bestScale = Math.min(scaleX, scaleY, 1);

    const visualCenterX = RULER_SIZE + activeWidth / 2;
    const visualCenterY = RULER_SIZE + activeHeight / 2;

    root.viewport.scale = bestScale;
    root.viewport.x = visualCenterX - aabb.centerX * bestScale;
    root.viewport.y = visualCenterY - aabb.centerY * bestScale;

    root.requestRender();
  }
}
