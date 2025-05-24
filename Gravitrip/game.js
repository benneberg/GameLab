// Game Elements
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("end-screen");
const startButton = document.getElementById("start-button");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const timerDisplay = document.getElementById("timer");
const bestTimeDisplay = document.getElementById("best-time");
const resultMessage = document.getElementById("result-message");
const finalTimeDisplay = document.getElementById("final-time");

// Game Settings
const BALL_RADIUS = 10;
const HOLE_RADIUS = 15;
let ball = { x: 50, y: 50, vx: 0, vy: 0 };
let holes = [];
let walls = [];
let startTime = 0;
let currentTime = 0;
let gameInterval;
let currentDifficulty = "easy"; // Default difficulty
let bestTime = localStorage.getItem(`bestTime-${currentDifficulty}`) || 0;
let currentMaze = { walls: [], holes: [] };

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.8;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ===== Initialize Game =====
function init() {
    updateBestTimeDisplay();
    setupEventListeners();
}

// ===== Set Up Event Listeners =====
function setupEventListeners() {
    // Difficulty selection
    document.querySelectorAll(".difficulty-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            currentDifficulty = this.dataset.difficulty;
            bestTime = localStorage.getItem(`bestTime-${currentDifficulty}`) || 0;
            updateBestTimeDisplay();
        });
    });

    // Start Game button
    document.getElementById("start-button").addEventListener("click", startGame);

    // Restart buttons
    document.getElementById("restart-button").addEventListener("click", restartGame);
    document.getElementById("start-over-button").addEventListener("click", showStartScreen);
}

// ===== Game State =====
const DIFFICULTY_SETTINGS = {
    easy: { walls: 5, holes: 3, mazeSize: 0.7 },
    normal: { walls: 8, holes: 5, mazeSize: 0.8 },
    hard: { walls: 12, holes: 8, mazeSize: 0.9 },
    expert: { walls: 16, holes: 12, mazeSize: 1.0 }
};

// Generate maze 
// Maze Generator (DFS Algorithm)
function generateMaze(difficulty = "easy") {
    const { walls: wallCount, holes: holeCount, mazeSize } = DIFFICULTY_SETTINGS[difficulty];
    const cellSize = 40; // Size of each maze cell
    const cols = Math.floor((canvas.width * mazeSize) / cellSize);
    const rows = Math.floor((canvas.height * mazeSize) / cellSize);

    // Initialize grid (1 = wall, 0 = path)
    let grid = Array(rows).fill().map(() => Array(cols).fill(1));

    // DFS Maze Generation
    let stack = [];
    let start = { x: 1, y: 1 }; // Start cell (top-left)
    grid[start.y][start.x] = 0; // Open start
    stack.push(start);

    while (stack.length > 0) {
        let current = stack.pop();
        let neighbors = getUnvisitedNeighbors(current, grid, rows, cols);

        if (neighbors.length > 0) {
            stack.push(current);
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            grid[next.y][next.x] = 0; // Carve path
            stack.push(next);
        }
    }

    // Convert grid to walls and paths
    walls = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1) {
                walls.push({
                    x: x * cellSize,
                    y: y * cellSize,
                    width: cellSize,
                    height: cellSize
                });
            }
        }
    }

    // Add borders (optional)
    walls.push(
        { x: 0, y: 0, width: cols * cellSize, height: 20 },
        { x: 0, y: 0, width: 20, height: rows * cellSize },
        { x: cols * cellSize - 20, y: 0, width: 20, height: rows * cellSize },
        { x: 0, y: rows * cellSize - 20, width: cols * cellSize, height: 20 }
    );

    // Place holes in dead ends
    holes = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 0 && isDeadEnd(x, y, grid)) {
                if (Math.random() < 0.3 * DIFFICULTY_SETTINGS[difficulty].holes / 8) {
                    holes.push({
                        x: x * cellSize + cellSize / 2,
                        y: y * cellSize + cellSize / 2
                    });
                }
            }
        }
    }

    // Set start and end points
    ball = { x: cellSize * 1.5, y: cellSize * 1.5, vx: 0, vy: 0 };
    endPoint = { x: (cols - 2) * cellSize + cellSize / 2, y: (rows - 2) * cellSize + cellSize / 2 };

    currentMaze = { walls: [...walls], holes: [...holes] };
}

// ===== Helper: Get Unvisited Neighbors (DFS) =====
function getUnvisitedNeighbors(cell, grid, rows, cols) {
    let neighbors = [];
    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]]; // Up, right, down, left

    for (let [dx, dy] of dirs) {
        let nx = cell.x + dx;
        let ny = cell.y + dy;

        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx] === 1) {
            neighbors.push({ x: nx, y: ny });
        }
    }
    return neighbors;
}

// ===== Helper: Check Dead Ends =====
function isDeadEnd(x, y, grid) {
    let paths = 0;
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    for (let [dx, dy] of dirs) {
        if (grid[y + dy]?.[x + dx] === 0) paths++;
    }
    return paths <= 1; // Dead end if only 1 connected path
}

