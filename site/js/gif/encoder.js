// In-house GIF89a encoder (plan 3.1, Ruling 2): global palette (exact when the animation
// uses 256 colours or fewer, otherwise median-cut with pure white reserved), LZW,
// NETSCAPE2.0 infinite loop, per-frame delays, no transparency. DOM-free.

const WHITE = 0xffffff;

/** Collects colour statistics over every frame (pass 1). */
export class PaletteBuilder {
  constructor() {
    this.exact = new Map(); // 24-bit colour -> count, until it passes 256 entries
    this.exactOverflow = false;
    this.bins = new Float64Array(32768 * 4); // per 15-bit bin: count, sumR, sumG, sumB
  }

  addPixels(rgba) {
    const bins = this.bins;
    const exact = this.exact;
    for (let i = 0; i < rgba.length; i += 4) {
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      const c = (r << 16) | (g << 8) | b;
      if (!this.exactOverflow) {
        if (!exact.has(c)) {
          if (exact.size >= 256) this.exactOverflow = true;
          else exact.set(c, 1);
        }
      }
      if (c === WHITE) continue;
      const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const o = k * 4;
      bins[o]++; bins[o + 1] += r; bins[o + 2] += g; bins[o + 3] += b;
    }
  }

  build() {
    if (!this.exactOverflow) return exactPalette([...this.exact.keys()]);
    return medianCutPalette(this.bins, 255);
  }
}

function exactPalette(colors) {
  if (!colors.includes(WHITE)) colors.unshift(WHITE);
  const index = new Map(colors.map((c, i) => [c, i]));
  const rgb = colors.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
  return new Palette(rgb, (r, g, b) => index.get((r << 16) | (g << 8) | b) ?? 0, true);
}

function medianCutPalette(bins, maxColors) {
  const entries = [];
  for (let k = 0; k < 32768; k++) {
    const n = bins[k * 4];
    if (n > 0) entries.push({ n, r: bins[k * 4 + 1] / n, g: bins[k * 4 + 2] / n, b: bins[k * 4 + 3] / n });
  }
  let boxes = entries.length ? [makeBox(entries)] : [];
  while (boxes.length < maxColors) {
    let pick = -1, best = 0;
    for (let i = 0; i < boxes.length; i++) {
      const bx = boxes[i];
      if (bx.items.length < 2) continue;
      const score = bx.range * Math.sqrt(bx.count);
      if (score > best) { best = score; pick = i; }
    }
    if (pick < 0) break;
    const [a, b] = splitBox(boxes[pick]);
    boxes.splice(pick, 1, a, b);
  }
  const rgb = [[255, 255, 255]];
  for (const bx of boxes) {
    let n = 0, r = 0, g = 0, b = 0;
    for (const e of bx.items) { n += e.n; r += e.r * e.n; g += e.g * e.n; b += e.b * e.n; }
    rgb.push([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
  }
  const lut = new Int16Array(32768).fill(-1);
  const nearest = (r, g, b) => {
    let bi = 1, bd = Infinity;
    for (let i = 1; i < rgb.length; i++) {
      const dr = rgb[i][0] - r, dg = rgb[i][1] - g, db = rgb[i][2] - b;
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  const map = (r, g, b) => {
    if (r === 255 && g === 255 && b === 255) return 0;
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let v = lut[k];
    if (v < 0) { v = nearest((r & 0xf8) | 4, (g & 0xf8) | 4, (b & 0xf8) | 4); lut[k] = v; }
    return v;
  };
  return new Palette(rgb, map, false);
}

function makeBox(items) {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, count = 0;
  for (const e of items) {
    if (e.r < rMin) rMin = e.r; if (e.r > rMax) rMax = e.r;
    if (e.g < gMin) gMin = e.g; if (e.g > gMax) gMax = e.g;
    if (e.b < bMin) bMin = e.b; if (e.b > bMax) bMax = e.b;
    count += e.n;
  }
  const ranges = { r: rMax - rMin, g: gMax - gMin, b: bMax - bMin };
  const axis = ranges.g >= ranges.r && ranges.g >= ranges.b ? "g" : ranges.r >= ranges.b ? "r" : "b";
  return { items, count, axis, range: ranges[axis] };
}

function splitBox(box) {
  const { axis } = box;
  const items = box.items.slice().sort((p, q) => p[axis] - q[axis]);
  let acc = 0, cut = 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].n;
    if (acc >= box.count / 2) { cut = i + 1; break; }
    cut = i + 1;
  }
  return [makeBox(items.slice(0, cut)), makeBox(items.slice(cut))];
}

export class Palette {
  constructor(rgb, map, exact) {
    this.rgb = rgb;
    this.map = map;
    this.exact = exact;
    let bits = 1;
    while (1 << bits < rgb.length) bits++;
    this.bits = bits; // table holds 2^bits entries
  }

  /** Maps RGBA pixels (alpha ignored: frames are flattened on white first) to indices. */
  indexPixels(rgba) {
    const out = new Uint8Array(rgba.length / 4);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) out[j] = this.map(rgba[i], rgba[i + 1], rgba[i + 2]);
    return out;
  }

  tableBytes() {
    const size = 1 << this.bits;
    const bytes = new Uint8Array(size * 3);
    this.rgb.forEach(([r, g, b], i) => { bytes[i * 3] = r; bytes[i * 3 + 1] = g; bytes[i * 3 + 2] = b; });
    return bytes;
  }
}

/** Growable byte buffer. */
class ByteSink {
  constructor(size = 1 << 16) { this.buf = new Uint8Array(size); this.len = 0; }
  ensure(n) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  byte(b) { this.ensure(1); this.buf[this.len++] = b; }
  word(w) { this.ensure(2); this.buf[this.len++] = w & 255; this.buf[this.len++] = (w >> 8) & 255; }
  bytes(arr) { this.ensure(arr.length); this.buf.set(arr, this.len); this.len += arr.length; }
  ascii(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); }
  result() { return this.buf.slice(0, this.len); }
}

