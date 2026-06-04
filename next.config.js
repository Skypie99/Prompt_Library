/** @type {import('next').NextConfig} */

// On Vercel the site is served from the domain root, so no basePath or
// assetPrefix is needed. The static export runs cleanly at / both locally
// and in production.
const nextConfig = {
  // Emit a fully static site into ./out — Vercel serves it from the CDN edge.
  output: "export",

  // Pin the workspace root to THIS folder. Without it, Next.js can get confused
  // when an unrelated package-lock.json exists higher up and prints a
  // "multiple lockfiles" warning.
  outputFileTracingRoot: __dirname,

  // The default <Image> optimizer needs a running server, which a static
  // export doesn't have, so we serve images as-is.
  images: { unoptimized: true },

  // Emit trailing-slash directories so the CDN resolves /path/ reliably.
  trailingSlash: true,
};

module.exports = nextConfig;
