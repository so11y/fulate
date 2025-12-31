import { defineConfig } from "vite";

export default defineConfig({
    optimizeDeps: {
        // 尝试不同的组合
        exclude: ['yoga-layout'],
        include: [],
        force: true
    },
});
