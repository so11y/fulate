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

  mounted() {
    super.mounted();
    this.layer.nextTick(() => {
      this.root.focusNode(this);
    });
  }
}
