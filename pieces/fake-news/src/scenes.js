// =====================================================================
//  SCENES — Fake News & Deepfakes (sketchbook, German). World 1080x1920; TT on 2s; E0 = era start.
// =====================================================================
const A = (x) => E0 + x;                 // a time inside the current era
const W0 = (id) => LT(id).t0, W1 = (id) => LT(id).t1;
const SKIN = '#f6dfc6';
// ---- shared shapes (also the morph bridges)
const PH_S = sketchBox(740, 820, 150, 250, 22);
const PH = sketchBox(330, 420, 380, 660, 44);
const NP = sketchBox(200, 440, 600, 680, 10);
const CARD0 = sketchBox(438, 516, 124, 88, 8);
const KB = sketchBox(110, 520, 330, 300, 24);
const FACE_OV = loopPts(730, 660, 95, 120, 0, 0, 40);
const FR_L = sketchBox(110, 500, 350, 470, 22);
const FR_R = sketchBox(540, 500, 350, 470, 22);
const CORK_M = sketchBox(380, 640, 240, 230, 6);
const PF = sketchBox(190, 420, 620, 640, 14);
const VID = sketchBox(90, 480, 820, 520, 18);
const OLD = { x: 680, y: 780, r: 110 };
const HERO_Y = { x: 500, y: 880, r: 110 };
const GAUGE = { x: 500, y: 820, r: 230 };
const QB = sketchBox(80, 400, 840, 200, 34);
const QCARD = sketchBox(80, 660, 840, 560, 20);
const CARD_L = sketchBox(110, 620, 680, 520, 18);
const LENS = { x: 720, y: 560, r: 115 };
const circ = (o, r) => loopPts(o.x, o.y, r ?? o.r, r ?? o.r, 0, 0, 40);
const STAMPS = [];                         // absolute stamp times, for the score
function stampAt(t) { if (!STAMPS.includes(t)) STAMPS.push(t); return t; }

// ---- helpers
function bubble(x, y, w, h, tail, key, part, fill = SK.sheet) {
  const P = sketchBox(x - w / 2, y - h / 2, w, h, Math.min(34, h / 2.5), 0);
  if (part <= 0) return;
  gfill(P, fill, { off: [3, 3], key: key + 'f', a: clamp(part * 3) });
  gline(P, { closed: true, w: 4, key: key + 'o', part });
  if (tail) gline([[x + tail[0] * 0.3 - 18, y + h / 2 - 2], [x + tail[0], y + h / 2 + tail[1]], [x + tail[0] * 0.3 + 18, y + h / 2 - 2]], { w: 4, key: key + 't', second: false, part: seg(part, 0.6, 1) });
}
function penOn(P, t0, d) { if (TT >= t0 && TT < t0 + d + 0.08) { const tip = writeEnd(closeP(P), ev(t0, d)); pencilTool(tip[0], tip[1], -0.75 + 0.08 * Math.sin(B * 1.7), 1); } }
function drawn(P, t0, d, key, o = {}) {      // pencil construction, then ink, then the pencil follows
  const p = ev(t0, d);
  if (p <= 0) return 0;
  if (o.fill) gfill(P, o.fill, { key: key + 'f', a: clamp(p * 2), off: o.off ?? [4, 3] });
  gpencil(P, { closed: true, key: key + 'c', w: 2.4, a: 0.6 * (1 - ev(t0 + d, 0.3)), part: p });
  gline(P, { closed: true, key, w: o.w ?? 5, part: ev(t0 + d * 0.6, d * 0.5) });
  if (o.pen !== false) penOn(P, t0, d);
  return p;
}
function face(cx, cy, s, key, o = {}) {      // a plain ink portrait face (not the hero)
  const head = loopPts(cx, cy, 95 * s, 120 * s, 0.05);
  gfill(head, o.skin ?? SKIN, { key: key + 'sk' });
  if (o.hair !== false) {
    const H = [[cx - 100 * s, cy - 30 * s], [cx - 85 * s, cy - 115 * s], [cx, cy - 150 * s], [cx + 85 * s, cy - 115 * s], [cx + 100 * s, cy - 30 * s], [cx + 40 * s, cy - 95 * s], [cx - 50 * s, cy - 90 * s]];
    ctx.save(); gclip(H); ghatch(cx - 110 * s, cy - 160 * s, cx + 110 * s, cy - 20 * s, { ang: -0.8, gap: 7, col: o.hairCol ?? SK.ink, w: 2.2, a: 0.7, key: key + 'hh' }); ctx.restore();
    gline(H, { w: 3.5, key: key + 'hr', closed: true, amp: 1 });
  }
  gline(head, { w: 5, key: key + 'h' });
  for (const sx of [-1, 1]) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(cx + sx * 34 * s, cy - 6 * s, 9 * s, (o.wow ? 15 : 12) * s, 0, 0, TAU); ctx.fill(); }
  gline([[cx, cy + 2 * s], [cx - 9 * s, cy + 32 * s], [cx + 6 * s, cy + 36 * s]], { w: 3.5, key: key + 'n', second: false });
  if (o.wow) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(cx, cy + 66 * s, 13 * s, 17 * s, 0, 0, TAU); ctx.fill(); }
  else gline(arcPts(cx, cy + 40 * s, 36 * s, Math.PI * 0.2, Math.PI * 0.8, 8), { w: 4, key: key + 'm', second: false });
  if (o.glasses) { for (const sx of [-1, 1]) gline(loopPts(cx + sx * 34 * s, cy - 6 * s, 27 * s, 23 * s, 0.05), { w: 3.5, key: key + 'g' + sx }); gline([[cx - 8 * s, cy - 8 * s], [cx + 8 * s, cy - 8 * s]], { w: 3, key: key + 'gb', second: false }); }
}
function oldie(x, y, s, key, o = {}) {        // an older person: white hair, glasses, cardigan
  const body = [[x - 95 * s, y + 330 * s], [x - 75 * s, y + 140 * s], [x + 75 * s, y + 140 * s], [x + 95 * s, y + 330 * s]];
  gfill(body, '#cfd8dc', { key: key + 'bf' }); gline(body, { w: 5, key: key + 'b' });
  for (let i = 0; i < 3; i++) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.arc(x, y + (180 + i * 45) * s, 5 * s, 0, TAU); ctx.fill(); }
  face(x, y, s * 1.05, key, { glasses: true, hairCol: SK.graphL ?? '#9a948b', wow: o.wow });
}
function girl(x, y, s, key, o = {}) {         // the questioner: an ink doodle girl with a ponytail
  gline([[x + 70 * s, y - 70 * s], [x + 120 * s, y - 40 * s + 8 * Math.sin(B)], [x + 110 * s, y + 10 * s]], { w: 6, key: key + 'pt', second: false });
  face(x, y, s, key, { hairCol: SK.ink, wow: o.wow });
}
function stamp(str, x, y, s, rot, t, key) { const k = ev(stampAt(t), 0.15); if (k > 0) inkStamp(str, x, y, s * (1.4 - 0.4 * k), rot, k, key); }
function phoneIcon(x, y, w, h, key, o = {}) {
  const P = sketchBox(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.14);
  gfill(P, o.fill ?? SK.sheet, { key: key + 'f', off: [0, 0] }); gline(P, { w: o.w ?? 4, key });
  gline([[x - w * 0.15, y - h / 2 + h * 0.06], [x + w * 0.15, y - h / 2 + h * 0.06]], { w: 3, key: key + 's', second: false });
}
function heart(x, y, s, key, col = SK.red) {
  const P = []; for (let i = 0; i <= 24; i++) { const t = i / 24 * TAU; P.push([x + s * 16 * Math.pow(Math.sin(t), 3) / 16, y - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]); }
  gfill(P, col, { key: key + 'f', off: [2, 2] }); gline(P, { w: 3, key, closed: true });
}
function margins(key) { [[90, 560, 0], [120, 1180, 1], [950, 1250, 2]].forEach(([x, y, i]) => doodleStar(x, y, 18 + 5 * ((B + i) % 3 === 0), key + i, { w: 3 })); }
function textLines(x, y, ws, gap, key, t0) { ws.forEach((w, i) => gpencil([[x, y + i * gap], [x + w, y + i * gap]], { key: key + i, w: 3, a: 0.8, part: t0 == null ? 1 : ev(t0 + i * 0.12, 0.15) })); }
function caption2(a, b, tSwap, hiA, hiB) { if (TT < tSwap) pageCaption(a, hiA); else pageCaption(b, hiB, { at: tSwap - E0 + 0.1 }); }

