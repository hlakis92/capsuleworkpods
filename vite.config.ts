import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig({
	  plugins: [
	    ...mochaPlugins(process.env as Record<string, string>),
	    react(),
	    cloudflare({
	      auxiliaryWorkers: [{ configPath: "/mocha/emails-service/wrangler.json" }],
	    }),
	  ],
	  server: {
	    allowedHosts: true,
	  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
