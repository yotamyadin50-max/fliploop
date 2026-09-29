// Print sheet geometry (plan 4 + Ruling 3). All lengths in millimetres. DOM-free.
// Cards 100x60 mm, 2 across x 4 down, adjacent cards share one cut line, so the grid is
// exactly 200 x 240 mm. The same numbers drive the PNG render, the PDF and the @page CSS.

export const PAPERS = {
  A4: { id: "A4", wMm: 210, hMm: 297, wPt: 595.28, hPt: 841.89, marginXMm: 5, marginYMm: 10 },
  Letter: { id: "Letter", wMm: 215.9, hMm: 279.4, wPt: 612, hPt: 792, marginXMm: 7.9, marginYMm: 10 },
};

export const CARD = { wMm: 100, hMm: 60, stapleMm: 20, cols: 2, rows: 4 };
export const PER_SHEET = CARD.cols * CARD.rows;
export const GRID = { wMm: CARD.wMm * CARD.cols, hMm: CARD.hMm * CARD.rows };

/** Grid origin on the page: centred horizontally, top margin 10 mm. */
export function gridOrigin(paper) {
  return { xMm: (paper.wMm - GRID.wMm) / 2, yMm: paper.marginYMm };
}

/** Image rectangle inside a card, relative to the card's top-left corner. */
export function imageRect(square) {
  if (square) return { xMm: CARD.stapleMm + (CARD.wMm - CARD.stapleMm - 54) / 2, yMm: 3, wMm: 54, hMm: 54 };
  return { xMm: CARD.stapleMm + 4, yMm: 3, wMm: 72, hMm: 54 };
}

/**
 * Expands frames into printed cards: holds repeat a card, ping-pong return frames are
 * appended only when asked. Returns [{ frameIndex, number }].
 */
export function cardList(holds, { pingpongReturn = false } = {}) {
  const order = holds.map((_, i) => i);
  if (pingpongReturn && holds.length >= 3) for (let i = holds.length - 2; i >= 1; i--) order.push(i);
  const cards = [];
  for (const frameIndex of order) {
    for (let h = 0; h < holds[frameIndex]; h++) cards.push({ frameIndex, number: cards.length + 1 });
  }
  return cards;
}

export function sheetCount(cardCount) {
  return Math.max(1, Math.ceil(cardCount / PER_SHEET));
}

/** Card placement on a sheet, left to right, top to bottom (binding is physical, not reading order). */
export function cardSlot(indexOnSheet, paper) {
  const o = gridOrigin(paper);
  const col = indexOnSheet % CARD.cols;
  const row = Math.floor(indexOnSheet / CARD.cols);
  return { xMm: o.xMm + col * CARD.wMm, yMm: o.yMm + row * CARD.hMm };
}

export function mmToPx(mm, dpi) {
  return (mm / 25.4) * dpi;
}

export function pagePixels(paper, dpi) {
  return { w: Math.round(mmToPx(paper.wMm, dpi)), h: Math.round(mmToPx(paper.hMm, dpi)) };
}
