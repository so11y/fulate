import { Element } from "./base";
import { Select as BaseSelect } from "../lib/tools/select/index";

export class Select extends Element {
  renderNode = new BaseSelect();
}
