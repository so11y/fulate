import { registerElement, Layer, Artboard, EditerLayer } from "@fulate/core";
import {
  Rectangle,
  Circle,
  Triangle,
  Text,
  Image,
  Workspace,
  Group,
} from "@fulate/ui";

export function registerBuiltins() {
  registerElement("f-layer", Layer);
  registerElement("f-artboard", Artboard);
  registerElement("f-editer-layer", EditerLayer);
  registerElement("f-rectangle", Rectangle);
  registerElement("f-circle", Circle);
  registerElement("f-triangle", Triangle);
  registerElement("f-text", Text);
  registerElement("f-image", Image);
  registerElement("f-workspace", Workspace);
  registerElement("f-group", Group);
}

registerBuiltins();
