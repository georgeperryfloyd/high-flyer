const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Adjust for HiDPI displays
const scale = window.devicePixelRatio;
canvas.width = canvas.clientWidth * scale;
canvas.height = window.innerHeight * scale;
ctx.scale(scale, scale);

const playerImage = new Image();
playerImage.src = 'player.png'; // Placeholder for the player sprite

const hazardImages = [
  'hazard1.png', // Placeholder for hazard 1
  'hazard2.png', // Placeholder for hazard 2
  'hazard3.png', // Placeholder for hazard 3
  'hazard4.png', // Placeholder for hazard 4
  'hazard5.png'  // Placeholder for hazard 5
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const bonusImages = [
  'bonus1.png', // Placeholder for bonus 1
  'bonus2.png', // Placeholder for bonus 2
  'bonus3.png', // Placeholder for bonus 3
  'bonus4.png', // Placeholder for bonus 4
  'bonus5.png'  // Placeholder for bonus 5
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const cloudImage = new Image();
cloudImage.src = 'cloud.png'; // Placeholder for cloud sprite

const player = {
  x: 0,
  y: 0,
  width: 52,
  height: 83,
  health: 0,
  targetX: 0,
  maxHealth: 12,
  angle: 0
};

const hazards = [
  { value: 0, image: hazardImages[0] },
  { value: 0, image: hazardImages[1] },
  { value: 0, image: hazardImages[2] },
  { value: 0, image: hazardImages[3] },
  { value: 0, image: hazardImages[4] }
];

const bonuses = [
  { value: 4, image: bonusImages[0] },
  { value: 4, image: bonusImages[1] },
  { value: 4, image: bonusImages[2] },
  { value: 4, image: bonusImages[3] },
  { value: 4, image: bonusImages[4] }
];

const clouds = [];
const cloudFrequency = 100; // Frequency of cloud generation

const items = [];
const initialItemFrequency = 75; 
const initialBonusFrequency = 300; 
let itemFrequency = initialItemFrequency;
let bonusFrequency = initialBonusFrequency;
let isGameOver = false;
let itemSpeed = 2;
let startTime = null;
let elapsed = 0;
let lastTime = 0;

const bgm = document.getElementById('bgm');
const bonusSound = document.getElementById('bonusSound');

//bgm.play(); - Disabled for now

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * scale;
  canvas.height = window.innerHeight * scale;
  ctx.scale(scale, scale);
  player.x = canvas.width / scale / 2 - player.width / 2;
  player.y = canvas.height / scale - 250; // Move player up by about 200px
  player.targetX = player.x;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  player.targetX = (e.clientX - rect.left) / rect.width * canvas.width / scale - player.width / 2;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  player.targetX = (touch.clientX - rect.left) / rect.width * canvas.width / scale - player.width / 2;
}, { passive: false });

function generateCloud() {
  const size = 50 + Math.random() * 100; // Random size between 50 and 150
  const x = Math.random() * canvas.width / scale - size / 2;
  const opacity = 0.5 + Math.random() * 0.4; // Random opacity between 0.5 and 0.9
  clouds.push({
    x: x,
    y: -size,
    width: size,
    height: size,
    speed: itemSpeed / 2,
    opacity: opacity
  });
}

function generateItem() {
  if (Math.random() < 1 / bonusFrequency) {
    // Generate a bonus
    const itemType = bonuses[Math.floor(Math.random() * bonuses.length)];
    const x = Math.random() * canvas.width / scale - 32;
    items.push({
      x: x,
      y: -64,
      width: 64,
      height: 64,
      value: itemType.value,
      image: itemType.image,
      isHazard: false,
      angle: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.02 // Random slow spin
    });
  } else if (Math.random() < 1 / itemFrequency) {
    // Generate a hazard
    const itemType = hazards[Math.floor(Math.random() * hazards.length)];
    const x = Math.random() * canvas.width / scale - 32;
    items.push({
      x: x,
      y: -64,
      width: 64,
      height: 64,
      value: itemType.value,
      image: itemType.image,
      isHazard: true,
      angle: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.02 // Random slow spin
    });
  }
}

function drawBackground() {
  ctx.fillStyle = 'lightblue';
  ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

  clouds.forEach(cloud => {
    ctx.globalAlpha = cloud.opacity;
    ctx.drawImage(cloudImage, cloud.x, cloud.y, cloud.width, cloud.height);
    ctx.globalAlpha = 1.0;
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.angle * Math.PI / 180);
  ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
  ctx.restore();
}

function drawItems() {
  items.forEach(item => {
    ctx.save();
    ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
    ctx.rotate(item.angle);
    ctx.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height);
    ctx.restore();
  });
}

