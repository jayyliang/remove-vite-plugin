import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import removeConsolePlugin from "./remove-console-plugin";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), removeConsolePlugin()],
});