// ================= 1 INTRO =================
function sIntro() {
  sketchPage({ grid: 'dots' }); margins('m0');
  const r = ev(A(0.4), 1.4);
  if (r > 0) {
    const [x0, x1] = handLetter('Echt oder', CX, 560, 120, { face: 'marker', reveal: ev(A(0.4), 0.7), key: 't1' });
    const [y0, y1] = handLetter('Fake?', CX, 700, 150, { face: 'marker', col: SK.ink, reveal: ev(A(1.0), 0.7), key: 't2' });
    highlight(y0 + 10, y1 - 40, 670, 70, ev(A(1.8), 0.3), { key: 'thl' });
    underline(y0, y1, 730, { col: SK.red, w: 6, key: 'tu', part: ev(A(2.1), 0.3) });
    if (TT < A(1.9)) pencilTool(lerp(x0, y1, r), TT < A(1.0) ? 560 : 700, -0.75, 1);
  }
  // a newspaper and a phone written on either side
  const np = sketchBox(110, 830, 200, 250, 6);
  if (drawn(np, A(2.6), 0.6, 'inp', { fill: SK.sheet })) { handLetter('NEWS', 210, 885, 44, { face: 'marker', key: 'inpt' }); textLines(135, 920, [150, 130, 150, 90], 30, 'inpl'); }
  if (drawn(PH_S, A(3.3), 0.6, 'iph', { fill: SK.sheet })) { graphiteScribble(815, 920, 100, 80, 'iphs'); textLines(760, 990, [110, 80], 28, 'iphl'); }
  const wow = TT >= A(4.2), hop = Math.sin(Math.PI * ev(A(4.2), 0.3));
  doodleHero(CX, 1020 - 40 * hop, 95, { key: 'hero', legs: true, mood: wow ? 'wow' : 'puzzled', look: [wow ? 0.8 : -0.8, -0.5], arms: wow ? [1.2, 1.2] : [-0.9, 0.9] });
  if (!wow) handLetter('?', CX + 90, 890 + 6 * Math.sin(B * 0.9), 90, { col: SK.graph, key: 'iq', jit: 1.5 });
  pageTag('Thema');
  pageCaption(['Medien, KI', 'und die Wahrheit'], [[1, 'Wahrheit']], { at: 2.4 });
}

// ================= 2 FEED =================
const FEED = [['Promi-Skandal!', 1], ['Wunder-Diät', 0], ['Alien gesichtet?', 1], ['Wetter: Sonne', 0], ['Krasses Video', 1], ['Neue Studie', 0]];
function sFeed() {
  sketchPage({ grid: 'dots' }); margins('m1');
  gfill(PH, SK.sheet, { key: 'phf' }); gline(PH, { closed: true, key: 'ph', w: 6 });
  gline([[490, 445], [550, 445]], { w: 5, key: 'phs', second: false });
  ctx.save(); gclip(sketchBox(345, 470, 350, 580, 20));
  const sc = 120 * Math.max(0, TT - A(0.8)), N = FEED.length, step = 200;
  for (let i = 0; i < N; i++) {
    const y = 480 + (((i * step - sc) % (N * step)) + N * step) % (N * step) - step * 0.5;
    if (y < 360 || y > 1100) continue;
    const [t, big] = FEED[i];
    gline(sketchBox(365, y, 310, 180, 12), { w: 3.5, key: 'fc' + i });
    graphiteScribble(425, y + 70, 80, 90, 'fcs' + i);
    handLetter(t, 480, y + 50, 34, { align: 'left', key: 'fct' + i, face: big ? 'marker' : 'hand' });
    textLines(480, y + 90, [160, 120], 28, 'fcl' + i);
    heart(640, y + 150, 1.8, 'fh' + i, i % 2 ? SK.red : SK.graphL ?? '#9a948b');
  }
  ctx.restore();
  const bd = ev(A(2), 0.2);
  if (bd > 0) { gfill(loopPts(705, 425, 46, 40, 0), SK.red, { key: 'bdg', off: [0, 0], a: bd }); handLetter('99+', 705, 440, 40, { face: 'marker', col: SK.sheet, key: 'bdt', reveal: bd }); }
  const lk = [-0.3, 0.3][(B >> 3) % 2];
  doodleHero(840, 1150, 70, { key: 'hero', legs: true, mood: 'calm', look: [-1, -0.8 + lk * 0.2], arms: [-0.6, 0.9] });
  pageTag('Alltag');
  pageCaption(['Jeden Tag:', 'tausende Posts'], [[1, 'tausende']], { at: 1.0 });
}

