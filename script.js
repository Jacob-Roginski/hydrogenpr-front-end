const ELEMENTS = [
  { symbol: 'H', name: 'Hydrogen', num: 1, r: 14, color: '#79c0ff', text: '#0d1117' },
  { symbol: 'He', name: 'Helium', num: 2, r: 21, color: '#d2a8ff', text: '#0d1117' },
  { symbol: 'Li', name: 'Lithium', num: 3, r: 28, color: '#56d364', text: '#0d1117' },
  { symbol: 'Be', name: 'Beryllium', num: 4, r: 36, color: '#e3b341', text: '#0d1117' },
  { symbol: 'B', name: 'Boron', num: 5, r: 44, color: '#f28b82', text: '#0d1117' },
  { symbol: 'C', name: 'Carbon', num: 6, r: 52, color: '#2d333b', text: '#e6edf3' },
  { symbol: 'N', name: 'Nitrogen', num: 7, r: 62, color: '#58a6ff', text: '#0d1117' },
  { symbol: 'O', name: 'Oxygen', num: 8, r: 74, color: '#ff7b72', text: '#0d1117' },
  { symbol: 'F', name: 'Fluorine', num: 9, r: 88, color: '#3fb950', text: '#0d1117' },
  { symbol: 'Ne', name: 'Neon', num: 10, r: 103, color: '#bc8cff', text: '#0d1117' },
  { symbol: 'Na', name: 'Sodium', num: 11, r: 120, color: '#ffa657', text: '#0d1117' }
];

const CW = 920;
const CH = 560;
const DANGER_Y = 72;
const GRAVITY = 0.45;
const DAMPING = 0.52;
const FRICTION = 0.82;
const MAX_DROP = 4;
const SCORES = [10, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800];

let canvas;
let ctx;
let nextCanvas;
let nextCtx;
let balls = [];
let score = 0;
let hiScore = 0;
let dead = false;
let canDrop = true;
let cur = 0;
let nxt = 0;
let dropX = CW / 2;
let frameId = null;
let last = 0;

class Ball {
  static uid = 0;

  constructor(x, y, i) {
    this.x = x;
    this.y = y;
    this.i = i;
    this.e = ELEMENTS[i];
    this.r = this.e.r;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.merging = false;
    this.id = ++Ball.uid;
  }
}

function randomDropElement() {
  return Math.floor(Math.random() * (MAX_DROP + 1));
}

