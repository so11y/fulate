import { Root, Layer } from "@fulate/core";
import { baseCreateApp } from "./renderer";
import type { Component } from "@vue/runtime-core";

export interface FulateAppMountOptions {
  width?: number;
  height?: number;
}

export function createApp(
  rootComponent: Component,
  rootProps?: Record<string, any>
) {
  const app = baseCreateApp(rootComponent, rootProps);
  const origMount = app.mount;

  app.mount = (rootOrEl: any, options?: FulateAppMountOptions) => {
    let root: Root;

    if (rootOrEl instanceof Root) {
      root = rootOrEl;
    } else {
      const el =
        typeof rootOrEl === "string"
          ? document.querySelector(rootOrEl)!
          : rootOrEl;
      root = new Root(el as HTMLElement, options);
    }

    const container = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
    });
    root.append(container);

    origMount.call(app, container as any);

    if (!root.isMounted) {
      root.mount();
    }

    (app as any)._fulateRoot = root;
    return app;
  };

  return app;
}
