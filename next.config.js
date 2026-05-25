/** @type {import('next').NextConfig} */

// On GitHub Pages this project is served from a subpath, not the domain root:
//   https://skypie99.github.io/Prompt_Libary/
// `basePath` / `assetPrefix` make every route and asset URL resolve under that
// subpath. We ONLY apply them in production builds so that `npm run dev` keeps
// serving cleanly at the root (http://localhost:3000) with no broken links.
const isProd = process.env.NODE_ENV === "production";
const repo = "Prompt_Libary"; // must match the exact GitHub repo name

const nextConfig = {
  // Emit a fully static site into ./out — no server needed to host it.
  output: "export",

  // Pin the workspace root to THIS folder. Without it, Next.js can get confused
  // when an unrelated package-lock.json exists higher up (e.g. in your home
  // directory) and prints a "multiple lockfiles" warning.
  outputFileTracingRoot: __dirname,

  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",

  // The default <Image> optimizer needs a running server, which a static
  // export doesn't have, so we serve images as-is.
  images: { unoptimized: true },

  // GitHub Pages resolves /path/ (directory + index.html) more reliably than
  // extension-less routes, so emit trailing-slash directories.
  trailingSlash: true,
};

module.exports = nextConfig;