// ================= 3 FAKE NEWS =================
function sFake() {
  sketchPage({ grid: 'dots' }); margins('m2');
  gfill(NP, '#fbf6ea', { key: 'npf' }); gline(NP, { closed: true, key: 'np', w: 6 });
  handLetter('DIE NEWS', CX, 520, 62, { face: 'marker', key: 'npm' });
  gline([[230, 545], [770, 545]], { w: 4, key: 'npr', second: false }); gline([[230, 555], [770, 555]], { w: 2, key: 'npr2', second: false });
  handLetter('SCHOCK!', CX, 650, 100, { face: 'marker', key: 'nph', reveal: ev(A(0.4), 0.5) });
  handLetter('Schule für immer zu?', CX, 720, 50, { key: 'nps', reveal: ev(A(0.9), 0.5) });
  if (drawn(sketchBox(240, 760, 250, 200, 4), A(1.3), 0.5, 'npp', { pen: false })) graphiteScribble(365, 860, 200, 160, 'nppi');
  textLines(520, 780, [240, 220, 240, 180, 230, 150], 32, 'npl', A(1.5));
  textLines(240, 1000, [520, 480, 500], 32, 'npl2', A(1.9));
  stamp('FAKE', 520, 880, 0.9, -0.18, A(3.4), 'fk');
  const n1 = ev(A(4.4), 0.5), n2 = ev(A(5.2), 0.5);
  if (n1 > 0) { arrowPencil([[150, 470], [180, 560], [230, 620]], n1, { key: 'na1' }); handLetter('Quelle?', 140, 440, 46, { col: SK.graph, key: 'nt1', reveal: n1 }); }
  if (n2 > 0) { arrowPencil([[880, 1180], [840, 1150], [790, 1110]], n2, { key: 'na2' }); handLetter('Autor?', 860, 1230, 46, { col: SK.graph, key: 'nt2', reveal: n2 }); }
  pageTag('Fake News');
  pageCaption(['Erfunden, aber', 'sieht echt aus'], [[0, 'Erfunden']], { at: 1.2 });
}

// ================= 4 SPREAD =================
function treePos() {
  const L = [[[500, 560]]], xs = (n, y) => Array.from({ length: n }, (_, i) => [lerp(170, 830, n === 1 ? 0.5 : i / (n - 1)), y]);
  L.push(xs(2, 760), xs(4, 940), xs(8, 1110)); return L;
}
function sSpread() {
  sketchPage({ grid: 'dots' });
  const L = treePos(), sc = [1, 0.8, 0.62, 0.42];
  for (let l = 1; l < 4; l++) {
    const t0 = A(0.8 + (l - 1) * 1.3);
    L[l].forEach(([x, y], i) => {
      const [px, py] = L[l - 1][i >> 1], k = ev(t0 + i * 0.06, 0.45);
      if (k <= 0) return;
      arrowPencil([[px, py + 40 * sc[l - 1]], [lerp(px, x, 0.5), lerp(py, y, 0.5) - 10], [x, y - 44 * sc[l]]], k, { key: 'sa' + l + i });
      if (k > 0.6) noteCard(x, y, ((i % 3) - 1) * 0.1, sc[l], 1, 'sc' + l + i, SK.red);
    });
  }
  noteCard(500, 560, -0.04, 1, 1, 'sc0', SK.red);
  const n = Math.floor(Math.pow(10, 6 * EZ.i2(seg(TT, A(0.8), A(5.0)))));
  handLetter('geteilt:', 780, 440, 44, { col: SK.graph, key: 'gt' });
  handLetter(n.toLocaleString('de-DE'), 780, 500, 56, { face: 'marker', key: 'gn' + (B % 2) });
  const sw = TT > A(3);
  doodleHero(170, 520, 60, { key: 'hero', mood: sw ? 'wow' : 'calm', look: [1, 0.3], arms: [-0.8, 0.8] });
  if (sw) for (let i = 0; i < 2; i++) sweat(110 - i * 12, 480 + i * 8, ((TT * 1.3 + i * 0.5) % 1), 'sw' + i);
  pageTag('Teilen');
  pageCaption(['Lügen verbreiten', 'sich schneller'], [[1, 'schneller']], { at: 0.8 });
}

// ================= 5 KI =================
function sKI() {
  sketchPage({ grid: 'dots' }); margins('m4');
  gfill(KB, '#e7e2d6', { key: 'kbf' }); gline(KB, { closed: true, key: 'kb', w: 6 });
  handLetter('KI', 275, 640, 110, { face: 'marker', key: 'kbt' });
  for (let i = 0; i < 4; i++) { const on = (B + i) % 4 === 0; gfill(loopPts(170 + i * 50, 760, 12, 12, 0), on ? SK.hilite : '#ffffff', { key: 'kl' + i, off: [0, 0] }); gline(loopPts(170 + i * 50, 760, 12, 12, 0.05), { w: 3, key: 'klo' + i }); }
  gline([[275, 520], [275, 470]], { w: 4, key: 'ant', second: false }); doodleStar(275, 455, 18 + 4 * (B % 2), 'antst', { w: 3 });
  const outs = [['Bild', 660, A(1.2)], ['Video', 920, A(2.8)], ['Stimme', 1130, A(4.2)]];
  outs.forEach(([lab, y, t], i) => { const k = ev(t, 0.5); if (k > 0) arrowPencil([[450, 680 + i * 40], [520, y - 30], [580, y]], k, { key: 'ko' + i }); });
  const f = ev(A(1.6), 1.0);
  if (f > 0) {   // a face assembled from a graphite mesh, then inked
    ctx.save(); gclip(FACE_OV); for (let i = 0; i < 9; i++) gpencil([[620, 540 + i * 30], [840, 540 + i * 30]], { key: 'mh' + i, w: 1.6, a: 0.5 * (1 - seg(f, 0.6, 1)), passes: 1 }); ctx.restore();
    if (f > 0.5) face(730, 660, 0.85, 'kif');
    handLetter('Bild', 870, 560, 44, { col: SK.graph, key: 'kl1' });
  }
  if (TT >= A(3.0)) {   // a film strip
    const fs = sketchBox(610, 870, 260, 110, 6); gfill(fs, '#3a332d', { key: 'fsf', off: [0, 0] });
    for (let i = 0; i < 3; i++) { gfill(sketchBox(630 + i * 80, 895, 60, 60, 4), '#fffdf6', { key: 'fw' + i, off: [0, 0] }); face(660 + i * 80, 925, 0.18, 'ff' + i, { hair: false }); }
    handLetter('Video', 870, 860, 44, { col: SK.graph, key: 'kl2' });
  }
  if (TT >= A(4.4)) {   // a voice wave
    const P = []; for (let i = 0; i <= 60; i++) { const x = 600 + i * 5; P.push([x, 1130 + Math.sin(i * 0.7 + B * 0.9) * 40 * Math.sin(i / 60 * Math.PI)]); }
    gline(P, { w: 4, key: 'wav', amp: 0.5, second: false }); handLetter('Stimme', 870, 1080, 44, { col: SK.graph, key: 'kl3' });
  }
  doodleHero(260, 1040, 62, { key: 'hero', mood: TT > A(4.4) ? 'wow' : 'puzzled', look: [1, -0.5], arms: [-0.8, 0.8], legs: true });
  pageTag('Deepfakes');
  pageCaption(['KI fälscht Bilder,', 'Videos und Stimmen'], [[0, 'KI']], { at: 1.0 });
}

