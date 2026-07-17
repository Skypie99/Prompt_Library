// S10 — ambient declaration so `import href from "*.woff2"` in layout.tsx
// typechecks. The actual asset emission is handled by the JS/TS-scoped
// asset/resource rule in next.config.js; this only tells TS the import is a
// string URL. Types-only — it cannot affect the font-loading strategy.
declare module "*.woff2" {
  const src: string;
  export default src;
}
