/**
 * 文件说明: 配置 Vibe Coding Atlas 的静态 Vite 构建。
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
