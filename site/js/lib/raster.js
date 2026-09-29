// Draws stroke data with the same midpoint-quadratic smoothing the pencil uses.

export function drawSmoothPath(ctx, pts, closed) {
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    return;
  }
  ctx.beginPath();
  if (closed) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(pts[n - 1], pts[0]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], m = mid(p, pts[(i + 1) % n]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 2) {
      ctx.lineTo(pts[1][0], pts[1][1]);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0], last[1]);
    }
  }
  ctx.stroke();
}

/** strokes: [{ c, w, p, closed, dash }]. scale maps stroke space into the canvas. */
export function drawStrokes(ctx, strokes, scale = 1) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.strokeStyle = s.c;
    ctx.lineWidth = Math.max(1, s.w * scale);
    ctx.setLineDash(s.dash ? [6 * scale, 4 * scale] : []);
    const pts = scale === 1 ? s.p : s.p.map(([x, y]) => [x * scale, y * scale]);
    drawSmoothPath(ctx, pts, s.closed);
  }
  ctx.restore();
}

/** SVG path data for a stroke (Home art), same smoothing. */
export function strokeToPath(s) {
  const f = (v) => Math.round(v * 10) / 10;
  const pts = s.p;
  if (pts.length === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}h0`;
  if (s.closed) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const st = mid(pts[n - 1], pts[0]);
    let d = `M${f(st[0])} ${f(st[1])}`;
    for (let i = 0; i < n; i++) {
      const m = mid(pts[i], pts[(i + 1) % n]);
      d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(m[0])} ${f(m[1])}`;
    }
    return d + "Z";
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  if (pts.length === 2) return d + `L${f(pts[1][0])} ${f(pts[1][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${f(last[0])} ${f(last[1])}`;
}
