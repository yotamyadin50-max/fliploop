// Independent GIF decoder used only by tests, to prove the encoder's bytes are valid.
export function decodeGif(bytes) {
  let p = 0;
  const u8 = () => bytes[p++];
  const u16 = () => { const v = bytes[p] | (bytes[p + 1] << 8); p += 2; return v; };
  const ascii = (n) => { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[p++]); return s; };

  const sig = ascii(6);
  if (sig !== "GIF89a") throw new Error("bad signature " + sig);
  const width = u16(), height = u16();
  const flags = u8(); u8(); u8();
  let gct = null;
  if (flags & 0x80) {
    const size = 1 << ((flags & 7) + 1);
    gct = [];
    for (let i = 0; i < size; i++) gct.push([u8(), u8(), u8()]);
  }
  const frames = [];
  let loop = null;
  let pendingDelay = 0;
  let canvas = new Uint8Array(width * height * 3).fill(255);
  for (;;) {
    const b = u8();
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = u8();
      if (label === 0xf9) {
        u8(); u8(); pendingDelay = u16(); u8(); u8();
      } else if (label === 0xff) {
        const len = u8();
        const id = ascii(len);
        let sub = u8();
        const data = [];
        while (sub) { for (let i = 0; i < sub; i++) data.push(u8()); sub = u8(); }
        if (id === "NETSCAPE2.0") loop = data[1] | (data[2] << 8);
      } else {
        let sub = u8();
        while (sub) { p += sub; sub = u8(); }
      }
      continue;
    }
    if (b !== 0x2c) throw new Error("unexpected block 0x" + b.toString(16) + " at " + (p - 1));
    const x = u16(), y = u16(), w = u16(), h = u16();
    const iflags = u8();
    if (iflags & 0x80) throw new Error("local tables not expected");
    const minCode = u8();
    const data = [];
    let sub = u8();
    while (sub) { for (let i = 0; i < sub; i++) data.push(u8()); sub = u8(); }
    const indices = lzwDecode(data, minCode, w * h);
    const img = new Uint8Array(width * height * 3);
    img.set(canvas);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const c = gct[indices[yy * w + xx]];
      const o = ((y + yy) * width + (x + xx)) * 3;
      img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
    }
    canvas = img;
    frames.push({ delay: pendingDelay, rgb: img });
  }
  return { width, height, loop, frames, paletteSize: gct ? gct.length : 0 };
}

function lzwDecode(data, minCode, pixelCount) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = null; dict[eoi] = null;
    codeSize = minCode + 1;
  };
  reset();
  const out = [];
  let bitPos = 0;
  const read = () => {
    let v = 0;
    for (let i = 0; i < codeSize; i++) {
      const byte = data[(bitPos >> 3)];
      if (byte === undefined) throw new Error("ran out of data");
      if (byte & (1 << (bitPos & 7))) v |= 1 << i;
      bitPos++;
    }
    return v;
  };
  let prev = null;
  for (;;) {
    const code = read();
    if (code === clear) { reset(); prev = null; continue; }
    if (code === eoi) break;
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (code === dict.length && prev) entry = prev.concat(prev[0]);
    else throw new Error("bad code " + code);
    for (const v of entry) out.push(v);
    if (prev) {
      if (dict.length < 4096) dict.push(prev.concat(entry[0]));
    }
    if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
    prev = entry;
  }
  if (out.length !== pixelCount) throw new Error(`pixel count ${out.length} != ${pixelCount}`);
  return out;
}
