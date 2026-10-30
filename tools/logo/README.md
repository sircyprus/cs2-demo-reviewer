# Logo generator

Builds the bubble-graffiti wordmark (`site/src/assets/logo.svg`) and the favicon from font outlines, then inflates, outlines, extrudes and glosses them with SVG filters.

```bash
cd tools/logo
npm init -y && npm i opentype.js @fontsource/modak
node make-logo.cjs ../../site/src/assets/logo.svg masturbatorium modak 12 4 0.03
node make-logo.cjs ../../site/public/favicon.svg m modak 12 4 0.03
```

Arguments: output file, text, font (a `@fontsource` package name), outline width, inflate width, letter spacing.
The font is Modak (SIL Open Font License, fine for converting to outlines). The output is plain SVG with no font dependency.
