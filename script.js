const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Configuration & State
const TEAMS = [
  { name: 'Argentina', color: '#75aadb' },
  { name: 'Brazil', color: '#fbc02d' },
  { name: 'France', color: '#1565c0' },
  { name: 'England', color: '#ffffff' },
  { name: 'Spain', color: '#e53935' },
  { name: 'Germany', color: '#424242' },
  { name: 'Portugal', color: '#2e7d32' },
  { name: 'Netherlands', color: '#ef6c00' }
];

let selectedTeam = TEAMS[0];
let playerRole = 'GOALKEEPER'; // 'GOALKEEPER' or 'STRIKER'
let gameState = 'MENU'; // 'MENU', 'PLAYING', 'RESULT'

// Ball and Glove parameters tuned for easier Goalkeeper gameplay
const EASY_GLOVE_RADIUS = 50; // Doubled catch radius for forgiveness
const EASY_SHOT_SPEED = 0.015; // Slower shot travel time (1.5% per frame)

let ball = { x: 400, y: 400, z: 0, targetX: 400, targetY: 200, progress: 0, isMoving: false };
let gloves = { x: 400, y: 220 };
let score = { player: 0, opponent: 0 };
let kicks = 0;
const MAX_KICKS = 5;

// Elements
const overlay = document.getElementById('overlay-screen');
const teamGrid = document.getElementById('team-select');
const startBtn = document.getElementById('start-btn');
const scoreBoard = document.getElementById('score-board');
const kicksCount = document.getElementById('kicks-count');

// Setup UI
function initUI() {
  teamGrid.innerHTML = '';
  TEAMS.forEach((team, index) => {
    const card = document.createElement('div');
    card.className = `team-card ${index === 0 ? 'selected' : ''}`;
    card.innerText = team.name;
    card.addEventListener('click', () => {
      document.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTeam = team;
    });
    teamGrid.appendChild(card);
  });
}

startBtn.addEventListener('click', () => {
  const roleOption = document.querySelector('input[name="role"]:checked');
  if (roleOption) playerRole = roleOption.value;
  
  overlay.style.display = 'none';
  resetMatch();
  gameState = 'PLAYING';
  if (playerRole === 'GOALKEEPER') triggerAIShot();
});

// Canvas Mouse / Touch Controls
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  gloves.x = e.clientX - rect.left;
  gloves.y = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
  if (gameState === 'PLAYING' && playerRole === 'STRIKER' && !ball.isMoving) {
    const rect = canvas.getBoundingClientRect();
    ball.targetX = e.clientX - rect.left;
    ball.targetY = e.clientY - rect.top;
    ball.isMoving = true;
    ball.progress = 0;
  }
});

function resetMatch() {
  score = { player: 0, opponent: 0 };
  kicks = 0;
  resetBall();
  updateHUD();
}

function resetBall() {
  ball.x = 400;
  ball.y = 420;
  ball.progress = 0;
  ball.isMoving = false;
}

function triggerAIShot() {
  resetBall();
  // Aim anywhere inside or near the net bounds
  ball.targetX = 220 + Math.random() * 360;
  ball.targetY = 140 + Math.random() * 140;
  ball.isMoving = true;
}

function updateHUD() {
  scoreBoard.innerText = `Scores: ${score.player} - ${score.opponent}`;
  kicksCount.innerText = `Kicks: ${kicks} / ${MAX_KICKS}`;
}

// Main Render & Game Loop
function update() {
  if (gameState === 'PLAYING' && ball.isMoving) {
    ball.progress += EASY_SHOT_SPEED;
    
    // Interpolate current position
    const currentX = 400 + (ball.targetX - 400) * ball.progress;
    const currentY = 420 + (ball.targetY - 420) * ball.progress;
    
    // Check collision in Goalkeeper Mode
    if (playerRole === 'GOALKEEPER') {
      const dist = Math.hypot(gloves.x - currentX, gloves.y - currentY);
      if (dist < EASY_GLOVE_RADIUS) {
        // Saved!
        ball.isMoving = false;
        kicks++;
        updateHUD();
        checkMatchEnd("SAVED!");
        return;
      }
    }

    // Reach end of shot
    if (ball.progress >= 1) {
      ball.isMoving = false;
      kicks++;
      
      // Goal logic
      if (ball.targetX >= 180 && ball.targetX <= 620 && ball.targetY >= 120 && ball.targetY <= 300) {
        if (playerRole === 'GOALKEEPER') score.opponent++;
        else score.player++;
      }
      
      updateHUD();
      checkMatchEnd(playerRole === 'GOALKEEPER' ? "GOAL CONCEDED" : "GOAL SCORED!");
    }
  }
}

function checkMatchEnd(msg) {
  if (kicks >= MAX_KICKS) {
    setTimeout(() => {
      alert(`Match Finished! Final Score: ${score.player} - ${score.opponent}`);
      overlay.style.display = 'flex';
      gameState = 'MENU';
    }, 100);
  } else if (playerRole === 'GOALKEEPER') {
    setTimeout(triggerAIShot, 1200);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pitch Field
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Goal Post Structure
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(180, 120, 440, 180);

  // Net grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 180; x <= 620; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, 300); ctx.stroke();
  }
  for (let y = 120; y <= 300; y += 20) {
    ctx.beginPath(); ctx.moveTo(180, y); ctx.lineTo(620, y); ctx.stroke();
  }

  // Easy Feature: Glowing Target Marker (Shows where AI shot is heading)
  if (playerRole === 'GOALKEEPER' && ball.isMoving) {
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ball.targetX, ball.targetY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Draw Ball
  if (gameState === 'PLAYING') {
    const curX = ball.isMoving ? 400 + (ball.targetX - 400) * ball.progress : 400;
    const curY = ball.isMoving ? 420 + (ball.targetY - 420) * ball.progress : 420;
    const radius = 16 - (ball.progress * 6); // Perspective sizing

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(curX, curY, Math.max(radius, 8), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Easy Feature: Goalkeeper Gloves with Expanded Radius
  if (playerRole === 'GOALKEEPER' && gameState === 'PLAYING') {
    // Large catch zone indicator ring
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gloves.x, gloves.y, EASY_GLOVE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Glove graphics
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(gloves.x - 18, gloves.y, 14, 0, Math.PI * 2);
    ctx.arc(gloves.x + 18, gloves.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initUI();
loop();
