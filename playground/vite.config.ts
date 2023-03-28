import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { MockServerPlugin } from "./scripts/node";

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  plugins: [react(), MockServerPlugin()]
});
