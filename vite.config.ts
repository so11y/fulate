import { defineConfig } from "vite";
import path from "path";

export const fulateAliases = [
  { find: /^@fulate\/util(.*)$/, replacement: path.resolve(__dirname, "packages/util/src$1") },
  { find: /^@fulate\/core(.*)$/, replacement: path.resolve(__dirname, "packages/core/src$1") },
  { find: /^@fulate\/ui(.*)$/, replacement: path.resolve(__dirname, "packages/ui/src$1") },
  { find: /^@fulate\/tools(.*)$/, replacement: path.resolve(__dirname, "packages/tools/src$1") },
  { find: /^@fulate\/yoga(.*)$/, replacement: path.resolve(__dirname, "packages/yoga/src$1") },
  { find: /^@fulate\/vue(.*)$/, replacement: path.resolve(__dirname, "packages/vue/src$1") },
];

export default defineConfig({
  resolve: {
    alias: fulateAliases
  },
  optimizeDeps: {
    exclude: ["yoga-layout"],
    force: true
  }
});
