import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The demo has no backend, so it's exported as static files and served by the
  // landing site at chilla-azure.vercel.app/demo. See README.md.
  output: "export",
  basePath: "/demo",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
