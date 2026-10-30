// Bubble-graffiti wordmark for "Masturbatorium": glyph outlines from Modak (SIL OFL), inflated, outlined, extruded and glossed in SVG.
const fs = require('fs');
const opentype = require('opentype.js');
const FONTNAME = process.argv[4] || 'modak';
const font = opentype.parse(fs.readFileSync(__dirname + '/node_modules/@fontsource/' + FONTNAME + '/files/' + FONTNAME + '-latin-400-normal.woff').buffer.slice(0));
const OUTLINE = Number(process.argv[5] || 12), INFLATE = Number(process.argv[6] || 3);

const OUT = process.argv[2] || __dirname + '/logo.svg';
const TEXT = process.argv[3] || 'masturbatorium';
const SIZE = 200, SPACING = Number(process.argv[7] || 0.03);

const path = font.getPath(TEXT, 0, 0, SIZE, { kerning: true, letterSpacing: SPACING });
const bb = path.getBoundingBox();
const pad = 40, ex = 11; // padding and extrusion length
const x0 = bb.x1 - pad, y0 = bb.y1 - pad, W = Math.ceil(bb.x2 - bb.x1 + pad * 2 + ex), H = Math.ceil(bb.y2 - bb.y1 + pad * 2 + ex);
const d = path.toPathData(2);

const DARK = '#4a0e5c', MID = '#8E1EA2';
let extrusion = '';
for (let i = ex; i >= 1; i--) extrusion += `<use href="#t" x="${i * 0.9}" y="${i}"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Masturbatorium">
<defs>
<path id="t" d="${d}"/>
<linearGradient id="pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3f1"/><stop offset=".4" stop-color="#FFC0DE"/><stop offset="1" stop-color="#ED96D7"/></linearGradient>
<linearGradient id="side" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${MID}"/><stop offset="1" stop-color="${DARK}"/></linearGradient>
<filter id="puff" x="-5%" y="-10%" width="110%" height="125%">
 <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
 <feSpecularLighting in="blur" surfaceScale="9" specularConstant="1.15" specularExponent="26" lighting-color="#ffffff" result="spec"><fePointLight x="${(x0 - 200).toFixed(0)}" y="${(y0 - 300).toFixed(0)}" z="420"/></feSpecularLighting>
 <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
 <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit"/>
 <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b2"/>
 <feOffset in="b2" dx="0" dy="-7" result="o2"/>
 <feComposite in="SourceAlpha" in2="o2" operator="out" result="rim"/>
 <feFlood flood-color="#c654c3" flood-opacity=".55"/><feComposite in2="rim" operator="in" result="shade"/>
 <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b3"/>
 <feOffset in="b3" dx="5" dy="6" result="o3"/>
 <feComposite in="SourceAlpha" in2="o3" operator="out" result="rimHi"/>
 <feGaussianBlur in="rimHi" stdDeviation="1.4" result="rimHiB"/>
 <feFlood flood-color="#ffffff" flood-opacity=".95"/><feComposite in2="rimHiB" operator="in" result="hi"/>
 <feMerge><feMergeNode in="lit"/><feMergeNode in="shade"/><feMergeNode in="hi"/></feMerge>
</filter>
<symbol id="spark" viewBox="0 0 64 64"><path d="M32 0C34 22 42 30 64 32 42 34 34 42 32 64 30 42 22 34 0 32 22 30 30 22 32 0Z" fill="#fff"/></symbol>
</defs>
<g fill="url(#side)" stroke="url(#side)" stroke-width="${OUTLINE}" stroke-linejoin="round">${extrusion}</g>
<use href="#t" fill="${DARK}" stroke="${DARK}" stroke-width="${OUTLINE}" stroke-linejoin="round"/>
<g filter="url(#puff)"><use href="#t" fill="url(#pink)" stroke="url(#pink)" stroke-width="${INFLATE}" stroke-linejoin="round"/></g>
<use href="#spark" x="${(bb.x2 - 40).toFixed(0)}" y="${(bb.y1 - 34).toFixed(0)}" width="44" height="44"/>
<use href="#spark" x="${(bb.x1 + 10).toFixed(0)}" y="${(bb.y2 - 18).toFixed(0)}" width="26" height="26"/>
<use href="#spark" x="${(bb.x1 + (bb.x2 - bb.x1) * 0.52).toFixed(0)}" y="${(bb.y1 - 40).toFixed(0)}" width="22" height="22"/>
</svg>
`;
fs.writeFileSync(OUT, svg);
console.log('wrote', OUT, W + 'x' + H, 'path bytes', d.length);
