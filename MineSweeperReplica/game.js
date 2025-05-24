// Constants
const BOARD_SIZE = 10;
const BOARD_SIZE_IMPOSSIBLE = 12;
const DIFFICULTIES = {
  EASY: { cost: 10, squares: 100, bombs: 10, reward: 20, size: 10 },
  NORMAL: { cost: 200, squares: 100, bombs: 25, reward: 300, size: 10 },
  HARD: { cost: 1000, squares: 100, bombs: 50, reward: 2000, size: 10 },
  IMPOSSIBLE: {
    cost: 100000,
    squares: 192,
    bombs: 75,
    reward: 500000,
    size: 12,
  },
};

// Game state
let board = [];
let gameState = "title";
let playerName = "";
let playerPassword = "";
let time = 0;
let timer;
let leaderboard = [];
let players = {};
let currentPlayer = null;
let currentDifficulty = null;
let pointsLeaderboard = [];

// DOM Elements
const titleScreen = document.getElementById("titleScreen");
const loginScreen = document.getElementById("loginScreen");
const difficultyScreen = document.getElementById("difficultyScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameBoard = document.getElementById("gameBoard");
const playerDisplay = document.getElementById("playerDisplay");
const pointsDisplay = document.getElementById("pointsDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const leaderboardElement = document.getElementById("leaderboard");
const playerInfoDisplay = document.getElementById("playerInfoDisplay");
const showLeaderboardButton = document.getElementById("showLeaderboard");
const leaderboardModal = document.getElementById("leaderboardModal");
const closeLeaderboardButton = leaderboardModal.querySelector(".close");
const difficultySelect = document.getElementById("difficultySelect");

// Event Listeners
document.getElementById("startGame").addEventListener("click", showLoginScreen);
document.getElementById("login").addEventListener("click", handleLogin);
document.getElementById("newGame").addEventListener("click", showLoginScreen);
document
  .getElementById("easyButton")
  .addEventListener("click", () => startGame("EASY"));
document
  .getElementById("normalButton")
  .addEventListener("click", () => startGame("NORMAL"));
document
  .getElementById("hardButton")
  .addEventListener("click", () => startGame("HARD"));
document
  .getElementById("impossibleButton")
  .addEventListener("click", () => startGame("IMPOSSIBLE"));
showLeaderboardButton.addEventListener("click", showLeaderboard);
closeLeaderboardButton.addEventListener("click", hideLeaderboard);
difficultySelect.addEventListener("change", updateTimeLeaderboard);

function showLoginScreen() {
  titleScreen.style.display = "none";
  loginScreen.style.display = "block";
}

function handleLogin() {
  playerName = document.getElementById("playerName").value.trim();
  playerPassword = document.getElementById("playerPassword").value;

  if (playerName && playerPassword) {
    if (players[playerName]) {
      if (players[playerName].password === playerPassword) {
        currentPlayer = players[playerName];
        showDifficultyScreen();
      } else {
        alert("Incorrect password");
      }
    } else {
      players[playerName] = {
        name: playerName,
        password: playerPassword,
        points: 100,
      };
      currentPlayer = players[playerName];
      showDifficultyScreen();
    }
    localStorage.setItem("diseBugSweeperPlayers", JSON.stringify(players));
  }
}

function showDifficultyScreen() {
  loginScreen.style.display = "none";
  difficultyScreen.style.display = "block";
  updateDifficultyButtons();
  updatePlayerInfoDisplay();
}

function updatePlayerInfoDisplay() {
  playerInfoDisplay.textContent = `Player: ${currentPlayer.name} | Points: ${currentPlayer.points}`;
}

function updateDifficultyButtons() {
  for (const [difficulty, settings] of Object.entries(DIFFICULTIES)) {
    const button = document.getElementById(`${difficulty.toLowerCase()}Button`);
    button.disabled = currentPlayer.points < settings.cost;
    button.textContent = `${difficulty} (Cost: ${settings.cost}, Reward: ${settings.reward})`;
  }
}

function startGame(difficulty) {
  currentDifficulty = DIFFICULTIES[difficulty];
  if (currentPlayer.points < currentDifficulty.cost) {
    alert("Not enough points to play this difficulty!");
    return;
  }

  currentPlayer.points -= currentDifficulty.cost;
  difficultyScreen.style.display = "none";
  gameScreen.style.display = "block";
  initializeBoard();
  renderBoard();
  playerDisplay.textContent = `Player: ${currentPlayer.name}`;
  pointsDisplay.textContent = `Points: ${currentPlayer.points}`;
  time = 0;
  updateTimeDisplay();
  timer = setInterval(updateTime, 1000);
  gameState = "playing";
}

function initializeBoard() {
  const size = currentDifficulty.size;
  board = Array(size)
    .fill()
    .map(() =>
      Array(size)
        .fill()
        .map(() => ({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        })),
    );

  // Place mines
  let minesPlaced = 0;
  while (minesPlaced < currentDifficulty.bombs) {
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    if (!board[row][col].isMine) {
      board[row][col].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate neighbor mines
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!board[row][col].isMine) {
        board[row][col].neighborMines = countNeighborMines(row, col);
      }
    }
  }
}

function countNeighborMines(row, col) {
  let count = 0;
  const size = currentDifficulty.size;
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      if (row + r >= 0 && row + r < size && col + c >= 0 && col + c < size) {
        if (board[row + r][col + c].isMine) count++;
      }
    }
  }
  return count;
}

