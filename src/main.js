import { Game } from './game/Game.js';
import { dailyChallenge } from './game/dailyChallenge.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
window._debugGame = game;

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startScreen').classList.add('hidden');
  game.init(false);
  game.start();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  game.restart();
});

document.getElementById('dailyChallengeBtn').addEventListener('click', () => {
  document.getElementById('startScreen').classList.add('hidden');
  game.startDailyChallenge();
});

document.getElementById('showLeaderboardBtn').addEventListener('click', () => {
  game.ui.showLeaderboard();
});

document.getElementById('showBadgesBtn').addEventListener('click', () => {
  game.ui.showBadges();
});