function updateClouds(deltaTime) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cloud = clouds[i];
    cloud.y += cloud.speed * deltaTime / 16;

    // Remove clouds that are out of bounds
    if (cloud.y > canvas.height / scale) {
      clouds.splice(i, 1);
    }
  }
}

function updateItems(deltaTime) {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += itemSpeed * deltaTime / 16; // Item fall speed
    item.angle += item.rotationSpeed * deltaTime / 16; // Item rotation

    // Check for collision with player
    if (checkCollision(player, item)) {
      if (item.isHazard) {
        endGame();
        return;
      } else {
        player.health = Math.min(player.health + item.value, player.maxHealth);
        bonusSound.play();
      }
      items.splice(i, 1);
      continue;
    }

    // Remove items that are out of bounds
    if (item.y > canvas.height / scale) {
      items.splice(i, 1);
    }
  }
}

function checkCollision(player, item) {
  const playerRadius = Math.min(player.width, player.height) * 0.45; // Scale factor of 0.9 / 2
  const itemRadius = Math.min(item.width, item.height) * 0.45; // Scale factor of 0.9 / 2

  const dx = (player.x + player.width / 2) - (item.x + item.width / 2);
  const dy = (player.y + player.height / 2) - (item.y + item.height / 2);
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < (playerRadius + itemRadius);
}

function updatePlayerPosition(deltaTime) {
  const glideFactor = player.health * 0.007 + 0.03;
  player.x += (player.targetX - player.x) * glideFactor * deltaTime / 16;

  // Update player angle based on movement
  const deltaX = player.targetX - player.x;
  player.angle = deltaX * 0.15; // Adjust the multiplier for the desired tilt effect
}

