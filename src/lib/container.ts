import { Element, ElementOptions } from "./base";
import { Padding, PaddingOptions } from "./padding";
import { TypeFn } from "./types";

interface ContainerOptions
  extends Omit<
    ElementOptions & PaddingOptions,
    "x" | "y" | "width"
  > {
  width?: "auto" | number;
}


export const container: TypeFn<ContainerOptions, Element> = (options: ContainerOptions) => {
  let root: Element | undefined;
  let last: Element | undefined;

  const div = new Element({
    ...options,
    width:
      options.width === "auto"
        ? undefined
        : options.width ?? Number.MAX_VALUE,
  });

  if (last) {
    last.children = [div];
    last = div;
  } else {
    root = last = div;
  }

  if (options.padding) {
    const padding = new Padding({
      padding: options.padding
    });
    padding.isInternal = true;
    if (last) {
      last.children = [padding];
      last = padding;
    } else {
      root = padding;
    }
  }
  // 处理 child
  if (options.child) {
    if (last) {
      last.children = [options.child];
    }
  }
  return root as any
}

container.hFull = function (options: ContainerOptions) {
  const g = container(options)
  g.height = Number.MAX_VALUE
  return g
}