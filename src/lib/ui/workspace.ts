import { BaseElementOption, Element } from "../node/element";

export interface WorkspaceOption extends BaseElementOption {
  backgroundColor?: string;
}

export class Workspace extends Element {
  type = "workspace";
  key = "workspace";
  selectctbale = false;
  pickable = false;

  mounted() {
    super.mounted();
    this.root.nextTick(() =>
      this.root.focusNode(this, {
        animate: {
          duration: 300
        }
      })
    );
  }
}
