import { Rectangle } from "../ui/rectangle"; // 或者继承 Element
import { BaseElementOption } from "../node/element";

export interface ArtboardOption extends BaseElementOption {
  clip?: boolean;
}

export class Artboard extends Rectangle {
  type = "artboard";
  clip = false;
  key = "artboard";

  constructor(options?: ArtboardOption) {
    super(options);
    this.clip = options?.clip ?? false;
    this.backgroundColor = options?.backgroundColor ?? "#E5E5E5";
  }
}
