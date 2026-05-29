/**
 * GitHub Pages 배포 전용 Vite 빌드 설정
 * Usage: pnpm vite build --config vite.github.config.ts
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  define: {
    // GitHub Pages 서브디렉토리 base 경로 주입
    "import.meta.env.VITE_ROUTER_BASE": JSON.stringify("/am-materials-database"),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "gh-pages-dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          recharts: ["recharts"],
        },
      },
    },
  },
});