// ================= 6 REAL OR AI =================
function sReal() {
  sketchPage({ grid: 'dots' });
  for (const [P, k] of [[FR_L, 'frl'], [FR_R, 'frr']]) { gfill(P, '#fffdf6', { key: k + 'f' }); gline(P, { closed: true, key: k, w: 5 }); }
  face(285, 740, 1, 'fl');
  const g = TT >= A(2.6) ? 1 : 0;
  ctx.save(); gclip(FR_R);
  for (let i = 0; i < 8; i++) {
    const y0 = 510 + i * 58, dx = g ? ((hash('gl' + i + B) % 3) - 1) * 16 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(540, y0, 350, 58); ctx.clip(); ctx.translate(dx, 0); face(715, 740, 1, 'fl'); ctx.restore();
  }
  if (g) for (let i = 0; i < 4; i++) { const yy = 560 + (hash('gs' + i + B) % 380); gpencil([[560, yy], [870, yy]], { key: 'gsl' + i, w: 2, a: 0.5, passes: 1 }); }
  ctx.restore();
  handLetter('echt?', 285, 1040, 56, { key: 'el', reveal: ev(A(0.5), 0.3) });
  if (TT < A(3.6)) handLetter('echt?', 715, 1040, 56, { key: 'er', reveal: ev(A(0.7), 0.3) });
  stamp('KI', 715, 1035, 0.55, 0.12, A(3.6), 'kis');
  checkMark(285, 1110, 0.9, ev(A(4.0), 0.2));
  doodleHero(500, 1190, 56, { key: 'hero', legs: true, mood: TT >= A(3.6) ? 'wow' : 'puzzled', look: [TT >= A(3.6) ? 1 : -1, -0.6], arms: [-0.9, 0.9] });
  pageTag('Echt?');
  pageCaption(['Echt oder KI?', 'Kaum zu erkennen'], [[0, 'KI']], { at: 0.6 });
}

// ================= 7 EXAMPLES INTRO =================
const CORK = [[200, 760, -0.08, '2023'], [500, 755, 0.03, '2023'], [800, 770, 0.07, '2022']];
function sExIntro() {
  sketchPage({ grid: 'plain' });
  handLetter('Echte Fälle', CX, 520, 110, { face: 'marker', key: 'eft', reveal: ev(A(0.3), 0.6) });
  underline(260, 740, 560, { col: SK.red, w: 6, key: 'efu', part: ev(A(0.9), 0.3) });
  CORK.forEach(([x, y, r, yr], i) => {
    const k = ev(A(1.4 + i * 0.6), 0.3); if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + 30 * (1 - k)); ctx.rotate(r); ctx.globalAlpha *= k;
    const P = sketchBox(-120, -115, 240, 230, 6); gfill(P, '#fffdf6', { key: 'cf' + i, off: [6, 6] }); gline(P, { closed: true, w: 4, key: 'co' + i });
    graphiteScribble(0, -20, 180, 140, 'cs' + i);
    handLetter('?', 0, 20, 110, { face: 'marker', col: SK.ink, key: 'cq' + i });
    handLetter(yr, 0, 100, 44, { key: 'cy' + i });
    ctx.restore(); tapeStrip(x, y - 115, 120, r * 2, 'ct' + i);
  });
  doodleHero(CX, 1150, 70, { key: 'hero', legs: true, mood: 'calm', look: [0, -1], arms: [-0.6, 0.6] });
  pageTag('Beispiele');
  pageCaption(['Das ist schon', 'oft passiert'], [[1, 'passiert']], { at: 0.6 });
}

