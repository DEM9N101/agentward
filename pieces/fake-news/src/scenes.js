// =====================================================================
//  SCENES — Fake News & Deepfakes (sketchbook). World 1080x1920; TT on 2s.
// =====================================================================
const PH0 = sketchBox(370, 420, 340, 600, 40);   // era 0 phone
const PH1 = sketchBox(400, 480, 280, 500, 36);   // era 1 phone
const FR_L = sketchBox(110, 500, 350, 470, 22);  // era 2 left portrait
const FR_R = sketchBox(540, 500, 350, 470, 22);  // era 2 right portrait
const OLD = { x: 720, y: 790, r: 115 };
const LENS = { x: 700, y: 600, r: 120 };

function bubble(x, y, w, h, tail, key, part) {      // a speech bubble, written on
  const P = sketchBox(x - w / 2, y - h / 2, w, h, 30, 0);
  gfill(P, SK.sheet, { off: [3, 3], key: key + 'f', a: clamp(part * 3) });
  gline(P, { closed: true, w: 4, key: key + 'o', part });
  gline([[x + tail[0] * 0.3, y + h / 2], [x + tail[0], y + h / 2 + tail[1]], [x + tail[0] * 0.55, y + h / 2]], { w: 4, key: key + 't', second: false, part: seg(part, 0.7, 1) });
}
function face(cx, cy, s, key, o = {}) {              // a plain ink portrait face (not the hero)
  const head = loopPts(cx, cy, 95 * s, 120 * s, 0.05);
  gfill(head, '#f6dfc6', { key: key + 'sk', a: o.a ?? 1 });
  gline(head, { w: 5, key: key + 'h', part: o.part ?? 1 });
  gpencil([[cx - 100 * s, cy - 40 * s], [cx - 80 * s, cy - 120 * s], [cx, cy - 150 * s], [cx + 80 * s, cy - 120 * s], [cx + 100 * s, cy - 40 * s]], { key: key + 'hair', w: 4, a: 0.9, part: o.part ?? 1 });
  ghatchHair(cx, cy, s, key);
  for (const sx of [-1, 1]) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(cx + sx * 34 * s, cy - 10 * s, 9 * s, 12 * s, 0, 0, TAU); ctx.fill(); }
  gline([[cx, cy], [cx - 8 * s, cy + 30 * s], [cx + 6 * s, cy + 34 * s]], { w: 3.5, key: key + 'n', second: false });
  gline(arcPts(cx, cy + 40 * s, 36 * s, Math.PI * 0.2, Math.PI * 0.8, 8), { w: 4, key: key + 'm', second: false });
  if (o.glasses) for (const sx of [-1, 1]) gline(loopPts(cx + sx * 34 * s, cy - 10 * s, 26 * s, 22 * s, 0.05), { w: 3.5, key: key + 'g' + sx });
  if (o.glasses) gline([[cx - 8 * s, cy - 12 * s], [cx + 8 * s, cy - 12 * s]], { w: 3, key: key + 'gb', second: false });
}
function ghatchHair(cx, cy, s, key) {
  const P = [[cx - 100 * s, cy - 40 * s], [cx - 80 * s, cy - 120 * s], [cx, cy - 150 * s], [cx + 80 * s, cy - 120 * s], [cx + 100 * s, cy - 40 * s], [cx, cy - 100 * s]];
  ctx.save(); gclip(P); ghatch(cx - 110 * s, cy - 160 * s, cx + 110 * s, cy - 30 * s, { ang: -0.8, gap: 8, col: SK.graph, w: 2, a: 0.6, key: key + 'hh' }); ctx.restore();
}
function penOn(P, t0, d) { if (TT >= t0 && TT < t0 + d + 0.1) { const tip = writeEnd(closeP(P), ev(t0, d)); pencilTool(tip[0], tip[1], -0.75 + 0.08 * Math.sin(B * 1.7), 1); } }

