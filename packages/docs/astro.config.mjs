// @ts-check

import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";

export default defineConfig({
  site: "https://policygen.xyz",
  integrations: [
    expressiveCode({
      themes: ["github-dark"],
    }),
    mdx(),
    svelte(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
