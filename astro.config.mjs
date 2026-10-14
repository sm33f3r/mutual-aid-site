import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  ...(process.env.SITE_URL ? { site: process.env.SITE_URL } : {}),
});