// ---- era 0: the phone full of headlines
function scenePhone() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'dots' });
  [[110, 560, 0], [150, 860, 1]].forEach(([x, y, i]) => doodleStar(x, y, 22 + 6 * ((B + i) % 3 === 0), 'ms' + i, { w: 3.2 }));
  const pd = ev(cu.phone, 0.8);
  gfill(PH0, SK.sheet, { key: 'ph0f', a: clamp(pd * 2) });
  gpencil(PH0, { closed: true, key: 'ph0c', w: 2.6, a: 0.7, part: pd });
  gline(PH0, { closed: true, key: 'ph0', w: 6, part: ev(cu.phone + 0.6, 0.4) });
  gline([[500, 450], [580, 450]], { w: 5, key: 'spk', second: false, part: ev(cu.phone + 1, 0.2) });
  const hd = ev(cu.head, 0.5);
  if (hd > 0) {
    handLetter('SCHOCK!', 540, 560, 66, { face: 'marker', key: 'schock', reveal: hd });
    gline(sketchBox(410, 600, 260, 170, 10), { w: 4, key: 'pic', part: ev(cu.head + 0.3, 0.3) });
    graphiteScribble(540, 685, 200, 120, 'picsc');
    for (let i = 0; i < 4; i++) gpencil([[410, 820 + i * 38], [410 + [250, 220, 240, 150][i], 820 + i * 38]], { key: 'ln' + i, w: 3, a: 0.8, part: ev(cu.head + 0.6 + i * 0.12, 0.15) });
  }
  penOn(PH0, cu.phone, 0.8);
  const pg = ev(cu.ping, 0.2);
  if (pg > 0) { bubble(780, 380, 260, 100, [-60, 40], 'b0', pg); handLetter('Eilmeldung', 780, 398, 44, { key: 'eil', reveal: ev(cu.ping + 0.1, 0.3) }); }
  const hop = Math.sin(Math.PI * ev(cu.ping, 0.25)), wow = TT >= cu.ping;
  doodleHero(210, 1110 - 40 * hop, 80, { key: 'hero', legs: true, mood: wow ? 'wow' : 'calm', look: [1, -0.6], arms: [-0.6, 0.6] });
  if (wow) handLetter('!', 290, 980 - 20 * hop, 90, { face: 'marker', key: 'bang0', reveal: ev(cu.ping, 0.08) });
  pageTag('Medien');
  pageCaption(['Jeden Tag', 'tausend News'], [[1, 'News']]);
}

// ---- era 1: a lie gets shared
const CARDS = [[150, 470, -0.15], [860, 560, 0.12], [130, 820, 0.1], [870, 900, -0.1], [190, 1150, -0.08], [820, 1170, 0.14]];
function sceneShare() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'dots' });
  gfill(PH1, SK.sheet, { key: 'ph1f' });
  gline(PH1, { closed: true, key: 'ph1', w: 6 });
  handLetter('SCHOCK!', 540, 600, 56, { face: 'marker', key: 'schock1' });
  graphiteScribble(540, 720, 180, 110, 'picsc1');
  for (let i = 0; i < 3; i++) gpencil([[440, 830 + i * 36], [440 + [200, 170, 120][i], 830 + i * 36]], { key: 'l1' + i, w: 3, a: 0.8 });
  CARDS.forEach(([x, y, r], i) => {
    const t0 = cu.spread + i * E8 * 1.5, k = ev(t0, 0.35);
    if (k <= 0) return;
    const sx = x < 540 ? 400 : 680, sy = clamp(y, 520, 940);
    arrowPencil([[sx, sy], [lerp(sx, x, 0.5), lerp(sy, y, 0.5) - 30], [x + (x < 540 ? 70 : -70), y]], k, { key: 'ar' + i });
    if (k > 0.7) noteCard(x, y, r, 0.85, ev(t0 + 0.25, 0.3), 'nc' + i, SK.graph);
  });
  const fk = ev(cu.fake, 0.15);
  if (fk > 0) inkStamp('FAKE', 540, 700, 0.75 * (1.4 - 0.4 * fk), -0.2, fk, 'fake');
  const sh = TT > cu.spread ? 1 : 0;
  doodleHero(500, 1150, 70, { key: 'hero', legs: true, mood: sh ? 'puzzled' : 'calm', look: [0, -1], arms: [-0.9, 0.9] });
  if (sh) for (let i = 0; i < 2; i++) sweat(420 - i * 14, 1090 + i * 8, ((TT * 1.3 + i * 0.5) % 1), 'sw' + i);
  pageTag('Fake News');
  pageCaption(['Lügen teilen sich', 'schneller'], [[1, 'schneller']]);
}