// ================= 8 POPE =================
function puffer(x, y, s, key) {   // a figure in a long white puffer coat, small white cap
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const w = (150 + i * 14) * s, yy = y + 120 * s + i * 62 * s;
    const P = sketchBox(x - w / 2, yy, w, 66 * s, 30 * s, 0);
    gfill(P, '#ffffff', { key: key + 'pf' + i, off: [3, 3] });
    ctx.save(); gclip(P); ghatch(x - w / 2, yy + 40 * s, x + w / 2, yy + 66 * s, { ang: -0.6, gap: 7, col: SK.graph, w: 1.6, a: 0.4, key: key + 'ph' + i }); ctx.restore();
    gline(P, { w: 3.5, key: key + 'po' + i, closed: true });
  }
  gline([[x, y + 125 * s], [x, y + 470 * s]], { w: 3, key: key + 'zip', second: false });
  gline([[x - 10 * s, y + 160 * s], [x, y + 230 * s], [x + 10 * s, y + 160 * s]], { w: 3, key: key + 'ch', second: false, col: '#c9a227' });
  gline([[x - 14 * s, y + 225 * s], [x + 14 * s, y + 225 * s]], { w: 4, key: key + 'cx', second: false, col: '#c9a227' });
  face(x, y, s * 0.85, key + 'fc', { hair: false, glasses: true });
  const cap = [...arcPts(x, y - 70 * s, 55 * s, Math.PI * 1.1, Math.PI * 1.9, 10)]; gfill(closeP(cap), '#ffffff', { key: key + 'cap', off: [0, 0] }); gline(closeP(cap), { w: 3.5, key: key + 'capo' });
}
function sPope() {
  sketchPage({ grid: 'dots' }); margins('m7');
  const t0 = W0('ex_pope');
  gfill(PF, '#fffdf6', { key: 'pff', off: [8, 8] }); gline(PF, { closed: true, key: 'pf', w: 5 });
  ctx.save(); gclip(sketchBox(220, 450, 560, 520, 6)); ghatch(220, 450, 780, 970, { ang: 0.5, gap: 16, col: SK.graph, w: 1.6, a: 0.25, key: 'pbg' });
  puffer(CX, 560, 0.95, 'pope'); ctx.restore();
  gline(sketchBox(220, 450, 560, 520, 6), { w: 3, key: 'pfi' });
  handLetter('März 2023', CX, 1030, 50, { key: 'pd', reveal: ev(t0 + 0.6, 0.4) });
  const likes = Math.floor(Math.pow(10, 6 * EZ.i2(seg(TT, t0 + 3.5, t0 + 6.5))));
  if (TT > t0 + 3.5) { heart(170, 540, 3.2, 'ph'); handLetter(likes.toLocaleString('de-DE'), 170, 640, 40, { face: 'marker', key: 'pl' + (B % 2) }); }
  stamp('KI-BILD', CX, 760, 0.7, -0.15, t0 + 8.6, 'pk');
  const fooled = TT > t0 + 3.5 && TT < t0 + 8.6;
  doodleHero(860, 1170, 58, { key: 'hero', legs: true, mood: TT >= t0 + 8.6 ? 'wow' : fooled ? 'happy' : 'calm', look: [-1, -0.8], arms: fooled ? [1.1, 1.1] : [-0.6, 0.6] });
  pageTag('Beispiel 1');
  caption2(['Papst in Daunenjacke?', 'Ging um die Welt'], ['Das Bild war', 'mit KI gemacht'], t0 + 8.2, [[1, 'Welt']], [[1, 'KI']]);
}

// ================= 9 PENTAGON =================
function sPentagon() {
  sketchPage({ grid: 'dots' }); margins('m8');
  const t0 = W0('ex_pentagon');
  gfill(PF, '#fffdf6', { key: 'tff', off: [8, 8] }); gline(PF, { closed: true, key: 'pf', w: 5 });
  // a pentagon building in perspective, smoke rising
  const cx = 500, cy = 830, P5 = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; P5.push([cx + Math.cos(a) * 200, cy + Math.sin(a) * 90]); }
  const P5i = P5.map(([x, y]) => [lerp(cx, x, 0.5), lerp(cy, y, 0.5)]);
  gfill(closeP(P5), '#e9e3d4', { key: 'p5f', off: [0, 0] }); gline(closeP(P5), { w: 5, key: 'p5' }); gline(closeP(P5i), { w: 3.5, key: 'p5i' });
  for (let i = 0; i < 5; i++) gpencil([P5[i], P5i[i]], { key: 'p5r' + i, w: 2, a: 0.7 });
  const sm = ev(t0 + 0.8, 2.0);
  if (sm > 0) for (let i = 0; i < 6; i++) {
    const r = 40 + i * 14, x = 640 + i * 18 + 6 * Math.sin(B * 0.7 + i), y = 760 - i * 55 * sm;
    gfill(loopPts(x, y, r, r * 0.8, 0), '#4a433d', { key: 'smk' + i, off: [0, 0], a: 0.85 * sm });
    gline(loopPts(x, y, r, r * 0.8, 0.05), { w: 3, key: 'smo' + i });
  }
  const br = ev(t0 + 0.3, 0.3);
  if (br > 0) { gfill(sketchBox(210, 460, 360, 70, 8), SK.red, { key: 'bn', off: [0, 0], a: br }); handLetter('EILMELDUNG', 390, 510, 46, { face: 'marker', col: SK.sheet, key: 'bnt', reveal: br }); }
  handLetter('Mai 2023', CX, 1030, 50, { key: 'td', reveal: ev(t0 + 0.6, 0.4) });
  const ch = ev(t0 + 6.0, 0.4);   // the stock chart dips and recovers
  if (ch > 0) {
    const bx = 640, by = 1100, P = sketchBox(bx, by, 260, 170, 10); gfill(P, '#fffdf6', { key: 'chf' }); gline(P, { closed: true, w: 4, key: 'cho', part: ch });
    const pts = [[0, 40], [40, 30], [80, 45], [110, 35], [130, 120], [160, 110], [200, 70], [240, 50]].map(([x, y]) => [bx + 10 + x, by + 20 + y]);
    gline(pts, { w: 4, key: 'chl', col: SK.red, part: ev(t0 + 6.3, 0.8), second: false });
    handLetter('Börse', bx + 130, by + 205, 40, { col: SK.graph, key: 'chb' });
  }
  stamp('FAKE', CX, 780, 0.85, -0.15, t0 + 3.2, 'tk');
  doodleHero(220, 1180, 58, { key: 'hero', legs: true, mood: TT > t0 + 6.3 ? 'wow' : 'puzzled', look: [1, -0.6], arms: [-0.8, 0.8] });
  pageTag('Beispiel 2');
  caption2(['Explosion am', 'Pentagon? Fake!'], ['Trotzdem fiel', 'kurz die Börse'], t0 + 6.2, [[1, 'Fake']], [[1, 'Börse']]);
}

