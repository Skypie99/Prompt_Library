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

  // S10 — let JS/TS modules import a raw .woff2 as an asset URL so layout.tsx
  // can <link rel=preload> the two above-the-fold latin faces. Scoped to JS/TS
  // issuers ONLY: the @fontsource CSS url() pipeline (issuer: CSS) never hits
  // this rule, so the font-loading STRATEGY (font-display:swap, subsets,
  // fallback stacks) is unchanged. Reuses Next's global asset generator
  // (static/media/[name].[hash:8][ext]), so the imported URL is byte-identical
  // to the @font-face src and dedupes to a single emitted file — no double
  // download. (Applies to `next build`'s webpack; a future --turbopack would
  // need the Turbopack equivalent.)
  webpack(config) {
    config.module.rules.push({
      test: /\.woff2$/,
      issuer: /\.(t|j)sx?$/,
      type: "asset/resource",
    });
    return config;
  },
};

module.exports = nextConfig;
