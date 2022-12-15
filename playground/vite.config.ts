import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { TestPlugin } from "./scripts/node";

import { createStyleImportPlugin, AntdResolve } from "vite-plugin-style-import";

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  plugins: [react(), createStyleImportPlugin({ resolves: [AntdResolve()] }), TestPlugin()]
});
