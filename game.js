
(()=>{
"use strict";

const $ = id => document.getElementById(id);

const colors = [
  ["Red","#ff465f",0],
  ["Sky Blue","#39c9ff",13],
  ["Yellow","#ffd84d",26],
  ["White","#e9f5ff",39],
  ["Purple","#b66cff"],
  ["Pink","#ff65c8"],
  ["Green","#57e69b"],
  ["Orange","#ff9b45"],
  ["Cyan","#42f5e8"],
  ["Gold","#e9bd53"]
];

const path = [
[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],
[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],
[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
[7,14],[8,14],[8,13],[8,12],[8,11],
[8,10],[8,9],[9,8],[10,8],[11,8],
[12,8],[13,8],[14,8],[14,7],[14,6],
[13,6],[12,6],[11,6],[10,6],[9,6],
[8,5],[8,4],[8,3],[8,2],[8,1],
[8,0],[7,0],[6,0]
];

const lanes = [
[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]]
];

const bases = [[0,0],[0,9],[9,9],[9,0]];
const safe = [0,8,13,21,26,34,39,47];
const storageKey = "wludo-v1";

let game = null;
let audioContext = null;

function createPlayerPicks() {
  const count = Number($("count").value);

  const selected = count === 2
    ? [0,2]
    : count === 3
      ? [0,1,2]
      : [0,1,2,3];

  $("picks").innerHTML = selected.map((colorIndex,index) => `
    <div class="pick">
      <i class="dot"
         style="background:${colors[colorIndex][1]};
                color:${colors[colorIndex][1]}"></i>

      <input maxlength="14"
             value="Player ${index+1}"
             aria-label="Player ${index+1} name">

      <select aria-label="Player ${index+1} colour">
        ${colors.map((color,i) => `
          <option value="${i}"
            ${i === colorIndex ? "selected" : ""}>
            ${color[0]}
          </option>
        `).join("")}
      </select>
    </div>
  `).join("");
}

function saveGame() {
  if (!game) return;

  try {
    localStorage.setItem(storageKey,JSON.stringify(game));
    $("resume").hidden = false;
  } catch(error) {
    console.warn("Game could not be saved:",error);
  }
}

function startGame() {
  const players = [...$("picks").children].map((element,index) => ({
    name: element.querySelector("input").value.trim() || `Player ${index+1}`,
    ci: Number(element.querySelector("select").value),
    tokens: [-1,-1,-1,-1]
  }));

  const chosenColors = players.map(player => player.ci);

  if (new Set(chosenColors).size !== chosenColors.length) {
    alert("Har player ke liye alag colour select karo.");
    return;
  }

  game = {
    players,
    turn: 0,
    dice: null,
    moves: [],
    winner: null
  };

  $("setup").hidden = true;
  $("game").hidden = false;

  renderGame();
  saveGame();
}

function getCell(row,column) {
  return document.querySelector(
    `[data="${row}-${column}"]`
  );
}

function buildBoard() {
  const board = $("board");
  board.innerHTML = "";

  for (let row=0;row<15;row++) {
    for (let column=0;column<15;column++) {
      const element = document.createElement("div");

      element.className = "cell blank";
      element.dataset = `${row}-${column}`;

      board.appendChild(element);
    }
  }

  bases.forEach((position,index) => {
    const element = getCell(...position);

    element.className = "base";
    element.style.setProperty(
      "--base",
      colors[index][1]
    );

    element.innerHTML = `
      <div class="baseinner">
        ${[1,2,3,4].map(() => `
          <i style="--token:${colors[index][1]}"></i>
        `).join("")}
      </div>
    `;
  });

  path.forEach((position,index) => {
    const element = getCell(...position);

    element.className = "cell path";

    if (safe.includes(index)) {
      element.classList.add("safe");
    }
  });

  lanes.forEach((lane,index) => {
    lane.forEach(position => {
      const element = getCell(...position);

      element.className = "cell lane";
      element.style.setProperty(
        "--lane",
        colors[index][1]
      );
    });
  });

  const center = getCell(6,6);
  center.className = "cell center";

  for (let row=6;row<9;row++) {
    for (let column=6;column<9;column++) {
      if (row !== 6 || column !== 6) {
        getCell(row,column).style.visibility = "hidden";
      }
    }
  }
}

function tokenPosition(player,tokenIndex) {
  const value = player.tokens[tokenIndex];
  const colorIndex = player.ci;

  if (value < 0) {
    const offsets = [
      [1,1],[1,4],[4,1],[4,4]
    ];

    return [
      bases[colorIndex][0] + offsets[tokenIndex][0],
      bases[colorIndex][1] + offsets[tokenIndex][1]
    ];
  }

  if (value >= 52) {
    return lanes[colorIndex][Math.min(5,value-52)];
  }

  return path[
    (colors[colorIndex][2] + value) % 52
  ];
}

function getLegalMoves(player,dice) {
  const result = [];

  player.tokens.forEach((value,index) => {
    if (value === -1 && dice === 6) {
      result.push(index);
    } else if (
      value >= 0 &&
      value < 57 &&
      value + dice <= 57
    ) {
      result.push(index);
    }
  });

  return result;
}

function playSound(frequency=500) {
  if (!$("sound").checked) return;

  try {
    audioContext = audioContext || new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    gain.gain.value = 0.05;

    oscillator.start();

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.13
    );

    oscillator.stop(audioContext.currentTime + 0.14);

  } catch(error) {
    console.warn("Sound unavailable:",error);
  }
}

function renderGame() {
  if (!game) return;

  buildBoard();

  const currentPlayer = game.players[game.turn];
  const playerColor = colors[currentPlayer.ci][1];

  $("who").textContent = currentPlayer.name;
  $("who").style.setProperty("--player",playerColor);

  $("turn").textContent = currentPlayer.name + "'s turn";

  $("players").innerHTML = game.players.map((player,index) => `
    <div class="playerline"
      style="color:${colors[player.ci][1]}">
      ${player.name}
      ${index === game.turn ? " ● YOUR TURN" : ""}
      — ${player.tokens.filter(value => value === 57).length}/4 home
    </div>
  `).join("");

  game.players.forEach((player,playerIndex) => {
    player.tokens.forEach((value,tokenIndex) => {
      const [row,column] = tokenPosition(player,tokenIndex);
      const cell = getCell(row,column);

      const button = document.createElement("button");

      button.className = "token";
      button.textContent = tokenIndex + 1;

      button.style.setProperty(
        "--token",
        colors[player.ci][1]
      );

      if (
        playerIndex === game.turn &&
        game.moves.includes(tokenIndex)
      ) {
        button.classList.add("ready");

        button.onclick = () => moveToken(tokenIndex);
      } else {
        button.disabled = true;
      }

      cell.appendChild(button);
    });
  });

  const diceFaces = ["","⚀","⚁","⚂","⚃","⚄","⚅"];

  $("dice").textContent = game.dice
    ? diceFaces[game.dice]
    : "⚄";

  $("dice").disabled = game.dice !== null;
}

function nextTurn() {
  game.turn = (game.turn + 1) % game.players.length;
  game.dice = null;
  game.moves = [];

  $("hint").textContent = "Tap dice to roll";

  renderGame();
  saveGame();
}

function rollDice() {
  if (!game || game.dice !== null || game.winner !== null) {
    return;
  }

  game.dice = Math.floor(Math.random()*6)+1;

  const player = game.players[game.turn];

  game.moves = getLegalMoves(player,game.dice);

  $("hint").textContent = game.moves.length
    ? `You rolled ${game.dice}. Tap a glowing token.`
    : `You rolled ${game.dice}. No legal move.`;

  playSound(420);
  renderGame();
  saveGame();

  if (game.moves.length === 0) {
    $("dice").disabled = true;

    setTimeout(() => {
      nextTurn();
    },900);
  }
}

function moveToken(tokenIndex) {
  const player = game.players[game.turn];

  if (!game.moves.includes(tokenIndex)) return;

  const dice = game.dice;
  const oldValue = player.tokens[tokenIndex];

  player.tokens[tokenIndex] =
    oldValue === -1 ? 0 : oldValue + dice;

  const newValue = player.tokens[tokenIndex];

  if (newValue < 52) {
    const globalPosition =
      (colors[player.ci][2] + newValue) % 52;

    if (!safe.includes(globalPosition)) {
      game.players.forEach(opponent => {
        if (opponent === player) return;

        opponent.tokens = opponent.tokens.map(value => {
          if (value < 0 || value >= 52) return value;

          const opponentPosition =
            (colors[opponent.ci][2] + value) % 52;

          return opponentPosition === globalPosition
            ? -1
            : value;
        });
      });
    }
  }

  playSound(680);

  const hasWon = player.tokens.every(value => value === 57);

  game.dice = null;
  game.moves = [];

  if (hasWon) {
    game.winner = game.turn;
    saveGame();

    $("winner").textContent = player.name + " wins!";
    $("winDialog").showModal();

    return;
  }

  if (dice !== 6) {
    nextTurn();
  } else {
    $("hint").textContent = "Great! You rolled a six. Roll again.";
    renderGame();
    saveGame();
  }
}

function resumeGame() {
  try {
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      alert("No saved game found.");
      return;
    }

    game = JSON.parse(saved);

    if (!game || !Array.isArray(game.players)) {
      throw new Error("Invalid saved game");
    }

    game.dice = null;
    game.moves = [];

    $("setup").hidden = true;
    $("game").hidden = false;

    renderGame();

    $("hint").textContent =
      "Saved game restored. Roll to continue.";

  } catch(error) {
    alert("Saved game could not be opened. Start a new game.");
    console.error(error);
  }
}

function exitGame() {
  if (!$("game").hidden) {
    $("exitDialog").showModal();
  }
}

function confirmExit() {
  $("exitDialog").close();

  $("game").hidden = true;
  $("setup").hidden = false;

  saveGame();
}

function playAgain() {
  $("winDialog").close();

  $("game").hidden = true;
  $("setup").hidden = false;

  game = null;
}

$("count").addEventListener("change",createPlayerPicks);
$("start").addEventListener("click",startGame);
$("dice").addEventListener("click",rollDice);
$("resume").addEventListener("click",resumeGame);
$("exit").addEventListener("click",exitGame);
$("cancel").addEventListener("click",()=>$("exitDialog").close());
$("confirm").addEventListener("click",confirmExit);
$("again").addEventListener("click",playAgain);

createPlayerPicks();
buildBoard();

try {
  $("resume").hidden = !localStorage.getItem(storageKey);
} catch(error) {
  $("resume").hidden = true;
}

window.addEventListener("beforeunload",saveGame);

})();
  
