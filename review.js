// CS2 demo reviewer CLI: scans ./demos (recursively) and writes JSON for the React site to ./site/public/data.
// The analysis itself lives in site/src/parser/analyse.js and is shared with the in-browser (WASM) parser.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pathToFileURL } = require('url');
const native = require('@laihoe/demoparser2');

const ROOT = __dirname;
const DEMO_DIR = path.join(ROOT, 'demos');
const SITE = path.join(ROOT, 'site');
const OUT_DIR = path.join(SITE, 'public', 'data');
const MAPS_DIR = path.join(SITE, 'public', 'maps');
const FORCE = process.argv.includes('--force');

const slug = s => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
const COMPRESSED = /\.(bz2|gz|zst|zip)$/i;

// Finds .dem files plus compressed ones (.dem.bz2 / .gz / .zst, or .zip containing .dem files).
// Each item: { rel: display name, src: file on disk, kind, entry? (zip entry name), mtime }
function findDemos(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { out.push(...findDemos(p)); continue; }
    const lower = e.name.toLowerCase();
    const rel = path.relative(DEMO_DIR, p);
    const mtime = fs.statSync(p).mtimeMs;
    if (lower.endsWith('.dem')) out.push({ rel, src: p, kind: 'raw', mtime });
    else if (lower.endsWith('.zip')) {
      try {
        for (const z of new (require('adm-zip'))(p).getEntries())
          if (!z.isDirectory && z.entryName.toLowerCase().endsWith('.dem'))
            out.push({ rel: rel + '/' + z.entryName, src: p, kind: 'zip', entry: z.entryName, mtime });
      } catch (err) { out.push({ rel, src: p, kind: 'bad', err: err.message, mtime }); }
    } else if (/\.dem\.(bz2|gz|zst)$/i.test(lower)) {
      out.push({ rel: rel.replace(COMPRESSED, ''), src: p, kind: lower.slice(lower.lastIndexOf('.') + 1), mtime });
    }
  }
  return out;
}

// Returns { file, cleanup } where file is an uncompressed .dem path.
function materialize(item) {
  if (item.kind === 'raw') return { file: item.src, cleanup() {} };
  const tmpDir = path.join(ROOT, '.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmp = path.join(tmpDir, slug(item.rel) + '.dem');
  let buf;
  if (item.kind === 'bz2') buf = require('seek-bzip').decode(fs.readFileSync(item.src));
  else if (item.kind === 'gz') buf = zlib.gunzipSync(fs.readFileSync(item.src));
  else if (item.kind === 'zst') {
    if (!zlib.zstdDecompressSync) throw new Error('.zst needs Node 22.15+');
    buf = zlib.zstdDecompressSync(fs.readFileSync(item.src));
  } else if (item.kind === 'zip') buf = new (require('adm-zip'))(item.src).readFile(item.entry);
  else throw new Error(item.err || 'unsupported file');
  fs.writeFileSync(tmp, buf);
  return { file: tmp, cleanup() { try { fs.unlinkSync(tmp); } catch {} } };
}

// Native parser bound to one demo file, in the shape analyse.js expects.
const nativeApi = file => ({
  header: () => native.parseHeader(file),
  events: (names, playerProps) => native.parseEvents(file, names, playerProps),
  ticks: (props, ticks) => native.parseTicks(file, props, ticks),
});

// Radar calibration from the Valve overview files in site/public/maps/<map>.txt
function writeMapsIndex() {
  const out = {};
  if (!fs.existsSync(MAPS_DIR)) return;
  for (const f of fs.readdirSync(MAPS_DIR)) {
    if (!f.endsWith('.txt')) continue;
    const map = f.slice(0, -4);
    if (!fs.existsSync(path.join(MAPS_DIR, map + '.png'))) continue;
    const txt = fs.readFileSync(path.join(MAPS_DIR, f), 'utf8');
    const num = k => { const m = txt.match(new RegExp('"' + k + '"\\s*"(-?[\\d.]+)"')); return m ? parseFloat(m[1]) : null; };
    const ox = num('pos_x'), oy = num('pos_y'), scale = num('scale');
    if (ox == null || oy == null || !scale) continue;
    const lm = txt.match(/"lower"[\s\S]*?"AltitudeMax"\s*"(-?[\d.]+)"/);
    out[map] = { ov: [ox, oy, scale], hasLower: fs.existsSync(path.join(MAPS_DIR, map + '_lower.png')), lowerBelow: lm ? parseFloat(lm[1]) : null };
  }
  fs.writeFileSync(path.join(MAPS_DIR, 'maps.json'), JSON.stringify(out));
}

async function main() {
  const A = await import(pathToFileURL(path.join(SITE, 'src', 'parser', 'analyse.js')).href);
  fs.mkdirSync(DEMO_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const demos = findDemos(DEMO_DIR);
  if (!demos.length) console.log('No demos found in ' + DEMO_DIR);
  const items = [], failed = [];

  for (const item of demos) {
    const rel = item.rel, id = slug(rel);
    const jsonPath = path.join(OUT_DIR, id + '.json'), replayJson = path.join(OUT_DIR, id + '.replay.json');
    try {
      let a;
      if (!FORCE && fs.existsSync(jsonPath) && fs.existsSync(replayJson) && fs.statSync(jsonPath).mtimeMs > item.mtime) {
        a = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } else {
        console.log('Parsing ' + rel + (item.kind === 'raw' ? '' : ` (decompressing ${item.kind})`) + ' ...');
        const m = materialize(item);
        try {
          const api = nativeApi(m.file);
          const ev = A.readEvents(api);
          a = A.analyse(api, ev);
          a.file = rel;
          fs.writeFileSync(replayJson, JSON.stringify(A.buildReplay(api, a, ev)));
        } finally { m.cleanup(); }
      }
      Object.assign(a, A.demoDate(rel, item.mtime), { slug: id });
      fs.writeFileSync(jsonPath, JSON.stringify(a));
      items.push(a);
    } catch (e) {
      console.log('FAILED ' + rel + ': ' + e.message);
      failed.push({ file: rel, err: e.message });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify({ demos: items.map(A.summarise), failed }));
  writeMapsIndex();
  console.log(`Done: ${items.length} ok, ${failed.length} failed -> ${OUT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
