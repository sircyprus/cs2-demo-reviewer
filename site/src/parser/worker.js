// Web Worker: decompress a demo, parse it with the WASM parser and run the shared analysis.
// One worker handles one file and is then terminated, which hands the WASM memory back to the browser.
import initWasm, * as wasm from './wasm/demoparser2.js';
import wasmUrl from './wasm/demoparser2_bg.wasm?url';
import { Buffer } from 'buffer';
import { unzipSync } from 'fflate';
import { decompress as zstdDecompress } from 'fzstd';
import Bunzip from 'seek-bzip';
import * as A from './analyse.js';

globalThis.Buffer = Buffer; // seek-bzip expects Buffer

const post = (type, extra) => self.postMessage({ type, ...extra });

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// -> [{ name, bytes }]  (a zip can hold several demos)
async function inflate(file) {
  const lower = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (lower.endsWith('.zip')) {
    const files = unzipSync(buf, { filter: f => f.name.toLowerCase().endsWith('.dem') });
    const out = Object.entries(files).map(([n, bytes]) => ({ name: file.name + '/' + n, bytes }));
    if (!out.length) throw new Error('no .dem inside this zip');
    return out;
  }
  const base = file.name.replace(/\.(gz|zst|bz2)$/i, '');
  if (lower.endsWith('.gz')) return [{ name: base, bytes: await gunzip(buf) }];
  if (lower.endsWith('.zst')) return [{ name: base, bytes: zstdDecompress(buf) }];
  if (lower.endsWith('.bz2')) return [{ name: base, bytes: new Uint8Array(Bunzip.decode(Buffer.from(buf.buffer, buf.byteOffset, buf.length))) }];
  if (lower.endsWith('.dem')) return [{ name: base, bytes: buf }];
  throw new Error('unsupported file type (use .dem, .dem.zst, .dem.bz2, .dem.gz or .zip)');
}

const magic = b => String.fromCharCode(...b.subarray(0, 7));

self.onmessage = async ({ data: { file } }) => {
  try {
    post('progress', { stage: 'Loading parser…' });
    await initWasm({ module_or_path: wasmUrl });
    post('progress', { stage: 'Decompressing…' });
    const demos = await inflate(file);
    const results = [];
    for (const { name, bytes } of demos) {
      if (magic(bytes) !== 'PBDEMS2') throw new Error(name + ' is not a CS2 demo (CS:GO demos are not supported)');
      const api = {
        header: () => wasm.parseHeader(bytes),
        events: (names, playerProps) => wasm.parseEvents(bytes, names, playerProps, undefined),
        ticks: (props, ticks) => wasm.parseTicks(bytes, props, Int32Array.from(ticks)),
      };
      post('progress', { stage: 'Reading events…', name });
      const ev = A.readEvents(api);
      const a = A.analyse(api, ev);
      a.file = name;
      Object.assign(a, A.demoDate(name, file.lastModified), { slug: 'local_' + A.slug(name) + '_' + bytes.length });
      post('progress', { stage: 'Building replay…', name });
      const replay = A.buildReplay(api, a, ev);
      results.push({ slug: a.slug, analysis: a, replay, summary: { ...A.summarise(a), local: true } });
    }
    post('done', { results });
  } catch (e) {
    post('error', { error: String((e && e.message) || e) });
  }
};
