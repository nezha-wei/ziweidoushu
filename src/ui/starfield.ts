/**
 * 分层动态背景（Canvas）：纸白底上的金墨浮尘。
 * 缓漂微粒 + 偶发金色流星 + 呼吸光晕；单 rAF 循环，
 * pixelRatio 上限 2，页面隐藏时暂停，prefers-reduced-motion 时静态绘制一次。
 */
interface Star {
  x: number; y: number; r: number; a: number; tw: number; ph: number; vx: number; vy: number; hue: number;
}
interface Meteor {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
}

const HUES = [40, 8, 265, 215]; // 金 / 朱砂 / 紫微 / 黛蓝

export function mountStarfield(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let w = 0, hgt = 0, dpr = 1;
  let stars: Star[] = [];
  let meteors: Meteor[] = [];
  let raf = 0;
  let last = 0;
  let meteorTimer = 3;
  let running = true;

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    hgt = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(hgt * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${hgt}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(220, Math.floor((w * hgt) / 6500));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * hgt,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.22 + 0.1,
      tw: Math.random() * 1.5 + 0.4,
      ph: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 2.2,
      vy: (Math.random() - 0.5) * 1.4,
      hue: HUES[Math.floor(Math.random() * HUES.length)],
    }));
    if (reduced) drawFrame(0, 0);
  }

  function drawFrame(t: number, dt: number): void {
    ctx!.clearRect(0, 0, w, hgt);
    // 星点
    for (const st of stars) {
      if (!reduced) {
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        if (st.x < -4) st.x = w + 4; else if (st.x > w + 4) st.x = -4;
        if (st.y < -4) st.y = hgt + 4; else if (st.y > hgt + 4) st.y = -4;
      }
      const alpha = reduced ? st.a : st.a * (0.6 + 0.4 * Math.sin(t * st.tw + st.ph));
      ctx!.beginPath();
      ctx!.fillStyle = `hsla(${st.hue}, 45%, 42%, ${alpha.toFixed(3)})`;
      ctx!.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx!.fill();
      if (st.r > 1.2) {
        ctx!.beginPath();
        ctx!.fillStyle = `hsla(${st.hue}, 50%, 55%, ${(alpha * 0.3).toFixed(3)})`;
        ctx!.arc(st.x, st.y, st.r * 3.2, 0, Math.PI * 2);
        ctx!.fill();
      }
    }
    // 流星
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life += dt;
      const k = 1 - m.life / m.max;
      if (k <= 0) { meteors.splice(i, 1); continue; }
      const tail = 90 * k;
      const grad = ctx!.createLinearGradient(m.x, m.y, m.x - m.vx * 0.14 * tail / 6, m.y - m.vy * 0.14 * tail / 6);
      grad.addColorStop(0, `rgba(200, 160, 58, ${0.7 * k})`);
      grad.addColorStop(1, 'rgba(200, 160, 58, 0)');
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 1.6;
      ctx!.beginPath();
      ctx!.moveTo(m.x, m.y);
      ctx!.lineTo(m.x - m.vx * 0.02 * tail, m.y - m.vy * 0.02 * tail);
      ctx!.stroke();
    }
  }

  function loop(now: number): void {
    raf = requestAnimationFrame(loop);
    if (!running) { last = now; return; }
    const t = now / 1000;
    const dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    meteorTimer -= dt;
    if (meteorTimer <= 0 && meteors.length < 2) {
      meteorTimer = 4 + Math.random() * 7;
      const fromLeft = Math.random() > 0.5;
      meteors.push({
        x: fromLeft ? Math.random() * w * 0.4 : w * (0.6 + Math.random() * 0.4),
        y: Math.random() * hgt * 0.3,
        vx: (fromLeft ? 1 : -1) * (260 + Math.random() * 180),
        vy: 150 + Math.random() * 120,
        life: 0,
        max: 1.1,
      });
    }
    drawFrame(t, dt);
  }

  function onVis(): void {
    running = !document.hidden;
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVis);
  if (!reduced) raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
  };
}