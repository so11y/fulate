import { Element } from "./base";
import { Select as BaseSelect } from "../lib/select";

export class Select extends Element {
  renderNode = new BaseSelect();
}
