import { Element } from "./base";
import { Select as BaseSelect } from "../lib/select/index";

export class Select extends Element {
  renderNode = new BaseSelect();
}
