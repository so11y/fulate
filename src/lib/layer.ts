import { Application, ApplicationOptions } from "pixi.js";

export class Layer extends Application {
  label?: string;

  constructor(v: Partial<ApplicationOptions & { label: string }>) {
    super();
    this.label = v?.label;
  }
}
