import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"]
  }
});
