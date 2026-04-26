const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');

// --- 定数 ---
const W = canvas.width;
const H = canvas.height;

const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const PADDLE_SPEED = 6;

const BALL_RADIUS = 8;
const BALL_BASE_SPEED = 4;

const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_W = 42;
const BRICK_H = 16;
const BRICK_PAD = 4;
const BRICK_OFFSET_X = 9;
const BRICK_OFFSET_Y = 50;

const BRICK_COLORS = ['#e94560', '#e9724c', '#e9c46a', '#52b788', '#4cc9f0'];
const BRICK_POINTS = [50, 40, 30, 20, 10];

// --- 状態 ---
let score, lives, level;
let paddle, ball, bricks;
let keys = {};
let running = false;
let animId = null;

// --- 初期化 ---
function init() {
  score = 0;
  lives = 3;
  level = 1;
  updateUI();
  resetPaddle();
  resetBall();
  buildBricks();
  messageEl.textContent = '';
  startBtn.textContent = 'リスタート';
}

function resetPaddle() {
  paddle = { x: W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
}

function resetBall() {
  const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI / 3);
  const speed = BALL_BASE_SPEED + (level - 1) * 0.5;
  ball = {
    x: W / 2,
    y: PADDLE_Y - BALL_RADIUS - 2,
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    r: BALL_RADIUS,
    launched: false,
  };
}

function buildBricks() {
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_PAD),
        y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W,
        h: BRICK_H,
        color: BRICK_COLORS[r],
        points: BRICK_POINTS[r],
        alive: true,
      });
    }
  }
}

function updateUI() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  levelEl.textContent = level;
}

// --- 入力 ---
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });

// マウス / タッチでパドル操作
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  paddle.x = e.clientX - rect.left - paddle.w / 2;
  clampPaddle();
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  paddle.x = e.touches[0].clientX - rect.left - paddle.w / 2;
  clampPaddle();
}, { passive: false });

// スペースキーでボール発射
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !ball.launched) {
    ball.launched = true;
  }
});

canvas.addEventListener('click', () => {
  if (!ball.launched) ball.launched = true;
});

canvas.addEventListener('touchstart', () => {
  if (!ball.launched) ball.launched = true;
});

function clampPaddle() {
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
}

// --- 更新 ---
function update() {
  // キーボードでパドル移動
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    paddle.x -= PADDLE_SPEED;
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    paddle.x += PADDLE_SPEED;
  }
  clampPaddle();

  if (!ball.launched) {
    // ボールをパドルに追従
    ball.x = paddle.x + paddle.w / 2;
    ball.y = PADDLE_Y - BALL_RADIUS - 2;
    return;
  }

  // ボール移動
  ball.x += ball.vx;
  ball.y += ball.vy;

  // 左右壁
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }

  // 上壁
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

  // パドル衝突
  if (
    ball.vy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w
  ) {
    // パドル中心からの距離で反射角を変える
    const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 ~ 1
    const angle = hitPos * (Math.PI / 3); // 最大60度
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddle.y - ball.r;
  }

  // ボール落下
  if (ball.y - ball.r > H) {
    lives--;
    updateUI();
    if (lives <= 0) {
      gameOver();
      return;
    }
    resetBall();
    messageEl.textContent = 'スペース / クリックで発射';
    return;
  }

  // ブロック衝突
  let allDead = true;
  for (const b of bricks) {
    if (!b.alive) continue;
    allDead = false;

    if (
      ball.x + ball.r > b.x &&
      ball.x - ball.r < b.x + b.w &&
      ball.y + ball.r > b.y &&
      ball.y - ball.r < b.y + b.h
    ) {
      b.alive = false;
      score += b.points;
      updateUI();

      // どの面から当たったか判定
      const overlapLeft   = ball.x + ball.r - b.x;
      const overlapRight  = b.x + b.w - (ball.x - ball.r);
      const overlapTop    = ball.y + ball.r - b.y;
      const overlapBottom = b.y + b.h - (ball.y - ball.r);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }
      break; // 1フレーム1ブロック
    }
  }

  if (allDead) {
    nextLevel();
  }

  if (messageEl.textContent === 'スペース / クリックで発射' && ball.launched) {
    messageEl.textContent = '';
  }
}

function nextLevel() {
  level++;
  updateUI();
  buildBricks();
  resetBall();
  messageEl.textContent = `Level ${level}! スペース / クリックで発射`;
}

function gameOver() {
  running = false;
  cancelAnimationFrame(animId);
  messageEl.textContent = `ゲームオーバー  スコア: ${score}`;
  startBtn.textContent = 'もう一度';
  draw(); // 最後の状態を描画
}

function checkClear() {
  // nextLevel内で処理済み
}

// --- 描画 ---
function draw() {
  ctx.clearRect(0, 0, W, H);

  // ブロック
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    roundRect(b.x, b.y, b.w, b.h, 3);
    ctx.fill();
    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(b.x + 2, b.y + 2, b.w - 4, 4, 2);
    ctx.fill();
  }

  // パドル
  const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  grad.addColorStop(0, '#4cc9f0');
  grad.addColorStop(1, '#0077b6');
  ctx.fillStyle = grad;
  roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
  ctx.fill();

  // ボール
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
  ballGrad.addColorStop(0, '#ff6b6b');
  ballGrad.addColorStop(1, '#cc0000');
  ctx.fillStyle = ballGrad;
  ctx.fill();

  // 発射待ちガイド
  if (!ball.launched) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x, 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- ゲームループ ---
function loop() {
  if (!running) return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

function startGame() {
  if (animId) cancelAnimationFrame(animId);
  running = true;
  init();
  messageEl.textContent = 'スペース / クリックで発射';
  loop();
}

startBtn.addEventListener('click', startGame);

// 初回描画
init();
draw();
messageEl.textContent = 'スタートボタンを押してください';