function renderBoard() {
  gameBoard.innerHTML = "";
  const size = currentDifficulty.size;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener("click", () => handleCellClick(row, col));
      cell.addEventListener("contextmenu", (e) =>
        handleCellRightClick(e, row, col),
      );
      gameBoard.appendChild(cell);
    }
  }
  gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
}

function updateCellDisplay(row, col) {
  const size = currentDifficulty.size;
  const cell = gameBoard.children[row * size + col];
  const cellData = board[row][col];

  if (cellData.isRevealed) {
    cell.classList.add("revealed");
    if (cellData.isMine) {
      cell.classList.add("mine");
      cell.textContent = "💣";
    } else if (cellData.neighborMines > 0) {
      cell.textContent = cellData.neighborMines;
      cell.classList.add(`neighbors-${cellData.neighborMines}`);
    }
  } else if (cellData.isFlagged) {
    cell.textContent = "🚩";
  } else {
    cell.textContent = "";
  }
}

function handleCellClick(row, col) {
  if (gameState !== "playing") return;

  const cell = board[row][col];
  if (cell.isFlagged || cell.isRevealed) return;

  if (cell.isMine) {
    gameOver();
  } else {
    revealCell(row, col);
    if (checkWin()) {
      handleWin();
    }
  }
}

function handleCellRightClick(e, row, col) {
  e.preventDefault();
  if (gameState !== "playing") return;

  const cell = board[row][col];
  if (!cell.isRevealed) {
    cell.isFlagged = !cell.isFlagged;
    updateCellDisplay(row, col);
  }
}

function revealCell(row, col) {
  const cell = board[row][col];
  if (cell.isRevealed || cell.isFlagged) return;

  cell.isRevealed = true;
  updateCellDisplay(row, col);

  if (cell.neighborMines === 0) {
    const size = currentDifficulty.size;
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        if (row + r >= 0 && row + r < size && col + c >= 0 && col + c < size) {
          revealCell(row + r, col + c);
        }
      }
    }
  }
}

function handleWin() {
  clearInterval(timer);
  gameState = "over";
  currentPlayer.points += currentDifficulty.reward;
  updateLeaderboard();
  showGameOverScreen();
  document.getElementById("gameOverMessage").textContent = "You Win!";
  document.getElementById("timeTaken").textContent =
    `Time taken: ${time} seconds`;
  localStorage.setItem("diseBugSweeperPlayers", JSON.stringify(players));
}

