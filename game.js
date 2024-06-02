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

const backgroundImage = new Image();
backgroundImage.src = 'background.png'; // Placeholder for the background tile

const player = {
  x: 0,
  y: 0,
  width: 90,
  height: 90,
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
  { value: 3, image: bonusImages[0] },
  { value: 3, image: bonusImages[1] },
  { value: 3, image: bonusImages[2] },
  { value: 3, image: bonusImages[3] },
  { value: 3, image: bonusImages[4] }
];

const items = [];
const itemFrequency = 50; // Frequency of item generation
const bonusFrequency = 200; // Increased bonus generation interval (1/4 of itemFrequency)
let frame = 0;
let backgroundY = 0;
let isGameOver = false;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * scale;
  canvas.height = window.innerHeight * scale;
  ctx.scale(scale, scale);
  player.x = canvas.width / scale / 2 - player.width / 2;
  player.y = canvas.height / scale - 200; // Move player up by about 150px
  player.targetX = player.x;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  player.targetX = (e.clientX - rect.left) / rect.width * canvas.width / scale - player.width / 2;
});

function generateItem() {
  if (frame % bonusFrequency === 0) {
    // Generate a bonus
    const itemType = bonuses[Math.floor(Math.random() * bonuses.length)];
    const x = Math.random() * (canvas.width / scale - 60);
    items.push({
      x: x,
      y: -60,
      width: 60,
      height: 60,
      value: itemType.value,
      image: itemType.image,
      isHazard: false
    });
  } else {
    // Generate a hazard
    const itemType = hazards[Math.floor(Math.random() * hazards.length)];
    const x = Math.random() * (canvas.width / scale - 60);
    items.push({
      x: x,
      y: -60,
      width: 60,
      height: 60,
      value: itemType.value,
      image: itemType.image,
      isHazard: true
    });
  }
}

function drawBackground() {
  const patternHeight = backgroundImage.height;
  ctx.drawImage(backgroundImage, 0, backgroundY, canvas.width / scale, patternHeight);
  ctx.drawImage(backgroundImage, 0, backgroundY - patternHeight, canvas.width / scale, patternHeight);

  backgroundY += 2;
  if (backgroundY >= patternHeight) {
    backgroundY = 0;
  }
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
    ctx.drawImage(item.image, item.x, item.y, item.width, item.height);
  });
}

function updateItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += 2; // Item fall speed

    // Check for collision with player
    if (checkCollision(player, item)) {
      if (item.isHazard) {
        endGame('Game Over! You hit a hazard.');
        return;
      } else {
        player.health = Math.min(player.health + item.value, player.maxHealth);
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
  const dx = (player.x + player.width / 2) - (item.x + item.width / 2);
  const dy = (player.y + player.height / 2) - (item.y + item.height / 2);
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < (player.width / 2 + item.width / 2);
}

function updatePlayerPosition() {
  const glideFactor = player.health * 0.005 + 0.025;
  player.x += (player.targetX - player.x) * glideFactor;

  // Update player angle based on movement
  const deltaX = player.targetX - player.x;
  player.angle = deltaX * 0.15; // Adjust the multiplier for the desired tilt effect
}

function drawHealthBar() {
  const healthBarWidth = 200;
  const healthBarHeight = 20;
  const healthBarX = 10;
  const healthBarY = 10;
  const healthPercentage = Math.max(player.health / player.maxHealth, 0.5 / player.maxHealth);
  const cornerRadius = 10;

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
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeText(`Health: ${player.health.toFixed(1)} ng/mL`, healthBarX, healthBarY + healthBarHeight + 16);
  ctx.fillText(`Health: ${player.health.toFixed(1)} ng/mL`, healthBarX, healthBarY + healthBarHeight + 16);
}

function update() {
  if (isGameOver) return; // Stop the game loop when the game is over

  // Clear the canvas for redrawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  if (frame % itemFrequency === 0) {
    generateItem();
  }

  updatePlayerPosition();
  drawPlayer();
  updateItems();
  drawItems();
  drawHealthBar();

  // Decrease health over time
  player.health = Math.max(player.health - 0.005, 0);

  frame++;
  requestAnimationFrame(update);
}

function endGame(message) {
  isGameOver = true;
  document.getElementById('gameOverMessage').innerText = message;
  document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
  isGameOver = false;
  document.getElementById('gameOver').style.display = 'none';
  player.health = 0;
  items.length = 0;
  frame = 0;
  update();
}

update();