function initRevealAnimation() {
  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function initCardTilt() {
  const tiltTargets = document.querySelectorAll('.why-card, .feat-card, .prob-card, .pr-mock');
  tiltTargets.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -2;
      const ry = ((x - cx) / cx) * 2;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function initGame() {
  canvas = document.getElementById('gameCanvas');
  nextCanvas = document.getElementById('gameNextCanvas');

  if (!canvas || !nextCanvas) {
    return;
  }

  ctx = canvas.getContext('2d');
  nextCtx = nextCanvas.getContext('2d');

  balls = [];
  score = 0;
  dead = false;
  canDrop = true;

  document.getElementById('scoreDisplay').textContent = '0';
  document.getElementById('gameOverlay').style.display = 'none';

  cur = randomDropElement();
  nxt = randomDropElement();
  dropX = CW / 2;

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  buildLegend();
  buildChain();
  drawNext();

  if (frameId) {
    cancelAnimationFrame(frameId);
  }

  last = performance.now();
  frameId = requestAnimationFrame(loop);
}

function buildLegend() {
  const legend = document.getElementById('elemLegend');
  legend.innerHTML = ELEMENTS.map((element) => (
    `<div class="leg-item"><div class="leg-dot" style="background:${element.color}"></div>${element.symbol} ${element.name}</div>`
  )).join('');
}

function buildChain() {
  const chain = document.getElementById('mergeChain');
  chain.innerHTML = ELEMENTS.map((element, index) => (
    `<span style="background:${element.color};color:${element.text};padding:2px 7px;border-radius:12px;font-size:11px;font-family:monospace;font-weight:700;">${element.symbol}</span>${index < ELEMENTS.length - 1 ? '<span style="color:var(--dim);font-size:10px;">→</span>' : ''}`
  )).join('');
}

function getDropX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scale = CW / rect.width;
  const element = ELEMENTS[cur];
  return Math.max(element.r, Math.min(CW - element.r, (clientX - rect.left) * scale));
}

function onMouseMove(event) {
  if (!dead) {
    dropX = getDropX(event.clientX);
  }
}

function onCanvasClick() {
  if (!dead && canDrop) {
    dropBall();
  }
}

function onTouchMove(event) {
  event.preventDefault();
  if (!dead) {
    dropX = getDropX(event.touches[0].clientX);
  }
}

function onTouchEnd() {
  if (!dead && canDrop) {
    dropBall();
  }
}

function dropBall() {
  canDrop = false;
  const ball = new Ball(dropX, DANGER_Y - ELEMENTS[cur].r - 6, cur);
  ball.vy = 1.5;
  balls.push(ball);

  cur = nxt;
  nxt = randomDropElement();
  drawNext();

  setTimeout(() => {
    canDrop = true;
  }, 480);
}

function drawNext() {
  const element = ELEMENTS[nxt];
  nextCtx.clearRect(0, 0, 34, 34);
  nextCtx.beginPath();
  nextCtx.arc(17, 17, 15, 0, Math.PI * 2);
  nextCtx.fillStyle = element.color;
  nextCtx.fill();

  const fontSize = element.symbol.length > 1 ? 9 : 11;
  nextCtx.font = `bold ${fontSize}px monospace`;
  nextCtx.fillStyle = element.text;
  nextCtx.textAlign = 'center';
  nextCtx.textBaseline = 'middle';
  nextCtx.fillText(element.symbol, 17, 17);
}

function loop(timestamp) {
  const dt = Math.min((timestamp - last) / 16.67, 3);
  last = timestamp;

  update(dt);
  draw();

  if (!dead) {
    frameId = requestAnimationFrame(loop);
  }
}

function update(dt) {
  for (const ball of balls) {
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y + ball.r >= CH) {
      ball.y = CH - ball.r;
      ball.vy *= -DAMPING;
      ball.vx *= FRICTION;
      if (Math.abs(ball.vy) < 0.4) {
        ball.vy = 0;
      }
    }

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx *= -DAMPING;
    }

    if (ball.x + ball.r > CW) {
      ball.x = CW - ball.r;
      ball.vx *= -DAMPING;
    }
  }

  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (!a.alive) {
      continue;
    }

    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (!b.alive) {
        continue;
      }

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const md = a.r + b.r;

      if (d < md && d > 0.001) {
        if (a.i === b.i && !a.merging && !b.merging && a.i < ELEMENTS.length - 1) {
          a.merging = true;
          b.merging = true;

          const nextIndex = a.i + 1;
          const mergeX = (a.x + b.x) / 2;
          const mergeY = Math.min((a.y + b.y) / 2, CH - ELEMENTS[nextIndex].r);

          score += SCORES[a.i];
          if (score > hiScore) {
            hiScore = score;
            document.getElementById('hiScoreDisplay').textContent = String(hiScore);
          }

          document.getElementById('scoreDisplay').textContent = String(score);

          a.alive = false;
          b.alive = false;

          const newBall = new Ball(mergeX, mergeY, nextIndex);
          newBall.vy = -2.5;
          newBall.vx = (Math.random() - 0.5) * 2;
          balls.push(newBall);
          balls = balls.filter((item) => item.alive);
          i -= 1;
          break;
        }

        const nx = dx / d;
        const ny = dy / d;
        const overlap = (md - d) * 0.5;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const impulse = rv * 0.55;
          a.vx += impulse * nx;
          a.vy += impulse * ny;
          b.vx -= impulse * nx;
          b.vy -= impulse * ny;
        }
      }
    }
  }

  if (!dead) {
    for (const ball of balls) {
      if (ball.y - ball.r < DANGER_Y && Math.abs(ball.vy) < 0.25 && Math.abs(ball.vx) < 0.25) {
        endGame();
        return;
      }
    }
  }
}

function endGame() {
  dead = true;
  draw();
  document.getElementById('finalScore').textContent = `Score: ${score}`;
  document.getElementById('gameOverlay').style.display = 'flex';
  cancelAnimationFrame(frameId);
}

function draw() {
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = '#010409';
  ctx.fillRect(0, 0, CW, CH);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.022)';
  ctx.lineWidth = 1;
  for (let x = 40; x < CW; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CH);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = 'rgba(248,81,73,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, DANGER_Y);
  ctx.lineTo(CW, DANGER_Y);
  ctx.stroke();
  ctx.restore();

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(248,81,73,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('DANGER', 4, DANGER_Y - 4);

  if (!dead && canDrop) {
    const element = ELEMENTS[cur];

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(88,166,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dropX, DANGER_Y);
    ctx.lineTo(dropX, CH);
    ctx.stroke();
    ctx.restore();

    ctx.globalAlpha = 0.48;
    drawCircle(ctx, dropX, DANGER_Y - element.r - 6, element.r, element);
    ctx.globalAlpha = 1;
  }

  for (const ball of balls) {
    drawCircle(ctx, ball.x, ball.y, ball.r, ball.e);
  }
}

function drawCircle(context, x, y, r, element) {
  context.save();
  context.shadowColor = element.color;
  context.shadowBlur = r * 0.35;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fillStyle = element.color;
  context.fill();
  context.restore();

  const gradient = context.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  gradient.addColorStop(0, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();

  const fontSize = element.symbol.length > 1 ? Math.max(8, r * 0.44) : Math.max(10, r * 0.54);
  context.font = `bold ${fontSize}px monospace`;
  context.fillStyle = element.text;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(element.symbol, x, y);

  if (r >= 28) {
    context.font = `${Math.max(6, r * 0.27)}px monospace`;
    context.globalAlpha = 0.6;
    context.fillText(String(element.num), x, y + fontSize * 0.75);
    context.globalAlpha = 1;
  }
}

function restartGame() {
  canvas.removeEventListener('mousemove', onMouseMove);
  canvas.removeEventListener('click', onCanvasClick);
  canvas.removeEventListener('touchmove', onTouchMove);
  canvas.removeEventListener('touchend', onTouchEnd);
  initGame();
}

window.restartGame = restartGame;

window.addEventListener('load', () => {
  initRevealAnimation();
  initCardTilt();
  initGame();
});
