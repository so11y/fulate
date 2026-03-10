import { Layer } from "./index";
import { BaseElementOption } from "../node/element";

export interface ArtboardOption extends BaseElementOption {}

export class Artboard extends Layer {
  type = "artboard";
}