function gameOver() {
  clearInterval(timer);
  gameState = "over";
  revealAllMines();
  showGameOverScreen();
  document.getElementById("gameOverMessage").textContent =
    "Hit a bomb! Game Over";
  document.getElementById("timeTaken").style.display = "none";
  localStorage.setItem("diseBugSweeperPlayers", JSON.stringify(players));
}

function revealAllMines() {
  const size = currentDifficulty.size;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col].isMine) {
        board[row][col].isRevealed = true;
        updateCellDisplay(row, col);
      }
    }
  }
}

function checkWin() {
  const size = currentDifficulty.size;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!board[row][col].isMine && !board[row][col].isRevealed) {
        return false;
      }
    }
  }
  return true;
}

function updateTime() {
  time++;
  updateTimeDisplay();
}

function updateTimeDisplay() {
  timeDisplay.textContent = `Time: ${time} seconds`;
}

function updateLeaderboard() {
  // Update time-based leaderboard
  leaderboard =
    JSON.parse(localStorage.getItem("diseBugSweeperLeaderboard")) || [];
  leaderboard.push({
    name: currentPlayer.name,
    time: time,
    difficulty: Object.keys(DIFFICULTIES).find(
      (key) => DIFFICULTIES[key] === currentDifficulty,
    ),
  });
  leaderboard.sort((a, b) => a.time - b.time);
  localStorage.setItem(
    "diseBugSweeperLeaderboard",
    JSON.stringify(leaderboard),
  );

  // Update points-based leaderboard
  pointsLeaderboard = Object.values(players).map((player) => ({
    name: player.name,
    points: player.points,
  }));
  pointsLeaderboard.sort((a, b) => b.points - a.points);
  pointsLeaderboard = pointsLeaderboard.slice(0, 10);
  localStorage.setItem(
    "diseBugSweeperPointsLeaderboard",
    JSON.stringify(pointsLeaderboard),
  );
}

function showGameOverScreen() {
  gameScreen.style.display = "none";
  gameOverScreen.style.display = "block";
  document.getElementById("finalScore").textContent =
    `Final Score: ${currentPlayer.points}`;
  renderLeaderboards();
  document.getElementById("playAgainButton").addEventListener("click", () => {
    gameOverScreen.style.display = "none";
    difficultyScreen.style.display = "block";
  });
}

function showLeaderboard() {
  leaderboardModal.style.display = "block";
  renderLeaderboards();
}

function hideLeaderboard() {
  leaderboardModal.style.display = "none";
}

function renderLeaderboards() {
  renderPointsLeaderboard();
  updateTimeLeaderboard();
}

function renderPointsLeaderboard() {
  const pointsLeaderboardElement = document.getElementById("pointsLeaderboard");
  pointsLeaderboardElement.innerHTML = "";
  pointsLeaderboard.forEach((entry, index) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} - ${entry.points} points`;
    pointsLeaderboardElement.appendChild(li);
  });
}

function updateTimeLeaderboard() {
  const selectedDifficulty = difficultySelect.value;
  const timeLeaderboardElement = document.getElementById("timeLeaderboard");
  timeLeaderboardElement.innerHTML = "";

  const filteredLeaderboard = leaderboard.filter(
    (entry) => entry.difficulty === selectedDifficulty,
  );
  filteredLeaderboard.forEach((entry, index) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} - ${entry.time} seconds`;
    timeLeaderboardElement.appendChild(li);
  });
}

// Initialize the game
gameState = "title";
leaderboard =
  JSON.parse(localStorage.getItem("diseBugSweeperLeaderboard")) || [];
pointsLeaderboard =
  JSON.parse(localStorage.getItem("diseBugSweeperPointsLeaderboard")) || [];
players = JSON.parse(localStorage.getItem("diseBugSweeperPlayers")) || {};