// ================= 10 SELENSKYJ =================
function sSelenskyj() {
  sketchPage({ grid: 'dots' }); margins('m9');
  const t0 = W0('ex_selenskyj');
  gfill(VID, '#2e2925', { key: 'vf', off: [6, 6] }); gline(VID, { closed: true, key: 'vid', w: 6 });
  const g = TT > t0 + 7.5;
  ctx.save(); gclip(sketchBox(110, 500, 780, 430, 10));
  ctx.fillStyle = '#d9d2c4'; ctx.fillRect(110, 500, 780, 430);
  for (let i = 0; i < 6; i++) {
    const y0 = 500 + i * 72, dx = g ? ((hash('vg' + i + B) % 3) - 1) * 14 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(110, y0, 780, 72); ctx.clip(); ctx.translate(dx, 0);
    // a man in an olive shirt at a lectern
    const sh = [[360, 940], [380, 840], [440, 800], [560, 800], [620, 840], [640, 940]];
    gfill(sh, '#6b6b3a', { key: 'shirt', off: [0, 0] }); gline(sh, { w: 4, key: 'shl' });
    face(500, 700, 0.75, 'zel', { hairCol: '#3a2a20' });
    const lec = sketchBox(390, 860, 220, 90, 6); gfill(lec, '#8b6b4a', { key: 'lec', off: [0, 0] }); gline(lec, { w: 4, key: 'leco' });
    ctx.restore();
  }
  ctx.restore();
  const pb = ev(t0 + 0.3, Math.max(0.5, W1('ex_selenskyj') - t0));
  gline([[130, 965], [870, 965]], { w: 4, key: 'pbb', col: '#777', second: false });
  gline([[130, 965], [lerp(130, 870, pb), 965]], { w: 6, key: 'pbr', col: SK.red, second: false });
  gfill([[130, 945], [130, 985], [160, 965]], '#ffffff', { key: 'pl', off: [0, 0] });
  const sb = ev(t0 + 4.0, 0.3);
  if (sb > 0) { bubble(760, 420, 280, 110, [-90, 50], 'vb', sb); handLetter('Gebt auf!', 760, 440, 54, { face: 'marker', key: 'vbt', reveal: sb }); }
  stamp('DEEPFAKE', CX, 720, 0.7, -0.12, t0 + 10.2, 'zk');
  handLetter('2022', 820, 1070, 54, { face: 'marker', key: 'zy' });
  doodleHero(220, 1150, 60, { key: 'hero', legs: true, mood: TT > t0 + 10.2 ? 'wow' : 'puzzled', look: [1, -0.8], arms: [-0.8, 0.8] });
  pageTag('Beispiel 3');
  caption2(['Selenskyj ruft', 'zur Kapitulation?'], ['Nein: ein', 'Deepfake-Video'], t0 + 9.8, [[1, 'Kapitulation']], [[1, 'Deepfake']]);
}

// ================= 11 OLD =================
function sOld() {
  sketchPage({ grid: 'dots' }); margins('m10');
  const t0 = W0('old');
  gpencil([[90, 1240], [420, 1234], [700, 1242], [930, 1236]], { key: 'gr', w: 3, a: 0.75 });
  // an armchair
  const ch = [[520, 1240], [520, 900], [560, 860], [800, 860], [840, 900], [840, 1240]];
  gfill(ch, '#c98d6b', { key: 'chf', a: 0.8 }); gline(ch, { w: 5, key: 'ch' });
  oldie(OLD.x, OLD.y, 1, 'old', { wow: TT > t0 + 3.5 });
  // a phone at the ear, a cord
  phoneIcon(OLD.x - 120, OLD.y + 20, 50, 110, 'oph');
  const bb = ev(t0 + 2.5, 0.3);
  if (bb > 0) { bubble(380, 520, 520, 170, [140, 70], 'ob', bb); handLetter('Oma, ich bin’s!', 380, 500, 50, { key: 'ob1', reveal: ev(t0 + 2.6, 0.3) }); handLetter('Ich brauche Geld!', 380, 565, 50, { face: 'marker', col: SK.red, key: 'ob2', reveal: ev(t0 + 3.0, 0.3) }); }
  const rb = ev(t0 + 4.5, 0.4);   // the voice behind it is a KI
  if (rb > 0) {
    ctx.save(); ctx.globalAlpha *= rb;
    const R = sketchBox(110, 860, 170, 150, 18); gfill(R, '#e7e2d6', { key: 'rbf' }); gline(R, { w: 4, key: 'rb', closed: true });
    handLetter('KI', 195, 960, 70, { face: 'marker', key: 'rbt' });
    ctx.restore();
    ctx.save(); ctx.setLineDash([12, 12]); gpencil([[280, 930], [400, 900], [OLD.x - 150, OLD.y + 40]], { key: 'rbl', w: 3, a: 0.8, part: rb }); ctx.restore();
    handLetter('KI-Stimme', 195, 1080, 42, { col: SK.graph, key: 'rbs', reveal: rb });
  }
  if (TT > t0 + 3.5) for (let i = 0; i < 2; i++) sweat(OLD.x + 110 + i * 14, OLD.y - 60 + i * 8, ((TT * 1.3 + i * 0.5) % 1), 'osw' + i);
  pageTag('Ältere');
  pageCaption(['Schockanruf mit', 'falscher KI-Stimme'], [[1, 'KI-Stimme']], { at: 0.6 });
}

// ================= 12 YOUNG =================
function sYoung() {
  sketchPage({ grid: 'dots' });
  const t0 = W0('young');
  for (let i = 0; i < 8; i++) {   // posts whooshing past
    const lane = i % 2 ? 860 : 140, y = 1250 - ((TT - E0) * 520 + i * 190) % 1000;
    gline([[lane, y + 120], [lane, y + 200]], { w: 2.5, key: 'sp' + i, col: SK.graph, second: false });
    noteCard(lane, y, (i % 3 - 1) * 0.1, 0.8, 1, 'yc' + i, i === 5 ? SK.red : SK.graph);
  }
  doodleHero(HERO_Y.x, HERO_Y.y, HERO_Y.r, { key: 'hero', legs: true, mood: TT > t0 + 4.5 ? 'wow' : 'happy', look: [0.2, 0.6], arms: [0.3, 0.3] });
  phoneIcon(HERO_Y.x, HERO_Y.y + 30, 90, 150, 'yph');
  const sh = ev(t0 + 3.0, 0.4);
  if (sh > 0) { bubble(640, 560, 280, 100, [-80, 60], 'yb', sh); handLetter('Teilen!', 640, 580, 54, { face: 'marker', key: 'ybt', reveal: sh }); }
  for (let i = 0; i < 4; i++) { const k = (TT * 0.9 + i * 0.25) % 1; if (TT > t0 + 1) { ctx.save(); ctx.globalAlpha *= 1 - k; heart(300 + i * 40, 800 - k * 260, 2.2, 'yh' + i); ctx.restore(); } }
  stamp('FAKE', 760, 900, 0.5, 0.15, t0 + 4.5, 'yk');
  pageTag('Jugendliche');
  pageCaption(['Schnell gescrollt,', 'schnell geteilt'], [[1, 'geteilt']], { at: 0.6 });
}

