import { Layer } from "./index";
import { BaseElementOption } from "@fulate/core";

export interface ArtboardOption extends BaseElementOption {}

export class Artboard extends Layer {
  type = "artboard";
}
