# demoparser2 WASM build (CS2-capable)

`demoparser2_bg.wasm` / `demoparser2.js` were built from https://github.com/LaihoE/demoparser (src/wasm, MIT, see LICENSE-demoparser)
with `wasm-pack build --release --target web`, because the package published to npm as `demoparser2` (0.15) panics on CS2 demos.

Local changes needed to make it work in the browser:
1. `src/csgoproto/build.rs` -> `fn main() {}` (the generated `protobuf.rs` is already committed; the script only tried to `git clone`).
2. `src/parser/src/time_shim.rs` replaces `std::time::Instant` (it panics on wasm32-unknown-unknown; it was only used for profiling).
3. `src/wasm`: `console_error_panic_hook` start function, and results serialised with `serialize_maps_as_objects(true)` so they are plain objects.

Build tools used (Windows, no admin): rustup (gnu toolchain) + portable WinLibs MinGW-w64, protoc not required after (1), wasm-pack.
