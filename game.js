const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#gameOverlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const bestScoreElement = document.querySelector("#bestScore");
const laneButtons = [...document.querySelectorAll("[data-lane]")];
const ASSET = "intermediate_tutorial_assets/";

const knightImage = loadImage(`${ASSET}knight.png`);
const monsterImage = loadImage(`${ASSET}blue_monster.png`);
const lanes = 5;
let width = 800;
let height = 600;
let running = false;
let lastTime = 0;
let spawnClock = 0;
let spawnDelay = 1.45;
let waveClock = 0;
let score = 0;
let lives = 5;
let wave = 1;
let energy = 5;
let bestScore = Number(localStorage.getItem("sprite-clash-best") || 0);
let knights = [];
let monsters = [];
bestScoreElement.textContent = String(bestScore);

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  width = rect.width;
  height = rect.height;
}

function hudHeight() {
  return clamp(height * .12, 58, 76);
}

function laneWidth() {
  return width / lanes;
}

function spriteSize() {
  return clamp(Math.min(laneWidth() * .58, height * .115), 40, 68);
}

function laneCenter(lane) {
  return lane * laneWidth() + laneWidth() / 2;
}

function resetGame() {
  score = 0;
  lives = 5;
  wave = 1;
  energy = 5;
  spawnClock = 0;
  spawnDelay = 1.45;
  waveClock = 0;
  knights = [];
  monsters = [];
  refreshControls();
}

function startGame() {
  resetGame();
  overlay.classList.remove("is-visible");
  startButton.textContent = "Tekrar oyna";
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function finishGame() {
  running = false;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("sprite-clash-best", String(bestScore));
    bestScoreElement.textContent = String(bestScore);
  }
  overlayTitle.textContent = `Skor: ${score}`;
  overlayText.textContent = `${wave}. dalgaya ulaştın. Koridorları daha iyi zamanlamak için yeniden deneyebilirsin.`;
  overlay.classList.add("is-visible");
}

function deploy(lane) {
  if (!running || energy < 1) return;
  const size = spriteSize();
  const latest = knights.find((knight) => knight.lane === lane && knight.y > height - size * 2.5);
  if (latest) return;
  energy -= 1;
  knights.push({
    lane,
    x: laneCenter(lane) - size / 2,
    y: height - size - 13,
    size,
    speed: clamp(height * .33, 170, 290),
  });
  const button = laneButtons[lane];
  button.classList.add("is-active");
  window.setTimeout(() => button.classList.remove("is-active"), 130);
  refreshControls();
}

function spawnMonster() {
  const lane = Math.floor(Math.random() * lanes);
  const size = spriteSize();
  monsters.push({
    lane,
    x: laneCenter(lane) - size / 2,
    y: hudHeight() - size,
    size,
    speed: clamp(height * (.16 + wave * .012), 90, 240),
  });
}

function update(dt) {
  spawnClock += dt;
  waveClock += dt;
  energy = Math.min(5, energy + dt * .58);
  if (spawnClock >= spawnDelay) {
    spawnClock = 0;
    spawnMonster();
  }
  if (waveClock >= 14) {
    waveClock = 0;
    wave += 1;
    spawnDelay = Math.max(.48, spawnDelay - .1);
  }

  knights.forEach((knight) => { knight.y -= knight.speed * dt; });
  monsters.forEach((monster) => { monster.y += monster.speed * dt; });

  const removedKnights = new Set();
  const removedMonsters = new Set();
  monsters.forEach((monster, monsterIndex) => {
    knights.forEach((knight, knightIndex) => {
      if (
        monster.lane === knight.lane &&
        !removedMonsters.has(monsterIndex) &&
        overlaps(monster, knight)
      ) {
        removedMonsters.add(monsterIndex);
        removedKnights.add(knightIndex);
        score += 10 * wave;
      }
    });
  });
  knights = knights.filter((knight, index) => !removedKnights.has(index) && knight.y + knight.size > hudHeight());
  monsters = monsters.filter((monster, index) => {
    if (removedMonsters.has(index)) return false;
    if (monster.y > height) {
      lives -= 1;
      if (lives <= 0) finishGame();
      return false;
    }
    return true;
  });
  refreshControls();
}