// ================= 13 EFFECTS =================
function sEffects() {
  sketchPage({ grid: 'dots' }); margins('m12');
  const t0 = W0('effects'), G = GAUGE;
  const arc = arcPts(G.x, G.y, G.r, Math.PI, TAU, 30);
  gline(arc, { w: 6, key: 'ga' });
  for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * Math.PI; gline([[G.x + Math.cos(a) * (G.r - 10), G.y + Math.sin(a) * (G.r - 10)], [G.x + Math.cos(a) * (G.r - 40), G.y + Math.sin(a) * (G.r - 40)]], { w: 3, key: 'gt' + i, second: false }); }
  handLetter('niedrig', G.x - G.r + 30, G.y + 50, 40, { col: SK.graph, key: 'gl' }); handLetter('hoch', G.x + G.r - 20, G.y + 50, 40, { col: SK.graph, key: 'gh' });
  handLetter('Vertrauen', G.x, G.y - G.r - 30, 60, { face: 'marker', key: 'gv' });
  const v = 1 - EZ.io(seg(TT, t0 + 0.5, W1('effects'))) * 0.92, a = Math.PI + v * Math.PI + 0.03 * Math.sin(B * 2);
  gline([[G.x, G.y], [G.x + Math.cos(a) * (G.r - 50), G.y + Math.sin(a) * (G.r - 50)]], { w: 8, key: 'gn', col: SK.red, second: false });
  gfill(loopPts(G.x, G.y, 18, 18, 0), SK.ink, { key: 'gc', off: [0, 0] });
  const items = [['Streit', 210, W0('effects') + 1.2], ['Geld weg', 500, W0('effects') + 2.4], ['Wem glauben?', 790, W0('effects') + 4.2]];
  items.forEach(([lab, x, t], i) => {
    const k = ev(t, 0.4); if (k <= 0) return;
    ctx.save(); ctx.translate(x, 1010); ctx.scale(k, k);
    if (i === 0) { face(-45, 0, 0.35, 'e1a', { wow: true }); face(45, 0, 0.35, 'e1b', { wow: true }); gline([[-12, -40], [0, -20], [-8, -10], [8, 10]], { w: 4, key: 'zz', col: SK.red, second: false }); }
    if (i === 1) { const wl = sketchBox(-60, -40, 120, 80, 10); gfill(wl, '#8b6b4a', { key: 'wl', off: [0, 0] }); gline(wl, { w: 4, key: 'wlo', closed: true }); for (let c = 0; c < 2; c++) { const k2 = (TT * 0.8 + c * 0.5) % 1; gfill(loopPts(30 + k2 * 60, -40 - k2 * 70, 16, 16, 0), SK.hilite, { key: 'cn' + c, off: [0, 0] }); } }
    if (i === 2) handLetter('?', 0, 30, 120, { face: 'marker', key: 'eq' });
    handLetter(lab, 0, 110, 42, { key: 'el' + i });
    ctx.restore();
  });
  pageTag('Folgen');
  pageCaption(['Am Ende glaubt man', 'gar nichts mehr'], [[1, 'nichts']], { at: 4.0 });
}

// ================= 14 Q&A INTRO =================
function sQAIntro() {
  sketchPage({ grid: 'ruled' });
  handLetter('Fragen', CX, 520, 120, { face: 'marker', key: 'qa1', reveal: ev(A(0.4), 0.5) });
  handLetter('& Antworten', CX, 650, 100, { face: 'marker', key: 'qa2', reveal: ev(A(0.9), 0.5) });
  highlight(300, 700, 620, 60, ev(A(1.5), 0.3), { key: 'qah' });
  const b1 = ev(A(1.8), 0.3), b2 = ev(A(2.4), 0.3);
  bubble(250, 840, 200, 170, [40, 60], 'qb1', b1); if (b1 > 0) handLetter('?', 250, 880, 110, { face: 'marker', key: 'qbq' });
  bubble(750, 840, 200, 170, [-40, 60], 'qb2', b2); if (b2 > 0) handLetter('!', 750, 880, 110, { face: 'marker', col: SK.green, key: 'qbx' });
  girl(250, 1080, 0.55, 'gq');
  doodleHero(750, 1100, 70, { key: 'hero', legs: true, mood: 'happy', look: [-1, -0.3], arms: [1.3, -0.6] });
  pageTag('Tipps');
  pageCaption(['Was kann man', 'dagegen tun?'], [[1, 'tun']], { at: 0.4 });
}

