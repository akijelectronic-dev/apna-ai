/* Sadia AI – dotted 3D globe with orbit rings, glow platform and stars. API: AV.init(el), AV.set(mode), AV.mood(name), AV.say(), AV.hook, AV.debug() */
window.AV = (() => {
  const ROWS = 84, COLS = 170, LX = [], LY = [], LZ = [], LP = [];
  for (let r = 0; r < ROWS; r++) {
    const lat = -Math.PI / 2 + Math.PI * (r + 0.5) / ROWS, cl = Math.cos(lat), m = Math.max(3, Math.round(COLS * cl));
    for (let k = 0; k < m; k++) { const lon = (k + (r & 1) * 0.5) / m * 6.2832; LX.push(cl * Math.cos(lon)); LY.push(Math.sin(lat)); LZ.push(cl * Math.sin(lon)); LP.push(Math.random() * 6.28); }
  }
  const N = LX.length, GX = Float32Array.from(LX), GY = Float32Array.from(LY), GZ = Float32Array.from(LZ), GP = Float32Array.from(LP);
  const SX = new Float32Array(N), SY = new Float32Array(N), SR = new Float32Array(N), SB = new Uint8Array(N), ORD = new Uint16Array(N), CNT = new Uint16Array(49);
  let stride = 1, ema = 8;
  const STARS = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.1, p: Math.random() * 6.28, c: Math.random() < 0.3 ? [255, 190, 150] : Math.random() < 0.5 ? [150, 190, 255] : [255, 255, 255] }));
  const RINGS = [
    { a: 1.95, b: 0.5, rot: -0.3, ci: 0.0, sp: 0.16, ph: 3.3, orb: [255, 150, 70], os: 7 },
    { a: 1.78, b: 0.4, rot: -0.16, ci: 0.78, sp: -0.12, ph: 0.9, orb: [205, 95, 255], os: 6 },
    { a: 1.5, b: 0.62, rot: -0.46, ci: 0.25, sp: 0.1, ph: 2.1, orb: [90, 165, 255], os: 4.5 }
  ];
  const MOODS = {
    calm: [[30, 230, 255], [60, 140, 255], [150, 90, 255], [255, 80, 215], [255, 165, 80]],
    happy: [[255, 230, 120], [255, 190, 90], [255, 130, 150], [255, 90, 200], [255, 160, 70]],
    sad: [[110, 170, 255], [80, 120, 240], [100, 90, 220], [150, 110, 230], [90, 200, 230]],
    curious: [[60, 255, 190], [40, 220, 255], [90, 160, 255], [170, 255, 120], [60, 255, 230]],
    angry: [[255, 110, 90], [255, 70, 80], [255, 150, 60], [255, 60, 150], [255, 200, 80]],
    shy: [[255, 160, 220], [255, 120, 200], [200, 110, 255], [255, 190, 170], [255, 140, 230]]
  };
  let pal = MOODS.calm.map(c => c.slice()), goal = MOODS.calm;
  let cv, cx, W = 360, H = 420, D = 1, mode = 'idle', t = 0, amp = 0, rot = 0, spin = 0.07, shrink = 1, run = false, frames = 0, lastErr = '';
  const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const colAt = u => { u = clamp(u, 0, 0.9999) * 4; const i = Math.floor(u), f = u - i, a = pal[i], b = pal[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (+a.toFixed(3)) + ')';
  const lite = (c, k) => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
  function size() {
    if (!cv) return; const r = cv.parentElement.getBoundingClientRect(); D = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(160, Math.round(r.width) || 360); H = Math.max(200, Math.round(r.height) || 420);
    cv.width = Math.round(W * D); cv.height = Math.round(H * D); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(D, 0, 0, D, 0, 0);
  }
  function ringPt(g, R, c, cy, th) { const ca = Math.cos(g.rot), sa = Math.sin(g.rot), ex = g.a * R * Math.cos(th), ey = g.b * R * Math.sin(th); return [c + ex * ca - ey * sa, cy + ex * sa + ey * ca]; }
  function ringPass(front, R, c, cy) {
    RINGS.forEach(g => {
      const col = lite(colAt(g.ci), 0.35); const from = front ? 0 : Math.PI, to = from + Math.PI;
      for (const [lw, al, wh] of [[5, 0.07, 0], [2.2, 0.22, 0], [1, front ? 0.95 : 0.6, 0.5]]) {
        cx.strokeStyle = rgba(wh ? lite(col, wh) : col, al); cx.lineWidth = lw; cx.beginPath();
        for (let k = 0; k <= 48; k++) { const p = ringPt(g, R, c, cy, from + (to - from) * k / 48); k ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]); }
        cx.stroke();
      }
      const th = (t * g.sp * (1 + amp * 3) + g.ph) % 6.2832, th2 = th < 0 ? th + 6.2832 : th;
      if ((Math.sin(th2) > 0) === front) {
        const p = ringPt(g, R, c, cy, th2), rr = g.os * (R / 100) * 2.4, gr = cx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
        gr.addColorStop(0, rgba(lite(g.orb, 0.6), 1)); gr.addColorStop(0.25, rgba(g.orb, 0.8)); gr.addColorStop(1, rgba(g.orb, 0));
        cx.fillStyle = gr; cx.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2);
      }
    });
  }
  function draw() {
    const T0 = performance.now(); t += 0.01; rot += 0.016 * spin;
    const h = typeof api.hook === 'function' ? +api.hook() || 0 : 0;
    const g = mode === 'talk' ? Math.max(0.1, h) : mode === 'listen' ? 0.2 + 0.08 * Math.sin(t * 3) : mode === 'think' ? 0.12 : 0.04 + 0.02 * Math.sin(t * 1.4);
    amp = lerp(amp, g, 0.18); spin = lerp(spin, mode === 'think' ? 0.5 : mode === 'talk' ? 0.16 : 0.07, 0.04); shrink = lerp(shrink, mode === 'think' ? 0.92 : 1, 0.05);
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) pal[i][k] = lerp(pal[i][k], goal[i][k], 0.05);
    const c = W / 2, cy = H * 0.47, R = Math.min(W * 0.255, H * 0.29) * shrink, cY = Math.cos(rot), sY = Math.sin(rot), tilt = 0.3, ct = Math.cos(tilt), st = Math.sin(tilt), sc = R / 105;
    cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = 'lighter';
    for (const s of STARS) { const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.8 + s.p)); cx.fillStyle = rgba(s.c, a); cx.beginPath(); cx.arc(s.x * W, s.y * H, s.s, 0, 6.2832); cx.fill(); }
    let gr = cx.createRadialGradient(c, cy, R * 0.3, c, cy, R * 1.9); gr.addColorStop(0, rgba(colAt(0.25), 0.2 + amp * 0.25)); gr.addColorStop(0.6, rgba(colAt(0.7), 0.07)); gr.addColorStop(1, rgba(colAt(0.7), 0)); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    // glow platform
    const py = cy + R * 1.24; cx.save(); cx.translate(c, py); cx.scale(1, 0.14);
    gr = cx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1); gr.addColorStop(0, rgba(colAt(0.15), 0.55 + amp * 0.3)); gr.addColorStop(0.5, rgba(colAt(0.6), 0.2)); gr.addColorStop(1, rgba(colAt(0.7), 0)); cx.fillStyle = gr; cx.fillRect(-R * 2.2, -R * 2.2, R * 4.4, R * 4.4); cx.restore();
    for (let i = 0; i < 7; i++) {
      const rx = R * (0.55 + i * 0.3) * (1 + amp * 0.05 * Math.sin(t * 5 - i)), col = colAt(i / 6);
      cx.strokeStyle = rgba(col, Math.max(0.12, 0.7 - i * 0.08)); cx.lineWidth = i === 1 ? 2.6 : 1.2; cx.beginPath(); cx.ellipse(c, py, rx, rx * 0.14, 0, 0, 6.2832); cx.stroke();
    }
    cx.strokeStyle = rgba(lite(colAt(0.05), 0.55), 1); cx.lineWidth = 3; cx.beginPath(); cx.ellipse(c, py, R * 0.9, R * 0.9 * 0.14, 0, 0, 6.2832); cx.stroke();
    if (mode === 'listen') { const p = (t * 0.4) % 1; cx.strokeStyle = rgba(colAt(0.3), 0.5 * (1 - p)); cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(c, py, R * (0.6 + p * 1.6), R * (0.6 + p * 1.6) * 0.14, 0, 0, 6.2832); cx.stroke(); }
    ringPass(false, R, c, cy);
    // globe dots
    for (let i = 0; i < N; i += stride) {
      const x = GX[i], y = GY[i], z = GZ[i], ph = GP[i];
      let d = 0.01 * Math.sin(x * 3 + t * 1.3 + ph * 0.2) * Math.sin(y * 3 - t * 1.1) + amp * 0.1 * Math.sin(x * 7 + y * 5 + z * 6 + t * (mode === 'talk' ? 9 : 4) + ph);
      if (mode === 'listen') d += 0.035 * Math.sin(y * 7 - t * 5); else if (mode === 'think') d += 0.025 * Math.sin(Math.atan2(z, x) * 5 + t * 6);
      const r = R * (1 + d), xr = (x * cY + z * sY) * r, zr = (-x * sY + z * cY) * r, y0 = y * r, yr = y0 * ct - zr * st, zz = y0 * st + zr * ct;
      const pp = 1 / (1 - zz / (R * 6)), dep = clamp((zz / R + 1) / 2, 0, 1), rim = Math.abs(zz) / R < 0.22;
      const u = 0.5 + 0.4 * (xr / R) + 0.2 * (yr / R) + 0.06 * Math.sin(t * 0.5 + yr / R * 3), q = Math.round(clamp(u, 0, 1) * 15);
      const tw = Math.sin(t * 1.3 + ph * 5) > 0.992;
      let di = rim || tw ? 2 : dep < 0.3 ? 0 : dep < 0.62 ? 1 : 2, rad = Math.max(0.32, (0.2 + 0.55 * dep) * sc) * (rim ? 1.3 : 1) * (tw ? 1.7 : 1);
      SX[i] = c + xr * pp; SY[i] = cy + yr * pp; SR[i] = rad * pp; SB[i] = q * 3 + di;
    }
    CNT.fill(0); for (let i = 0; i < N; i += stride) CNT[SB[i] + 1]++; for (let b = 0; b < 48; b++) CNT[b + 1] += CNT[b];
    const fill = CNT.slice(0, 48); for (let i = 0; i < N; i += stride) ORD[fill[SB[i]]++] = i;
    const al = [0.28, 0.75, 1];
    for (let b = 0; b < 48; b++) {
      const s0 = CNT[b], s1 = CNT[b + 1]; if (s0 === s1) continue;
      const q = (b / 3) | 0, di = b % 3, col = colAt(q / 15); cx.fillStyle = rgba(di === 2 ? lite(col, 0.12) : col, al[di]); cx.beginPath();
      for (let k = s0; k < s1; k++) { const i = ORD[k]; cx.moveTo(SX[i] + SR[i], SY[i]); cx.arc(SX[i], SY[i], SR[i], 0, 6.2832); }
      cx.fill();
    }
    ringPass(true, R, c, cy);
    ema = ema * 0.95 + (performance.now() - T0) * 0.05; if (ema > 26 && stride < 3) { stride++; ema = 10; } else if (ema < 7 && stride > 1) { stride--; ema = 12; }
  }
  function frame() { try { draw(); frames++; } catch (e) { lastErr = String(e.message || e); } requestAnimationFrame(frame); }
  const api = {
    hook: null,
    init(el) { el.innerHTML = ''; cv = document.createElement('canvas'); cv.style.display = 'block'; el.append(cv); cx = cv.getContext('2d'); size(); window.addEventListener('resize', size); if (!run) { run = true; requestAnimationFrame(frame); } },
    set(m) { mode = m || 'idle'; },
    mood(m) { goal = MOODS[m] || MOODS.calm; },
    say() {},
    debug() { try { const d = cx.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 148) if (d[i] > 0) n++; return 'ক্যানভাস ' + cv.width + '×' + cv.height + ', ফ্রেম ' + frames + ', পিক্সেল ' + n + (lastErr ? ', ত্রুটি: ' + lastErr : ''); } catch (e) { return 'debug ত্রুটি: ' + e.message; } },
    _dump(w, h, tt) { W = w; H = h; D = 1; t = tt; }
  };
  return api;
})();
