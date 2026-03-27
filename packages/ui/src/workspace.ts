import { BaseElementOption, Element } from "@fulate/core";

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
      this.root.viewport.focus(this.getBoundingRect(), {
        animate: {
          duration: 300
        }
      })
    );
  }
}