// ---- era 2: real or AI?
function sceneDeep() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'dots' });
  for (const [P, k] of [[FR_L, 'frl'], [FR_R, 'frr']]) { gfill(P, '#fffdf6', { key: k + 'f' }); gline(P, { closed: true, key: k, w: 5 }); }
  const fp = ev(cu.faces, 0.8);
  if (fp > 0) {
    face(285, 740, 1, 'fl', { part: fp, a: clamp(fp * 2) });
    // the right face: the same face, but on the glitch its slices slip
    const g = TT >= cu.glitch ? 1 : 0;
    ctx.save(); gclip(FR_R);
    for (let i = 0; i < 8; i++) {
      const y0 = 510 + i * 58, dx = g ? ((hash('gl' + i + B) % 3) - 1) * 18 : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(540, y0, 350, 58); ctx.clip(); ctx.translate(dx, 0);
      face(715, 740, 1, 'fr', { part: fp, a: clamp(fp * 2) });
      ctx.restore();
    }
    if (g) for (let i = 0; i < 5; i++) gpencil([[560, 560 + ((hash('gs' + i + B) % 400))], [870, 560 + ((hash('gs' + i + B) % 400))]], { key: 'gsl' + i, w: 2, a: 0.5, passes: 1 });
    ctx.restore();
  }
  handLetter('echt?', 285, 1040, 56, { key: 'el', reveal: ev(cu.faces + 0.8, 0.3) });
  if (TT < cu.ki) handLetter('echt?', 715, 1040, 56, { key: 'er', reveal: ev(cu.faces + 1.0, 0.3) });
  const ki = ev(cu.ki, 0.15);
  if (ki > 0) { inkStamp('KI', 715, 1030, 0.55 * (1.4 - 0.4 * ki), 0.12, ki, 'kis'); checkMark(285, 1110, 0.9, ev(cu.ki + 0.5, 0.2)); }
  doodleHero(500, 1180, 60, { key: 'hero', legs: true, mood: TT >= cu.ki ? 'wow' : 'puzzled', look: [TT >= cu.ki ? 1 : -1, -0.6], arms: [-0.9, 0.9] });
  if (TT < cu.ki) handLetter('?', 570, 1090 + 5 * Math.sin(B * 0.9), 80, { col: SK.graph, key: 'q2', jit: 1.5 });
  pageTag('Deepfakes');
  pageCaption(['Echt oder KI?'], [[0, 'KI']]);
}

