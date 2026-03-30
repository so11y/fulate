import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@fulate/util": path.resolve(__dirname, "../util/src/index.ts"),
      "@fulate/core": path.resolve(__dirname, "../core/src/index.ts"),
      "@fulate/ui": path.resolve(__dirname, "../ui/src/index.ts"),
      "@fulate/import": path.resolve(__dirname, "../import/src/index.ts"),
    },
  },
  test: {
    name: "tools",
    environment: "happy-dom",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
});
