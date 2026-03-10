import { BaseElementOption } from "../node/element";
import { Layer } from "./index";

export class EditerLayer extends Layer {
  type = "editer-layer";

  constructor(options?: BaseElementOption & { zIndex?: number }) {
    super({
      ...options,
      enableDirtyRect: false,
      cssTransformable: false
    });
  }
}
