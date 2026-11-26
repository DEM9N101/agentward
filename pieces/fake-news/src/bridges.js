// ERAS, CAMERAS, BRIDGES — Fake News & Deepfakes
const ERA_BG = ['#f2ead8', '#efe3c4', '#ece6d6', '#f2ead8', '#efe8d2'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 1.4, 2.4, { z: 1.15, p: [540, 700], to: [540, 700] }, 4.2, 5.4);
  if (era === 1) return push(t, 6.6, 7.4, { z: 1.12, p: [540, 720], to: [540, 760] }, 7.6, 8.6);
  if (era === 2) return push(t, 14.3, 15.3, { z: 1.12, p: [715, 760], to: [600, 780] }, 16.6, 17.6);
  if (era === 4) return push(t, 28.3, 29.3, { z: 1.08, p: [500, 1000], to: [500, 960] });
  return null;
}
const BRIDGES = [
  { tc: 6, A: () => ({ P: PH0, c: SK.sheet }), B: () => ({ P: PH1, c: SK.sheet }) },
  { tc: 12, A: () => ({ P: PH1, c: SK.sheet }), B: () => ({ P: FR_L, c: SK.sheet }) },
  { tc: 18, A: () => ({ P: FR_R, c: '#f6dfc6' }), B: () => ({ P: loopPts(OLD.x, OLD.y, OLD.r, OLD.r, 0, 0, 40), c: '#f6dfc6' }) },
  { tc: 24, A: () => ({ P: loopPts(OLD.x, OLD.y, OLD.r, OLD.r, 0, 0, 40), c: '#f6dfc6' }), B: () => ({ P: loopPts(LENS.x, LENS.y, LENS.r, LENS.r, 0, 0, 40), c: SK.hilite }) },
];
