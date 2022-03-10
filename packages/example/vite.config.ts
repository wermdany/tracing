import { defineConfig } from "vite";
import React from "@vitejs/plugin-react";

import StyleImport, { AntdResolve } from "vite-plugin-style-import";

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  plugins: [React(), StyleImport({ resolves: [AntdResolve()] })]
});
