import { defineConfig } from "vite";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: [
      { find: /^@fulate\/util(.*)$/, replacement: path.resolve(root, "packages/util/src$1") },
      { find: /^@fulate\/core(.*)$/, replacement: path.resolve(root, "packages/core/src$1") },
      { find: /^@fulate\/ui(.*)$/, replacement: path.resolve(root, "packages/ui/src$1") },
      { find: /^@fulate\/tools(.*)$/, replacement: path.resolve(root, "packages/tools/src$1") },
      { find: /^@fulate\/yoga(.*)$/, replacement: path.resolve(root, "packages/yoga/src$1") },
      { find: /^@fulate\/vue(.*)$/, replacement: path.resolve(root, "packages/vue/src$1") },
    ],
  },
  optimizeDeps: {
    exclude: ["yoga-layout"],
    force: true,
  },
});