function drawHealthBar() {
  const healthBarWidth = 300; 
  const healthBarHeight = 32; 
  const healthBarX = 10;
  const healthBarY = 25;
  const healthPercentage = Math.max(player.health / player.maxHealth, 1 / player.maxHealth);
  const cornerRadius = 16;

  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 30;

  // Draw health bar background
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(healthBarX + cornerRadius, healthBarY);
  ctx.lineTo(healthBarX + healthBarWidth - cornerRadius, healthBarY);
  ctx.quadraticCurveTo(healthBarX + healthBarWidth, healthBarY, healthBarX + healthBarWidth, healthBarY + cornerRadius);
  ctx.lineTo(healthBarX + healthBarWidth, healthBarY + healthBarHeight - cornerRadius);
  ctx.quadraticCurveTo(healthBarX + healthBarWidth, healthBarY + healthBarHeight, healthBarX + healthBarWidth - cornerRadius, healthBarY + healthBarHeight);
  ctx.lineTo(healthBarX + cornerRadius, healthBarY + healthBarHeight);
  ctx.quadraticCurveTo(healthBarX, healthBarY + healthBarHeight, healthBarX, healthBarY + healthBarHeight - cornerRadius);
  ctx.lineTo(healthBarX, healthBarY + cornerRadius);
  ctx.quadraticCurveTo(healthBarX, healthBarY, healthBarX + cornerRadius, healthBarY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0; // Reset shadow blur

  // Draw health bar empty (light gray)
  ctx.fillStyle = 'lightgray';
  ctx.beginPath();
  ctx.moveTo(healthBarX + cornerRadius, healthBarY);
  ctx.lineTo(healthBarX + healthBarWidth - cornerRadius, healthBarY);
  ctx.quadraticCurveTo(healthBarX + healthBarWidth, healthBarY, healthBarX + healthBarWidth, healthBarY + cornerRadius);
  ctx.lineTo(healthBarX + healthBarWidth, healthBarY + healthBarHeight - cornerRadius);
  ctx.quadraticCurveTo(healthBarX + healthBarWidth, healthBarY + healthBarHeight, healthBarX + healthBarWidth - cornerRadius, healthBarY + healthBarHeight);
  ctx.lineTo(healthBarX + cornerRadius, healthBarY + healthBarHeight);
  ctx.quadraticCurveTo(healthBarX, healthBarY + healthBarHeight, healthBarX, healthBarY + healthBarHeight - cornerRadius);
  ctx.lineTo(healthBarX, healthBarY + cornerRadius);
  ctx.quadraticCurveTo(healthBarX, healthBarY, healthBarX + cornerRadius, healthBarY);
  ctx.closePath();
  ctx.fill();

  // Draw health bar filled (lime green)
  ctx.fillStyle = 'limegreen';
  ctx.beginPath();
  ctx.moveTo(healthBarX + cornerRadius, healthBarY);
  ctx.lineTo(healthBarX + healthBarWidth * healthPercentage - cornerRadius, healthBarY);
  ctx.quadraticCurveTo(healthBarX + healthBarWidth * healthPercentage, healthBarY, healthBarX + healthBarWidth * healthPercentage, healthBarY + cornerRadius);
  ctx.lineTo(healthBarX + healthBarWidth * healthPercentage, healthBarY + healthBarHeight - cornerRadius);
  ctx.quadraticCurveTo(healthBarX + healthBarWidth * healthPercentage, healthBarY + healthBarHeight, healthBarX + healthBarWidth * healthPercentage - cornerRadius, healthBarY + healthBarHeight);
  ctx.lineTo(healthBarX + cornerRadius, healthBarY + healthBarHeight);
  ctx.quadraticCurveTo(healthBarX, healthBarY + healthBarHeight, healthBarX, healthBarY + healthBarHeight - cornerRadius);
  ctx.lineTo(healthBarX, healthBarY + cornerRadius);
  ctx.quadraticCurveTo(healthBarX, healthBarY, healthBarX + cornerRadius, healthBarY);
  ctx.closePath();
  ctx.fill();

  // Draw health bar text
  ctx.fillStyle = 'black';
  ctx.font = 'bold 24px Arial'; // 50% bigger
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeText(`Fentanyl level: ${player.health.toFixed(1)} ng/mL`, 10, 90); 
  ctx.fillText(`Fentanyl level: ${player.health.toFixed(1)} ng/mL`, 10, 90);
}

function drawTimer() {
  const timerX = 10;
  const timerY = 130;
  elapsed += lastTime / 1000;
  lastTime = 0;

  // Draw timer text
  ctx.fillStyle = 'black';
  ctx.font = 'bold 24px Arial'; // 50% bigger
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeText(`Time: ${elapsed.toFixed(1)} s`, timerX, timerY);
  ctx.fillText(`Time: ${elapsed.toFixed(1)} s`, timerX, timerY);
}

function update(timestamp) {
  if (isGameOver) return; // Stop the game loop when the game is over

  const deltaTime = timestamp - (startTime || timestamp);
  startTime = timestamp;

  lastTime = deltaTime;

  // Clear the canvas for redrawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (Math.random() < 1 / cloudFrequency) {
    generateCloud();
  }

  drawBackground();

  generateItem();

  updateClouds(deltaTime);
  updatePlayerPosition(deltaTime);
  drawPlayer();
  updateItems(deltaTime);
  drawItems();
  drawHealthBar();
  drawTimer();

  // Decrease health over time
  player.health = Math.max(player.health - 0.01 * deltaTime / 16, 0);

  // Increase item speed over time
  itemSpeed += 0.002 * deltaTime / 16;

  // Adjust item generation frequency
  itemFrequency = initialItemFrequency / (itemSpeed / 2);
  bonusFrequency = initialBonusFrequency / (itemSpeed / 4);

  requestAnimationFrame(update);
}

function endGame() {
  isGameOver = true;
  document.getElementById('gameOverMessage').innerText = `Your epic fentanyl bender lasted for ${elapsed.toFixed(1)} glorious seconds before you got caught!`;
  document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
  isGameOver = false;
  document.getElementById('gameOver').style.display = 'none';
  player.health = 0;
  items.length = 0;
  clouds.length = 0;
  itemSpeed = 3;
  itemFrequency = initialItemFrequency;
  bonusFrequency = initialBonusFrequency;
  startTime = null;
  elapsed = 0;
  lastTime = 0;

  // Generate initial clouds
  for (let i = 0; i < 6; i++) {
    const size = 100 + Math.random() * 200; // Random size between 50 and 150
    const x = Math.random() * canvas.width / scale - size / 2;
    const y = Math.random() * canvas.height / scale - size;
    const opacity = 0.5 + Math.random() * 0.4; // Random opacity between 0.5 and 0.9
    clouds.push({
      x: x,
      y: y,
      width: size,
      height: size,
      speed: itemSpeed / 2,
      opacity: opacity
    });
  }

  requestAnimationFrame(update);
}

// Start the game and set the start time
restartGame();