function overlaps(a, b) {
  const pad = 5;
  return (
    a.x + pad < b.x + b.size - pad &&
    a.x + a.size - pad > b.x + pad &&
    a.y + pad < b.y + b.size - pad &&
    a.y + a.size - pad > b.y + pad
  );
}

function refreshControls() {
  laneButtons.forEach((button) => {
    button.disabled = !running || energy < 1;
  });
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#0b1730");
  background.addColorStop(.48, "#081020");
  background.addColorStop(1, "#160c22");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const hud = hudHeight();
  ctx.fillStyle = "rgba(3,7,15,.74)";
  ctx.fillRect(0, 0, width, hud);
  ctx.fillStyle = "rgba(78,48,104,.36)";
  ctx.fillRect(0, height - 18, width, 18);

  for (let lane = 0; lane <= lanes; lane += 1) {
    ctx.strokeStyle = lane === 0 || lane === lanes ? "rgba(151,187,255,.23)" : "rgba(151,187,255,.11)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lane * laneWidth(), hud);
    ctx.lineTo(lane * laneWidth(), height);
    ctx.stroke();
  }

  const font = clamp(width * .025, 12, 20);
  ctx.font = `750 ${font}px ui-sans-serif, system-ui`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#dce9ff";
  ctx.fillText(`Skor ${score}`, 12, hud / 2);
  ctx.textAlign = "center";
  ctx.fillText(`Dalga ${wave}`, width / 2, hud / 2);
  ctx.textAlign = "right";
  ctx.fillText(`Kale ${"♥".repeat(Math.max(0, lives))}`, width - 12, hud / 2);
  ctx.textAlign = "left";

  const meterWidth = Math.min(width * .34, 240);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(width / 2 - meterWidth / 2, hud - 7, meterWidth, 3);
  ctx.fillStyle = "#6fa8ff";
  ctx.fillRect(width / 2 - meterWidth / 2, hud - 7, meterWidth * energy / 5, 3);

  monsters.forEach((monster) => {
    const glow = ctx.createRadialGradient(
      monster.x + monster.size / 2,
      monster.y + monster.size / 2,
      0,
      monster.x + monster.size / 2,
      monster.y + monster.size / 2,
      monster.size,
    );
    glow.addColorStop(0, "rgba(81,117,255,.22)");
    glow.addColorStop(1, "rgba(81,117,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(monster.x - monster.size / 2, monster.y - monster.size / 2, monster.size * 2, monster.size * 2);
    if (monsterImage.complete) ctx.drawImage(monsterImage, monster.x, monster.y, monster.size, monster.size);
  });
  knights.forEach((knight) => {
    if (knightImage.complete) ctx.drawImage(knightImage, knight.x, knight.y, knight.size, knight.size);
  });

  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.font = `700 ${clamp(font * .65, 9, 12)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  for (let lane = 0; lane < lanes; lane += 1) {
    ctx.fillText(String(lane + 1), laneCenter(lane), height - 8);
  }
  ctx.textAlign = "left";
}

function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, .034);
  lastTime = now;
  update(dt);
  draw();
  if (running) requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  deploy(clamp(Math.floor(x / laneWidth()), 0, lanes - 1));
});

laneButtons.forEach((button) => {
  button.addEventListener("click", () => deploy(Number(button.dataset.lane)));
});

window.addEventListener("keydown", (event) => {
  const lane = Number(event.key) - 1;
  if (lane >= 0 && lane < lanes && !event.repeat) deploy(lane);
});
window.addEventListener("resize", resize);
startButton.addEventListener("click", startGame);

resize();
refreshControls();
draw();