// Draw game elements
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw wooden background
    ctx.fillStyle = "#D2B48C";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw walls (wooden beams)
    ctx.fillStyle = "#5D4037";
    walls.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Draw holes
    ctx.fillStyle = "#000";
    holes.forEach(hole => {
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, HOLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw ball
    ctx.fillStyle = "#E53935"; // Red marble
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 5;
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
}

// Check collisions
function checkCollisions() {
    // Wall collisions (improved)
    walls.forEach(wall => {
        // Find closest point on the wall to the ball
        let closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.width));
        let closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.height));

        // Calculate distance from ball to closest wall point
        const dx = ball.x - closestX;
        const dy = ball.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Collision happens if distance < ball radius
        if (distance < BALL_RADIUS) {
            // Calculate overlap
            const overlap = BALL_RADIUS - distance;
            
            // Normalize direction vector
            const nx = dx / distance;
            const ny = dy / distance;

            // Push ball out of the wall
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Bounce effect (optional)
            const bounceFactor = 0.5;
            ball.vx = -ball.vx * bounceFactor;
            ball.vy = -ball.vy * bounceFactor;
        }
    });

    // Hole collisions (unchanged)
    holes.forEach(hole => {
        const dx = ball.x - hole.x;
        const dy = ball.y - hole.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < HOLE_RADIUS + BALL_RADIUS) {
            endGame(false);
        }
    });

    // Check if reached end point
    const dx = ball.x - endPoint.x;
    const dy = ball.y - endPoint.y;
    if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS + 10) {
        endGame(true);
    }
}

// Update game state
function update() {
    // Apply friction
    ball.vx *= 0.98;
    ball.vy *= 0.98;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Keep ball in bounds
    ball.x = Math.max(BALL_RADIUS, Math.min(canvas.width - BALL_RADIUS, ball.x));
    ball.y = Math.max(BALL_RADIUS, Math.min(canvas.height - BALL_RADIUS, ball.y));

    checkCollisions();
    draw();

    // Update timer
    currentTime = (Date.now() - startTime) / 1000;
    timerDisplay.textContent = `Time: ${currentTime.toFixed(2)}s`;
}

// Handle device tilt
function handleOrientation(event) {
    const beta = event.beta;  // -180 to 180 (left/right tilt)
    const gamma = event.gamma; // -90 to 90 (front/back tilt)

    // Adjust sensitivity as needed
    ball.vx = gamma * 0.1;
    ball.vy = beta * 0.1;
}

// Handle shake event
function handleShake() {
    const shakeThreshold = 15;
    let lastX = 0, lastY = 0, lastZ = 0;

    return function(event) {
        const { x, y, z } = event.accelerationIncludingGravity;
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);

        if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
            resetBall();
        }

        lastX = x;
        lastY = y;
        lastZ = z;
    };
}

function resetBall() {
    ball.x = 50;
    ball.y = 50;
    ball.vx = 0;
    ball.vy = 0;
}

// Start game
function startGame() {
    generateMaze(currentDifficulty);
    startTime = Date.now();
    gameScreen.classList.remove("hidden");
    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameInterval = setInterval(update, 16);

    // Request permission for iOS 13+ devices
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    window.addEventListener("devicemotion", handleShake());
                    window.addEventListener("deviceorientation", handleOrientation);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener("devicemotion", handleShake());
        }

    window.addEventListener("deviceorientation", handleOrientation);
}

// ===== Restart Game =====
function restartGame() {
    endScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    generateMaze(currentDifficulty);
    startTime = Date.now();
}

// ===== Show Start Screen =====
function showStartScreen() {
    endScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
}

// ===== Update Best Time Display =====
function updateBestTimeDisplay() {
    const bestTimeKey = `bestTime-${currentDifficulty}`;
    bestTime = localStorage.getItem(bestTimeKey) || 0;
    document.getElementById("best-time").textContent = 
        `Best Time (${currentDifficulty}): ${bestTime ? bestTime + "s" : "--"}`;
}
// End game
function endGame(success) {
    clearInterval(gameInterval);
    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");

    // Update UI
    finalTimeDisplay.textContent = `Time: ${currentTime.toFixed(2)}s`;
    resultMessage.textContent = success ? "You Win!" : "Game Over!";

    // Update best time (per difficulty)
    const bestTimeKey = `bestTime-${currentDifficulty}`;
    if (success && (currentTime < bestTime || bestTime === 0)) {
        bestTime = currentTime;
        localStorage.setItem(bestTimeKey, bestTime);
        bestTimeDisplay.textContent = `Best Time (${currentDifficulty}): ${bestTime.toFixed(2)}s`;
    }
}

// Start Over" Button
document.getElementById("start-over-button").addEventListener("click", () => {
    endScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
});

// Difficulty Selection
document.querySelectorAll(".difficulty-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        currentDifficulty = this.dataset.difficulty;
        bestTime = localStorage.getItem(`bestTime-${currentDifficulty}`) || 0;
        bestTimeDisplay.textContent = `Best Time (${currentDifficulty}): ${bestTime ? bestTime.toFixed(2) + "s" : "--"}`;
    });
});

// Event listeners
startButton.addEventListener("click", startGame);
document.getElementById("restart-button").addEventListener("click", () => {
    endScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    generateMaze(currentDifficulty); // Regenerate same difficulty
    startTime = Date.now();
});

// Show best time on start
bestTimeDisplay.textContent = bestTime === Infinity ? "Best Time: --" : `Best Time: ${bestTime.toFixed(2)}s`;

// ===== Initialize on Load =====
window.addEventListener("load", init);
