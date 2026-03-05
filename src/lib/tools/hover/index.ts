import { Element } from "../../node/element";

export class Hover extends Element {
  type = "hover";
  key = "hover";

  hasInView() {
    return true;
  }

  mounted() {
    this.root.addEventListener("mouseenter", (e) => {
      // console.log(e.detail.target, "---mouseenter");
    });
    this.root.addEventListener("mouseleave", (e) => {
      // console.log(e.detail.target, "---mouseleave");
    });
  }

  paint() {}
}
