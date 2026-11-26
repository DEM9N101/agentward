// ERAS, CAMERAS, BRIDGES — Fake News & Deepfakes
const ERA_BG = ERA_IDS.map((_, i) => ['#f2ead8', '#efe3c4', '#ece6d6'][i % 3]);
function pieceCam(era, t) {
  const id = ERA_IDS[era];
  if (id === 'ex_pope') return push(t, W0('ex_pope') + 8.4, W0('ex_pope') + 9.4, { z: 1.12, p: [500, 760], to: [500, 760] });
  if (id === 'ex_pentagon') return push(t, W0('ex_pentagon') + 1, W0('ex_pentagon') + 3, { z: 1.08, p: [600, 760], to: [560, 760] }, W0('ex_pentagon') + 5.5, W0('ex_pentagon') + 6.5);
  if (id === 'real') return push(t, ERA_T[5] + 2.4, ERA_T[5] + 3.4, { z: 1.08, p: [500, 760], to: [500, 760] });
  return null;
}
const hb = (x, y, r) => loopPts(x, y, r, r, 0, 0, 40);
const SHAPES = [
  [PH_S, PH, SK.sheet], [PH, NP, SK.sheet], [NP, CARD0, SK.sheet], [CARD0, KB, '#e7e2d6'], [FACE_OV, FR_R, SKIN],
  [FR_R, CORK_M, '#fffdf6'], [CORK_M, PF, '#fffdf6'], [PF, PF, '#fffdf6'], [PF, VID, '#fffdf6'], [VID, hb(OLD.x, OLD.y, OLD.r), SKIN],
  [hb(OLD.x, OLD.y, OLD.r), hb(HERO_Y.x, HERO_Y.y, HERO_Y.r), SK.terra], [hb(HERO_Y.x, HERO_Y.y, HERO_Y.r), hb(GAUGE.x, GAUGE.y, GAUGE.r), SK.sheet],
  [hb(GAUGE.x, GAUGE.y, GAUGE.r), hb(250, 840, 100), SK.sheet], [hb(250, 840, 100), QB, '#fffdf6'], [QB, QB, '#fffdf6'], [QB, QB, '#fffdf6'], [QB, QB, '#fffdf6'],
  [QB, CARD_L, '#fffdf6'], [hb(LENS.x, LENS.y + 120, LENS.r), hb(CX, 900, 150), SK.terra],
];
const BRIDGES = SHAPES.map(([a, b, c], i) => ({ tc: ERA_T[i + 1], A: () => ({ P: a, c }), B: () => ({ P: b, c }) }));
