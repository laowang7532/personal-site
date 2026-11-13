/* ============================================================
   main.js · 零依赖
   1) 翻页加载  2) 背景纹络  3) 光标  4) 滚动入场  5) 贴纸互动
   ============================================================ */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------------- 1. 翻页加载 ---------------- */
  const loader = document.getElementById('loader');
  const sheetA = loader.querySelector('.sheet-a');
  const sheetB = loader.querySelector('.sheet-b');

  document.body.classList.add('loading');

  function boot() {
    if (reduce) { finishLoader(); return; }
    setTimeout(() => sheetA.classList.add('flip-out'), 1050);
    setTimeout(() => sheetB.classList.add('flip-out'), 1520);
    setTimeout(finishLoader, 2150);
    setTimeout(finishLoader, 5000); // 兜底
  }

  let finished = false;
  function finishLoader() {
    if (finished) return;
    finished = true;
    loader.classList.add('done');
    document.body.classList.remove('loading');
    document.getElementById('veins').classList.add('in');
    startReveal();
    startVeins();
  }

  /* ---------------- 2. 背景纹络 ---------------- */
  const canvas = document.getElementById('veins');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let curves = [];
  let veinsOn = false;

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildCurves() {
    const count = W < 700 ? 7 : 13;
    curves = [];
    for (let i = 0; i < count; i++) {
      const pts = [];
      const steps = 26;
      const startY = H * (0.08 + Math.random() * 0.84);
      const amp = 40 + Math.random() * 130;
      const freq = 1 + Math.random() * 2.4;
      const phase = Math.random() * Math.PI * 2;
      const drift = (Math.random() - 0.5) * 180;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = -60 + t * (W + 120);
        const y = startY
          + Math.sin(t * Math.PI * freq + phase) * amp
          + Math.sin(t * Math.PI * freq * 2.7 + phase) * amp * 0.22
          + t * drift;
        pts.push([x, y]);
      }
      curves.push({
        pts,
        delay: 260 + Math.random() * 1500,
        dur: 2600 + Math.random() * 2600,
        alpha: 0.03 + Math.random() * 0.045,
        hot: Math.random() < 0.22,
        born: 0
      });
    }
  }

  function drawCurve(c, progress) {
    const pts = c.pts;
    const total = Math.max(1, Math.floor((pts.length - 1) * progress));
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= total; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
    ctx.strokeStyle = c.hot
      ? 'rgba(234,88,12,' + (c.alpha * 1.9).toFixed(3) + ')'
      : 'rgba(242,239,233,' + c.alpha.toFixed(3) + ')';
    ctx.lineWidth = c.hot ? 1.1 : 0.8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function startVeins() {
    if (veinsOn) return;
    veinsOn = true;
    sizeCanvas();
    buildCurves();
    if (reduce) {
      curves.forEach(c => drawCurve(c, 1));
      return;
    }
    requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!now) now = performance.now();
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const c of curves) {
      if (!c.born) c.born = now + c.delay;
      const p = (now - c.born) / c.dur;
      if (p <= 0) { alive = true; continue; }
      const eased = 1 - Math.pow(1 - Math.min(p, 1), 2.2);
      drawCurve(c, eased);
      if (p < 1) alive = true;
    }
    if (alive) requestAnimationFrame(loop);
  }

  let rt;
  window.addEventListener('resize', () => {
    if (!veinsOn) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      sizeCanvas();
      buildCurves();
      curves.forEach(c => { c.born = performance.now(); });
      requestAnimationFrame(loop);
    }, 250);
  });

  /* ---------------- 3. 自定义光标 ---------------- */
  const cursor = document.getElementById('cursor');
  if (!isTouch) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('on');
    });
    (function follow() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(follow);
    })();
    document.querySelectorAll('a, button, .tile, .sticker').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
    });
  }

  /* ---------------- 4. 时钟 ---------------- */
  const clock = document.getElementById('clock');
  function tick() {
    const d = new Date();
    clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tick();
  setInterval(tick, 20000);

  /* ---------------- 5. 滚动入场 ---------------- */
  function startReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) {
          const delay = Number(en.target.dataset.delay || 0) + i * 70;
          setTimeout(() => en.target.classList.add('in'), delay);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));

    // hero 首屏按顺序入场
    document.querySelectorAll('.hero .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), 120 + i * 130);
    });
  }

  /* ---------------- 6. 贴纸 ---------------- */
  const BEAR = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g>
      <circle cx="24" cy="26" r="15" fill="#F2EFE9"/>
      <circle cx="76" cy="26" r="15" fill="#F2EFE9"/>
      <circle cx="50" cy="56" r="35" fill="#F2EFE9"/>
    </g>
    <circle cx="24" cy="26" r="11.5" fill="#C98A5C"/>
    <circle cx="76" cy="26" r="11.5" fill="#C98A5C"/>
    <circle cx="24" cy="26" r="6" fill="#E8B08A"/>
    <circle cx="76" cy="26" r="6" fill="#E8B08A"/>
    <circle cx="50" cy="56" r="30" fill="#C98A5C"/>
    <ellipse cx="50" cy="65" rx="16" ry="12.5" fill="#F5E6D3"/>
    <circle cx="39" cy="50" r="3.1" fill="#2A211C"/>
    <circle cx="61" cy="50" r="3.1" fill="#2A211C"/>
    <circle cx="40" cy="49" r="1" fill="#fff"/>
    <circle cx="62" cy="49" r="1" fill="#fff"/>
    <ellipse cx="50" cy="61" rx="4.6" ry="3.4" fill="#2A211C"/>
    <path d="M50 64.5v3.5M50 68q-4 3.5-7 0M50 68q4 3.5 7 0" stroke="#2A211C" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="60" r="4" fill="#E88A7D" opacity=".55"/>
    <circle cx="70" cy="60" r="4" fill="#E88A7D" opacity=".55"/>
  </svg>`;

  const SPARK = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 4c3 24 16 37 42 42-26 5-39 18-42 42-3-24-16-37-42-42 26-5 39-18 42-42z" fill="#EA580C" stroke="#F2EFE9" stroke-width="3" paint-order="stroke" stroke-linejoin="round"/>
  </svg>`;

  const STAR = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8l11.8 27.4L91 39.2 68.6 59.1 75 88 50 72.8 25 88l6.4-28.9L9 39.2l29.2-3.8z" fill="#2563EB" stroke="#F2EFE9" stroke-width="3" paint-order="stroke" stroke-linejoin="round"/>
  </svg>`;

  const STICKERS = [
    { svg: BEAR, x: 'right:6%;top:16%', rot: -9 },
    { svg: BEAR, x: 'left:4%;top:46%', rot: 12, small: true },
    { svg: SPARK, x: 'right:16%;bottom:18%', rot: 8, small: true },
    { svg: STAR, x: 'left:12%;bottom:14%', rot: -14, small: true },
    { svg: BEAR, x: 'right:4%;bottom:42%', rot: 5, small: true }
  ];

  const layer = document.getElementById('stickers');
  STICKERS.forEach((cfg, i) => {
    const el = document.createElement('div');
    el.className = 'sticker' + (cfg.small ? ' small' : '');
    el.innerHTML = cfg.svg;
    el.style.cssText += cfg.x + ';transform:rotate(' + cfg.rot + 'deg);';
    el.dataset.rot = cfg.rot;
    layer.appendChild(el);
    makeDraggable(el);
    if (!reduce) {
      setInterval(() => {
        if (el.classList.contains('dragging')) return;
        el.classList.add('wiggle');
        setTimeout(() => el.classList.remove('wiggle'), 650);
      }, 7000 + i * 2600);
    }
  });

  function makeDraggable(el) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      ox = r.left; oy = r.top;
      el.style.left = r.left + 'px';
      el.style.top = r.top + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = ox + (e.clientX - sx);
      const ny = oy + (e.clientY - sy);
      el.style.left = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, nx)) + 'px';
      el.style.top = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, ny)) + 'px';
    });

    el.addEventListener('pointerup', () => {
      dragging = false;
      el.classList.remove('dragging');
      const base = Number(el.dataset.rot) || 0;
      const jitter = (Math.random() - 0.5) * 16;
      el.dataset.rot = (base + jitter).toFixed(1);
      el.style.transform = 'rotate(' + el.dataset.rot + 'deg)';
      el.classList.add('wiggle');
      setTimeout(() => el.classList.remove('wiggle'), 650);
    });
  }

  /* 跟随鼠标的小熊 */
  const followBear = document.createElement('div');
  followBear.id = 'bear-follow';
  followBear.innerHTML = BEAR;
  document.body.appendChild(followBear);

  if (!isTouch && !reduce) {
    let bx = window.innerWidth / 2, by = window.innerHeight / 2;
    let mx = bx, my = by;
    let lastX = bx;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    (function trail() {
      bx += (mx - bx) * 0.075;
      by += (my - by) * 0.075 + Math.sin(performance.now() / 420) * 0.5;
      const vx = bx - lastX;
      lastX = bx;
      const tilt = Math.max(-16, Math.min(16, vx * 0.9));
      followBear.style.transform = 'translate(' + (bx + 26) + 'px,' + (by - 62) + 'px) rotate(' + tilt + 'deg)';
      followBear.style.opacity = '1';
      requestAnimationFrame(trail);
    })();
  }

  /* 启动 */
  boot();
})();
