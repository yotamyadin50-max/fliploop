// Writes the print resolution into a PNG (a pHYs chunk), so a sheet rendered at 300 dpi also
// prints at its real size from a photo viewer or a phone print service, not only from this
// app. canvas.toBlob() leaves the chunk out. DOM-free.

export const PX_PER_METRE_300DPI = 11811; // 300 / 0.0254, rounded

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR_END = 8 + 4 + 4 + 13 + 4; // signature, then length + type + 13 data bytes + CRC

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeU32(bytes, at, value) {
  bytes[at] = value >>> 24;
  bytes[at + 1] = (value >>> 16) & 255;
  bytes[at + 2] = (value >>> 8) & 255;
  bytes[at + 3] = value & 255;
}

/** The chunk type names of a PNG, in file order (used by the tests and the self-test). */
export function pngChunkTypes(bytes) {
  const types = [];
  let p = 8;
  while (p + 12 <= bytes.length) {
    const length = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
    types.push(String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]));
    p += 12 + length;
  }
  return types;
}

/**
 * bytes: Uint8Array of a PNG. Returns a new Uint8Array with a pHYs chunk right after IHDR.
 * Bytes that are not a PNG, or a PNG that already carries pHYs, come back unchanged.
 */
export function withPngDensity(bytes, pxPerMetre = PX_PER_METRE_300DPI) {
  if (bytes.length < IHDR_END || SIGNATURE.some((b, i) => bytes[i] !== b)) return bytes;
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR") return bytes;
  if (pngChunkTypes(bytes).includes("pHYs")) return bytes;
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  writeU32(chunk, 0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  writeU32(chunk, 8, pxPerMetre); // x
  writeU32(chunk, 12, pxPerMetre); // y
  chunk[16] = 1; // unit: the metre
  writeU32(chunk, 17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, IHDR_END), 0);
  out.set(chunk, IHDR_END);
  out.set(bytes.subarray(IHDR_END), IHDR_END + chunk.length);
  return out;
}
