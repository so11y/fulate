import { BaseElementOption, Element } from "../node/element";

export interface WorkspaceOption extends BaseElementOption {
  backgroundColor?: string;
}

export class Workspace extends Element {
  type = "workspace";
  key = "workspace";

  mounted() {
    super.mounted();
    this.root.nextTick(() => {
      setTimeout(() => {
        this.root.focusNode(this);
      });
    });
  }
}
