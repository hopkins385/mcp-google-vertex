import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    // drop: ["console", "debugger"],
  },
  build: {
    outDir: "build",
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "express",
        "@modelcontextprotocol/sdk",
        "@google/genai",
        "dotenv",
        "zod",
        "fs",
        "fs/promises",
        "path",
        "node:crypto",
        "node:fs",
        "node:path",
      ],
      output: {
        preserveModules: false,
      },
    },
    target: "node22",
    ssr: true,
    minify: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