// ================= 15-18 Q&A =================
const QA = [
  { q: ['Wie erkenne ich', 'ein Deepfake?'], a: ['Augen & Hände prüfen', 'Zähne & Ränder ansehen', 'Wer hat es gepostet?'], cap: [['Genau hinschauen', 'und Quelle suchen'], [[0, 'hinschauen']]], icon: 'lens' },
  { q: ['Wie schützen sich', 'junge Leute?'], a: ['Nicht sofort teilen', 'Quelle prüfen', 'Bilder-Rückwärtssuche', 'Correctiv & dpa-Faktencheck'], cap: [['Erst checken,', 'dann teilen'], [[0, 'checken']]], icon: null },
  { q: ['Wie schützen wir', 'ältere Menschen?'], a: ['Darüber reden', 'Familien-Codewort', 'Auflegen, selbst anrufen'], cap: [['Codewort ausmachen,', 'selbst zurückrufen'], [[0, 'Codewort']]], icon: 'heart' },
  { q: ['Fake geteilt –', 'was jetzt?'], a: ['Beitrag löschen', 'Korrektur posten', 'Anderen Bescheid sagen'], cap: [['Fehler passieren –', 'korrigieren!'], [[1, 'korrigieren']]], icon: 'eraser' },
];
function sQA(n) {
  sketchPage({ grid: 'ruled' });
  const d = QA[n], qid = 'q' + (n + 1), aid = 'a' + (n + 1), tq = W0(qid), ta = W0(aid), da = W1(aid) - ta;
  // the question bubble with the questioner
  gfill(QB, '#fffdf6', { key: 'qbf' }); gline(QB, { closed: true, key: 'qb', w: 5 });
  handLetter('F:', 140, 480, 60, { face: 'marker', col: SK.red, key: 'qf' });
  d.q.forEach((l, i) => handLetter(l, 540, 480 + i * 70, 62, { face: 'marker', key: 'qq' + n + i, reveal: ev(tq + i * 0.5, 0.6) }));
  girl(860, 330, 0.42, 'gq' + n, { wow: TT < ta });
  // the answer card
  const ck = ev(ta - 0.2, 0.4);
  if (ck > 0) {
    gfill(QCARD, '#fffdf6', { key: 'acf', a: clamp(ck * 2) }); gline(QCARD, { closed: true, key: 'ac', w: 5, part: ck });
    handLetter('A:', 140, 740, 60, { face: 'marker', col: SK.green, key: 'af' });
    d.a.forEach((l, i) => {
      const t = ta + da * (i + 0.15) / d.a.length, y = 760 + i * (d.a.length > 3 ? 105 : 130);
      handLetter(l, 230, y + 10, d.a.length > 3 ? 50 : 56, { align: 'left', key: 'aa' + n + i, reveal: ev(t, 0.5) });
      checkMark(195, y - 10, 0.75, ev(t + 0.4, 0.2), SK.green, 'ack' + n + i);
    });
    // a little icon in the card corner
    const ix = 820, iy = 1120, ik = ev(ta + 0.5, 0.4);
    if (ik > 0) {
      if (d.icon === 'lens') { gline(loopPts(ix, iy - 20, 48, 48, 0.05), { w: 6, key: 'il' }); gline([[ix + 34, iy + 14], [ix + 70, iy + 50]], { w: 12, key: 'ilh', second: false }); }
      if (d.icon === 'phone') { phoneIcon(ix, iy - 10, 70, 120, 'ip'); checkMark(ix, iy - 10, 0.7, ik, SK.green, 'ipc'); }
      if (d.icon === 'heart') heart(ix, iy - 20, 4, 'ih');
      if (d.icon === 'eraser') { ctx.save(); ctx.translate(ix, iy - 20); ctx.rotate(-0.5); const er = sketchBox(-60, -25, 120, 50, 8); gfill(er, '#ef9aa6', { key: 'ie', off: [0, 0] }); gline(er, { w: 4, key: 'ieo', closed: true }); ctx.restore(); }
    }
  }
  doodleHero(160, 1180, 52, { key: 'hero', legs: true, mood: TT > ta ? 'happy' : 'puzzled', look: [1, -0.6], arms: TT > ta ? [1.2, -0.5] : [-0.8, 0.8] });
  pageTag('Frage ' + (n + 1));
  pageCaption(d.cap[0], d.cap[1], { at: ta - E0 + 0.6 });
}

// ================= 19 CHECK =================
function sCheck() {
  sketchPage({ grid: 'ruled' });
  const t0 = W0('check'), d = W1('check') - t0;
  gfill(CARD_L, '#fffdf6', { key: 'clf' }); gline(CARD_L, { closed: true, w: 5, key: 'cl' });
  handLetter('Checkliste', 450, 700, 64, { face: 'marker', key: 'clt' });
  underline(300, 600, 725, { col: SK.red, w: 5, key: 'clu', part: ev(A(0.3), 0.3) });
  const its = ['Wer sagt das?', 'Gibt es eine Quelle?', 'Berichten andere?', 'Erst dann teilen!'];
  its.forEach((s, i) => {
    const y = 820 + i * 95, t = t0 + d * (0.2 + i * 0.2);
    gline(sketchBox(150, y - 50, 56, 56, 8), { w: 4, key: 'box' + i });
    handLetter(s, 235, y, 54, { align: 'left', key: 'it' + i, reveal: ev(t - 0.5, 0.4) });
    checkMark(180, y - 22, 0.85, ev(t, 0.2), SK.green, 'ck' + i);
  });
  const ly = LENS.y + 120 * EZ.io(seg(TT, t0 + 1, W1('check')));
  ctx.save(); ctx.globalAlpha = 0.28; gfill(loopPts(LENS.x, ly, LENS.r, LENS.r, 0), SK.hilite, { key: 'lensf', off: [0, 0] }); ctx.restore();
  gline(loopPts(LENS.x, ly, LENS.r, LENS.r, 0.06), { w: 8, key: 'lens' });
  gline([[LENS.x + LENS.r * 0.72, ly + LENS.r * 0.72], [LENS.x + LENS.r * 1.3, ly + LENS.r * 1.3]], { w: 18, key: 'handle', second: false });
  doodleHero(840, 1210, 54, { key: 'hero', legs: true, mood: 'calm', look: [-1, -1], arms: [-0.6, 0.6] });
  pageTag('Merke');
  pageCaption(['Erst prüfen,', 'dann teilen!'], [[0, 'prüfen']], { at: 0.5 });
}

// ================= 20 OUTRO =================
function sOutro() {
  sketchPage({ grid: 'dots' }); margins('m19');
  const t0 = W0('outro');
  const hop = Math.max(Math.sin(Math.PI * ev(t0 + 1.6, 0.3)), Math.sin(Math.PI * ev(t0 + 2.4, 0.3)));
  doodleHero(CX, 900 - 70 * hop, 150, { key: 'hero', legs: true, mood: TT > t0 + 1.6 ? 'happy' : 'calm', look: [0, -0.5], sy: 1 + 0.06 * hop, sx: 1 - 0.04 * hop, arms: TT > t0 + 1.6 ? [1.3, 1.3] : [-0.6, 0.6] });
  const [x0, x1] = handLetter('Bleib kritisch!', CX, 560, 110, { face: 'marker', key: 'bk', reveal: ev(t0 + 1.4, 0.7) });
  highlight(x0 + 160, x1, 530, 60, ev(t0 + 2.1, 0.3), { key: 'bkh' });
  underline(x0, x1, 600, { col: SK.red, w: 7, key: 'bku', part: ev(t0 + 2.3, 0.3) });
  for (let i = 0; i < 5; i++) sparkle(240 + i * 130, 760 - (i % 2) * 60, 34, ev(t0 + 1.6 + i * 0.12, 0.6), 'osp' + i);
  for (let i = 0; i < 3; i++) doodleBird(820 - 60 * (TT - E0) + i * 64, 420 + i * 30, 1.2, (B + i) % 2, 'ob' + i);
  pageTag('Ende');
  pageCaption(['Denk nach,', 'bevor du teilst'], [[1, 'teilst']], { at: 0.4 });
}