// ---- era 3: young and old both fall for it
function sceneAge() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'dots' });
  gpencil([[90, 1240], [420, 1234], [700, 1242], [930, 1236]], { key: 'gr3', w: 3, a: 0.75 });
  // the old person: ink face with glasses, a body, a cane
  const op = ev(cu.old, 0.6);
  gfill(loopPts(OLD.x, OLD.y, OLD.r, OLD.r, 0), '#f6dfc6', { key: 'oldf' });
  gline(loopPts(OLD.x, OLD.y, OLD.r, OLD.r, 0.06), { key: 'oldh', w: 5 });
  gpencil([[OLD.x - 110, OLD.y - 30], [OLD.x - 70, OLD.y - 110], [OLD.x, OLD.y - 125], [OLD.x + 70, OLD.y - 110], [OLD.x + 110, OLD.y - 30]], { key: 'oldhair', w: 3, a: 0.7 });
  for (const sx of [-1, 1]) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(OLD.x + sx * 38, OLD.y - 5, 8, TT >= cu.fall ? 14 : 10, 0, 0, TAU); ctx.fill();
    gline(loopPts(OLD.x + sx * 38, OLD.y - 5, 28, 24, 0.05), { w: 3.5, key: 'og' + sx, part: op }); }
  gline([[OLD.x - 10, OLD.y - 8], [OLD.x + 10, OLD.y - 8]], { w: 3, key: 'ogb', second: false, part: op });
  if (TT >= cu.fall) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(OLD.x, OLD.y + 55, 14, 18, 0, 0, TAU); ctx.fill(); }
  else gline(arcPts(OLD.x, OLD.y + 30, 36, Math.PI * 0.2, Math.PI * 0.8, 8), { w: 4, key: 'om', second: false });
  const body = [[OLD.x - 90, 1236], [OLD.x - 70, OLD.y + 140], [OLD.x + 70, OLD.y + 140], [OLD.x + 90, 1236]];
  gfill(body, SK.sheet, { key: 'obf', a: clamp(op * 2) });
  gline(body, { w: 5, key: 'ob', part: op });
  gline([[OLD.x + 150, 1238], [OLD.x + 140, OLD.y + 200], [OLD.x + 110, OLD.y + 180]], { w: 5, key: 'cane', second: false, part: seg(op, 0.4, 1) });
  // the young one: the hero with a phone
  const yp = ev(cu.young, 0.3), hop = Math.sin(Math.PI * ev(cu.fall, 0.25));
  if (yp > 0) {
    doodleHero(270, 1000 - 50 * hop, 90, { key: 'hero', legs: true, mood: TT >= cu.fall ? 'wow' : 'calm', look: [0.6, 0.3], arms: [0.2, 0.2] });
    gfill(sketchBox(300, 950 - 50 * hop, 60, 100, 10), SK.sheet, { key: 'yph', off: [0, 0] });
    gline(sketchBox(300, 950 - 50 * hop, 60, 100, 10), { w: 4, key: 'ypho' });
  }
  const fb = ev(cu.fall, 0.3);
  if (fb > 0) {
    bubble(250, 680, 280, 110, [30, 50], 'b3a', fb); handLetter('Krass!', 250, 700, 56, { key: 'kr', reveal: ev(cu.fall + 0.15, 0.3) });
    bubble(690, 540, 320, 110, [20, 50], 'b3b', ev(cu.fall + 0.5, 0.3)); handLetter('Unglaublich!', 690, 560, 48, { key: 'ug', reveal: ev(cu.fall + 0.65, 0.3) });
  }
  pageTag('Alle');
  pageCaption(['Jung und Alt', 'fallen drauf rein'], [[0, 'Jung und Alt']]);
}

// ---- era 4: check first, then share
function sceneCheck() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'ruled' });
  const card = sketchBox(130, 640, 640, 420, 18);
  gfill(card, '#fffdf6', { key: 'cardf' }); gline(card, { closed: true, w: 5, key: 'card' });
  [['Quelle?', cu.c1], ['Wer sagt das?', cu.c2], ['Andere Seiten?', cu.c3]].forEach(([s, t], i) => {
    const y = 760 + i * 115;
    gline(sketchBox(170, y - 50, 60, 60, 8), { w: 4, key: 'box' + i });
    handLetter(s, 260, y, 58, { align: 'left', key: 'it' + i, reveal: ev(t - 0.6, 0.4) });
    checkMark(202, y - 22, 0.9, ev(t, 0.2), SK.green, 'ck' + i);
  });
  // the lens (bridge counterpart): moves down the list
  const ly = LENS.y + 60 * EZ.io(seg(TT, cu.c1, cu.c3));
  ctx.save(); ctx.globalAlpha = 0.25; gfill(loopPts(LENS.x, ly, LENS.r, LENS.r, 0), SK.hilite, { key: 'lensf', off: [0, 0] }); ctx.restore();
  gline(loopPts(LENS.x, ly, LENS.r, LENS.r, 0.06), { w: 8, key: 'lens' });
  gline([[LENS.x + LENS.r * 0.72, ly + LENS.r * 0.72], [LENS.x + LENS.r * 1.35, ly + LENS.r * 1.35]], { w: 18, key: 'handle', second: false });
  const hop = Math.sin(Math.PI * ev(cu.hop, 0.3));
  doodleHero(500, 1170 - 60 * hop, 64, { key: 'hero', legs: true, mood: TT >= cu.hop ? 'happy' : 'calm', look: [0.5, -1], sy: 1 + 0.06 * hop, arms: TT >= cu.hop ? [1.2, 1.2] : [-0.7, -0.7] });
  if (TT >= cu.hop) for (let i = 0; i < 3; i++) sparkle(380 + i * 120, 1060 - (i % 2) * 40, 30, ev(cu.hop + i * 0.1, 0.5), 'sp' + i);
  pageTag('Tipp');
  pageCaption(['Erst prüfen,', 'dann teilen!'], [[0, 'prüfen']]);
}