const HSIZE = 5003; // hash table size (prime > 4096 * 1.2)

/** GIF-flavoured LZW with variable code width and clear codes. Returns sub-blocked bytes. */
export function lzwEncode(indices, minCodeSize) {
  const out = new ByteSink(Math.max(256, indices.length >> 1));
  const block = new Uint8Array(255);
  let blockLen = 0;
  let cur = 0, curBits = 0;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const hashKeys = new Int32Array(HSIZE).fill(-1);
  const hashCodes = new Int32Array(HSIZE);

  const flushBlock = () => {
    if (!blockLen) return;
    out.byte(blockLen);
    out.bytes(block.subarray(0, blockLen));
    blockLen = 0;
  };
  const emit = (code) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      block[blockLen++] = cur & 255;
      if (blockLen === 255) flushBlock();
      cur >>>= 8;
      curBits -= 8;
    }
  };
  const resetTable = () => {
    hashKeys.fill(-1);
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  emit(clearCode);
  if (!indices.length) {
    emit(eoiCode);
  } else {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      let h = ((k << 4) ^ prefix) % HSIZE;
      let found = -1;
      while (hashKeys[h] !== -1) {
        if (hashKeys[h] === key) { found = hashCodes[h]; break; }
        h = (h + 1) % HSIZE;
      }
      if (found >= 0) { prefix = found; continue; }
      emit(prefix);
      if (nextCode < 4096) {
        hashKeys[h] = key;
        hashCodes[h] = nextCode++;
        if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        resetTable();
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoiCode);
  }
  if (curBits > 0) {
    block[blockLen++] = cur & 255;
    if (blockLen === 255) flushBlock();
  }
  flushBlock();
  out.byte(0); // block terminator
  return out.result();
}

/** Streaming GIF writer: header once, then frames, then finish(). */
export class GifWriter {
  constructor(width, height, palette, { loop = 0 } = {}) {
    this.width = width;
    this.height = height;
    this.palette = palette;
    this.sink = new ByteSink(1 << 20);
    const s = this.sink;
    s.ascii("GIF89a");
    s.word(width);
    s.word(height);
    s.byte(0x80 | ((palette.bits - 1) << 4) | (palette.bits - 1)); // global table, colour res, size
    s.byte(0); // background colour index (white is index 0)
    s.byte(0); // pixel aspect ratio
    s.bytes(palette.tableBytes());
    if (loop !== null) {
      s.byte(0x21); s.byte(0xff); s.byte(11);
      s.ascii("NETSCAPE2.0");
      s.byte(3); s.byte(1); s.word(loop); s.byte(0);
    }
  }

  addFrame(indices, delayCs) {
    const s = this.sink;
    s.byte(0x21); s.byte(0xf9); s.byte(4);
    s.byte(0x04); // disposal: do not dispose, no transparency
    s.word(delayCs);
    s.byte(0); s.byte(0);
    s.byte(0x2c);
    s.word(0); s.word(0); s.word(this.width); s.word(this.height);
    s.byte(0); // no local table, not interlaced
    const minCodeSize = Math.max(2, this.palette.bits);
    s.byte(minCodeSize);
    s.bytes(lzwEncode(indices, minCodeSize));
  }

  finish() {
    this.sink.byte(0x3b);
    return this.sink.result();
  }
}
