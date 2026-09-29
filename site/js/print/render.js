// Renders one printable sheet onto a canvas at any dpi (preview, 300 dpi PNG, PDF, print).
// Geometry from print/geometry.js (Ruling 3). Hebrew footer drawn RTL after fonts load.
import { PAPERS, CARD, PER_SHEET, cardSlot, imageRect, mmToPx, pagePixels, GRID, gridOrigin } from "./geometry.js";
import { makeCanvas } from "../lib/util.js";
import { t } from "../lib/i18n.js";

const MARGIN_SHADE = "#F1EEE8";
const INK = "#1F1E1B";
const MUTED = "#5E5A52";

/**
 * frames: [{ canvas }], cards: all cards [{ frameIndex, number }], sheet: 0-based.
 * forScreen: grey cut lines for the on-screen preview; print outputs use pure black.
 */
export function renderSheet({ frames, cards, sheet, sheetTotal, paperId = "A4", dpi = 300, title, forScreen = false }) {
  const paper = PAPERS[paperId];
  const { w, h } = pagePixels(paper, dpi);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const px = (mm) => mmToPx(mm, dpi);
  const pt = (points) => (points / 72) * dpi;
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, w, h);
  const onSheet = cards.slice(sheet * PER_SHEET, sheet * PER_SHEET + PER_SHEET);
  const square = frames[0].canvas.width === frames[0].canvas.height;
  const ir = imageRect(square);
  g.imageSmoothingQuality = "high";

  onSheet.forEach((card, i) => {
    const slot = cardSlot(i, paper);
    const x = px(slot.xMm), y = px(slot.yMm);
    // staple margin (binding is physical: always on the left)
    g.fillStyle = MARGIN_SHADE;
    g.fillRect(x, y, px(CARD.stapleMm), px(CARD.hMm));
    g.fillStyle = INK;
    for (const dy of [12, 48]) {
      g.beginPath();
      g.arc(x + px(10), y + px(dy), px(0.9), 0, Math.PI * 2);
      g.fill();
    }
    g.font = `500 ${pt(8)}px Rubik, "Segoe UI", Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.direction = "ltr";
    g.fillText(String(card.number), x + px(10), y + px(30));
    // the frame, flattened on white
    const frame = frames[card.frameIndex].canvas;
    g.drawImage(frame, x + px(ir.xMm), y + px(ir.yMm), px(ir.wMm), px(ir.hMm));
  });

  // dashed cut lines around every card; neighbours share one line
  g.strokeStyle = forScreen ? "#8A857B" : "#000000";
  g.lineWidth = Math.max(1, pt(0.5));
  g.setLineDash([px(2), px(1.5)]);
  const o = gridOrigin(paper);
  const rows = Math.ceil(onSheet.length / CARD.cols);
  g.beginPath();
  for (let r = 0; r <= rows; r++) {
    const cols = r === rows ? cardsInRow(onSheet.length, r - 1) : Math.max(cardsInRow(onSheet.length, r), cardsInRow(onSheet.length, r - 1));
    const yy = px(o.yMm + r * CARD.hMm);
    g.moveTo(px(o.xMm), yy);
    g.lineTo(px(o.xMm + cols * CARD.wMm), yy);
  }
  for (let r = 0; r < rows; r++) {
    const cols = cardsInRow(onSheet.length, r);
    for (let col = 0; col <= cols; col++) {
      const xx = px(o.xMm + col * CARD.wMm);
      g.moveTo(xx, px(o.yMm + r * CARD.hMm));
      g.lineTo(xx, px(o.yMm + (r + 1) * CARD.hMm));
    }
  }
  g.stroke();
  g.setLineDash([]);

  // footer, right-aligned under the grid (Hebrew, RTL)
  g.fillStyle = MUTED;
  g.font = `400 ${pt(8)}px Rubik, "Segoe UI", Arial, sans-serif`;
  g.direction = "rtl";
  g.textAlign = "right";
  g.textBaseline = "alphabetic";
  const right = px(o.xMm + GRID.wMm);
  const fy = px(o.yMm + GRID.hMm + 6);
  g.fillText(t("sheet.footer.id", { title, n: sheet + 1, total: sheetTotal }), right, fy);
  g.fillText(t("sheet.footer.howTo"), right, fy + pt(12));
  return c;
}

function cardsInRow(count, row) {
  if (row < 0) return 0;
  return Math.max(0, Math.min(CARD.cols, count - row * CARD.cols));
}

/** Flattens a canvas to RGB bytes (the PDF image stream wants no alpha). */
export function canvasRgb(canvas) {
  const { width, height } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const out = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
    out[j] = d[i]; out[j + 1] = d[i + 1]; out[j + 2] = d[i + 2];
  }
  return out;
}

export async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function hasCompressionStream() {
  return typeof globalThis.CompressionStream === "function";
}
