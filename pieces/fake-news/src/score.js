  // SCORE — Fake News & Deepfakes: a soft pad per era under the voice, plucks on the new scene, hits on the stamps
  const CH = [['D3', 'A3', 'E4'], ['B2', 'Fs3', 'D4'], ['G2', 'D3', 'B3'], ['A2', 'E3', 'Cs4']];
  to = 'm';
  for (let i = 0; i < ERA_T.length - 1; i++) {
    const t0 = ERA_T[i], t1 = ERA_T[i + 1], last = i === ERA_T.length - 2, pre = i === ERA_T.length - 3;
    pad(t0, pre ? t1 - 0.4 : t1 + 0.1, last ? ['D2', 'A2', 'Fs3', 'E4'] : CH[i % 4], last ? 0.06 : 0.03, { type: 'triangle', cut: 900, att: 0.3, rel: 0.3, send: 0.3 });
    if (i > 0) pluck(t0 + 0.05, nz(['D5', 'Fs5', 'A5', 'E5'][i % 4]), 0.12, (i % 2 ? 0.3 : -0.3), 0.4, 3500, 0.3);
  }
  const tE = W0('outro') + 1.6;
  [['D4', 0], ['Fs4', 0], ['A4', 0], ['D5', E16], ['A5', E8]].forEach(([n, dt]) => pluck(tE + dt, nz(n), 0.3, 0, 1.0, 4500, 0.5));
  sub(tE, 0.35);
  chime(tE + 0.8, [nz('D5'), nz('A5'), nz('E6')], 0.06, 0);
  to = 's';
  for (const t of [ERA_T[2] + 3.4, ERA_T[5] + 3.6, W0('ex_pope') + 8.6, W0('ex_pentagon') + 3.2, W0('ex_selenskyj') + 10.2, W0('young') + 4.5]) noiseHit(t, 0.25, 'lowpass', 400, 1, 0.12, 0);
  for (let i = 1; i < ERA_T.length - 1; i++) sweep(ERA_T[i] - 0.4, ERA_T[i], 0.008, 500, 2600, 0);
  for (let i = 0; i < 10; i++) noiseHit(0.4 + i * E16, 0.05, 'bandpass', 3600 + (i % 3) * 300, 2, 0.04, -0.2);
