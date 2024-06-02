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
  { value: 3, image: bonusImages[0] },
  { value: 3, image: bonusImages[1] },
  { value: 3, image: bonusImages[2] },
  { value: 3, image: bonusImages[3] },
  { value: 3, image: bonusImages[4] }
];

const items = [];
const initialItemFrequency = 50; // Initial frequency of item generation
const initialBonusFrequency = 400; // Initial frequency of bonus generation (50% less frequent)
let itemFrequency = initialItemFrequency;
let bonusFrequency = initialBonusFrequency;
let frame = 0;
let backgroundY = 0;
let isGameOver = false;
let itemSpeed = 2;
let startTime = null;
let elapsed = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * scale;
  canvas.height = window.innerHeight * scale;
  ctx.scale(scale, scale);
  player.x = canvas.width / scale / 2 - player.width / 2;
  player.y = canvas.height / scale - 150; // Move player up by about 200px
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

function generateItem() {
  if (frame % Math.round(bonusFrequency) === 0) {
    // Generate a bonus
    const itemType = bonuses[Math.floor(Math.random() * bonuses.length)];
    const x = Math.random() * (canvas.width / scale - 60);
    items.push({
      x: x,
      y: -60,
      width: 64,
      height: 64,
      value: itemType.value,
      image: itemType.image,
      isHazard: false,
      angle: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.02 // Random slow spin
    });
  } else if (frame % Math.round(itemFrequency) === 0) {
    // Generate a hazard
    const itemType = hazards[Math.floor(Math.random() * hazards.length)];
    const x = Math.random() * (canvas.width / scale - 60);
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
  const patternHeight = backgroundImage.height;
  ctx.drawImage(backgroundImage, 0, backgroundY, canvas.width / scale, patternHeight);
  ctx.drawImage(backgroundImage, 0, backgroundY - patternHeight, canvas.width / scale, patternHeight);

  backgroundY += itemSpeed / 2;
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
    ctx.save();
    ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
    ctx.rotate(item.angle);
    ctx.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height);
    ctx.restore();
  });
}

function updateItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += itemSpeed; // Item fall speed
    item.angle += item.rotationSpeed; // Item rotation

    // Check for collision with player
    if (checkCollision(player, item)) {
      if (item.isHazard) {
        endGame();
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
  // Get the four corners of the player's rotated hitbox
  const playerCorners = getRotatedCorners(player);
  // Get the four corners of the item's hitbox
  const itemCorners = getRotatedCorners(item);

  // Check for collision using Separating Axis Theorem (SAT)
  return isCollision(playerCorners, itemCorners);
}

function getRotatedCorners(rect) {
  const angle = rect.angle * Math.PI / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;

  const cx = rect.x + halfWidth;
  const cy = rect.y + halfHeight;

  return [
    { x: cx + (halfWidth * cos - halfHeight * sin), y: cy + (halfWidth * sin + halfHeight * cos) },
    { x: cx + (-halfWidth * cos - halfHeight * sin), y: cy + (-halfWidth * sin + halfHeight * cos) },
    { x: cx + (-halfWidth * cos + halfHeight * sin), y: cy + (-halfWidth * sin - halfHeight * cos) },
    { x: cx + (halfWidth * cos + halfHeight * sin), y: cy + (halfWidth * sin - halfHeight * cos) }
  ];
}

function isCollision(corners1, corners2) {
  const axes = [
    { x: corners1[1].x - corners1[0].x, y: corners1[1].y - corners1[0].y },
    { x: corners1[2].x - corners1[1].x, y: corners1[2].y - corners1[1].y },
    { x: corners2[1].x - corners2[0].x, y: corners2[1].y - corners2[0].y },
    { x: corners2[2].x - corners2[1].x, y: corners2[2].y - corners2[1].y }
  ];

  for (let axis of axes) {
    const projection1 = projectCorners(corners1, axis);
    const projection2 = projectCorners(corners2, axis);

    if (projection1.max < projection2.min || projection2.max < projection1.min) {
      return false;
    }
  }

  return true;
}

function projectCorners(corners, axis) {
  const projections = corners.map(corner => (corner.x * axis.x + corner.y * axis.y) / (axis.x * axis.x + axis.y * axis.y));
  return { min: Math.min(...projections), max: Math.max(...projections) };
}

function updatePlayerPosition() {
  const glideFactor = player.health * 0.0025 + 0.0125;
  player.x += (player.targetX - player.x) * glideFactor;

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
  elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Draw timer text
  ctx.fillStyle = 'black';
  ctx.font = 'bold 24px Arial'; // 50% bigger
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeText(`Time: ${elapsed} s`, timerX, timerY);
  ctx.fillText(`Time: ${elapsed} s`, timerX, timerY);
}

function update() {
  if (isGameOver) return; // Stop the game loop when the game is over

  // Clear the canvas for redrawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  generateItem();

  updatePlayerPosition();
  drawPlayer();
  updateItems();
  drawItems();
  drawHealthBar();
  drawTimer();

  // Decrease health over time
  player.health = Math.max(player.health - 0.006, 0);

  // Increase item speed over time
  itemSpeed += 0.002;

  // Adjust item generation frequency
  itemFrequency = initialItemFrequency / (itemSpeed / 2);
  bonusFrequency = initialBonusFrequency / (itemSpeed / 2);

  frame++;
  requestAnimationFrame(update);
}

function endGame() {
  isGameOver = true;
  document.getElementById('gameOverMessage').innerText = `Your epic fentanyl bender lasted for ${elapsed} glorious seconds before you got caught!`;
  document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
  isGameOver = false;
  document.getElementById('gameOver').style.display = 'none';
  player.health = 0;
  items.length = 0;
  frame = 0;
  itemSpeed = 2;
  itemFrequency = initialItemFrequency;
  bonusFrequency = initialBonusFrequency;
  backgroundY = 0;
  startTime = Date.now();
  update();
}

// Start the game and set the start time
startTime = Date.now();
update();
