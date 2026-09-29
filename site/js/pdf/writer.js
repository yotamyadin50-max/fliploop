// In-house minimal PDF 1.4 writer (Ruling 2): one page per sheet, each page a single
// full-page image XObject (FlateDecode RGB, or DCTDecode JPEG as the fallback).
// Byte-exact xref offsets. DOM-free.

const enc = new TextEncoder();

function pdfNumber(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** PDF text string as UTF-16BE hex with BOM, so Hebrew titles survive. */
export function pdfTextString(s) {
  let hex = "FEFF";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp > 0xffff) {
      const v = cp - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, "0");
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0");
    } else {
      hex += cp.toString(16).padStart(4, "0");
    }
  }
  return "<" + hex.toUpperCase() + ">";
}

function pdfDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `(D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z)`;
}

/**
 * pages: [{ widthPt, heightPt, image: { width, height, filter: "FlateDecode"|"DCTDecode", data: Uint8Array } }]
 * Returns the complete file as a Uint8Array.
 */
export function buildPdf({ pages, title = "", date = new Date() }) {
  const chunks = [];
  let length = 0;
  const offsets = [0]; // object 0 is the free-list head
  const push = (bytes) => { chunks.push(bytes); length += bytes.length; };
  const text = (s) => push(enc.encode(s));
  const beginObj = (num) => { offsets[num] = length; text(`${num} 0 obj\n`); };

  text("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker comment

  // Numbering: 1 catalog, 2 pages, 3 info, then 3 objects per page (page, content, image).
  const pageNum = (i) => 4 + i * 3;
  const kids = pages.map((_, i) => `${pageNum(i)} 0 R`).join(" ");

  beginObj(1);
  text("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObj(2);
  text(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
  beginObj(3);
  text(`<< /Title ${pdfTextString(title)} /Producer (FlipLoop) /Creator (FlipLoop) /CreationDate ${pdfDate(date)} >>\nendobj\n`);

  pages.forEach((page, i) => {
    const pn = pageNum(i), cn = pn + 1, im = pn + 2;
    const w = pdfNumber(page.widthPt), h = pdfNumber(page.heightPt);
    beginObj(pn);
    text(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i + 1} ${im} 0 R >> >> /Contents ${cn} 0 R >>\nendobj\n`);
    const content = enc.encode(`q\n${w} 0 0 ${h} 0 0 cm\n/Im${i + 1} Do\nQ\n`);
    beginObj(cn);
    text(`<< /Length ${content.length} >>\nstream\n`);
    push(content);
    text("\nendstream\nendobj\n");
    const img = page.image;
    beginObj(im);
    text(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${img.filter} /Length ${img.data.length} >>\nstream\n`);
    push(img.data);
    text("\nendstream\nendobj\n");
  });

  const count = offsets.length;
  const xrefStart = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  text(xref);
  text(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
