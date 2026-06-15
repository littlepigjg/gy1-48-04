import { ORE_PRICES, ORE_NAMES, UPGRADE_DEFS, TILE_SIZE, SURFACE_Y, DEPTH_BONUS_MULTIPLIER } from './constants.js';
import { dailyChallenge, DAILY_CHALLENGE_BADGES } from './dailyChallenge.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.warningTimeout = null;
    this.setupShopButtons();
    this.setupTeleportButton();
    this.setupDailyChallengeButtons();
  }

  setupTeleportButton() {
    document.getElementById('teleportBtn').addEventListener('click', () => {
      this.game.tryTeleport();
    });
  }

  setupShopButtons() {
    document.getElementById('sellAllBtn').addEventListener('click', () => {
      const maxDepth = this.game.player.maxDepth;
      const depthBonus = 1 + maxDepth * DEPTH_BONUS_MULTIPLIER;
      const result = this.game.player.sellOres(ORE_PRICES, depthBonus);
      if (result.total > 0) {
        let msg = `售出矿石获得 $${result.total}`;
        if (result.bonus > 0) {
          msg += ` (含深度加成 +$${result.bonus})`;
        }
        this.showWarning(msg, 2000, 'text-green-300');
      }
      this.updateShop();
    });

    document.getElementById('refuelBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 50) {
        this.game.player.gold -= 50;
        this.game.player.fuel = this.game.player.maxFuel;
        this.updateShop();
      }
    });

    document.getElementById('refillOxygenBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 30) {
        this.game.player.gold -= 30;
        this.game.player.oxygen = this.game.player.maxOxygen;
        this.updateShop();
      }
    });

    document.getElementById('coolBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 20) {
        this.game.player.gold -= 20;
        this.game.player.heat = 20;
        this.updateShop();
      }
    });

    document.getElementById('repairBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 40) {
        this.game.player.gold -= 40;
        this.game.player.health = this.game.player.maxHealth;
        this.updateShop();
      }
    });

    document.getElementById('closeShopBtn').addEventListener('click', () => {
      this.closeShop();
    });
  }

  updateHUD() {
    const p = this.game.player;
    const depth = Math.max(0, p.tileY - SURFACE_Y);

    this.setBar('fuel', p.fuel, p.maxFuel);
    this.setBar('oxygen', p.oxygen, p.maxOxygen);
    this.setBar('heat', p.heat, p.maxHeat);
    this.setBar('cargo', p.cargoUsed, p.maxCargo);
    this.setBar('health', p.health, p.maxHealth);

    document.getElementById('goldText').textContent = Math.floor(p.gold);
    document.getElementById('depthText').textContent = depth;

    const depthBonus = Math.floor(depth * DEPTH_BONUS_MULTIPLIER * 100);
    const bonusEl = document.getElementById('depthBonus');
    if (depthBonus > 0) {
      bonusEl.classList.remove('hidden');
      document.getElementById('depthBonusText').textContent = `+${depthBonus}%`;
    } else {
      bonusEl.classList.add('hidden');
    }

    document.getElementById('oreGold').textContent = p.cargo.gold;
    document.getElementById('oreIron').textContent = p.cargo.iron;
    document.getElementById('oreDiamond').textContent = p.cargo.diamond;
    document.getElementById('oreCoal').textContent = p.cargo.coal;
    document.getElementById('oreEmerald').textContent = p.cargo.emerald;
    document.getElementById('oreRuby').textContent = p.cargo.ruby;

    this.updateTeleportUI();
    this.checkWarnings();
  }

  updateTeleportUI() {
    const tele = this.game.teleport;
    const p = this.game.player;
    const depth = Math.max(0, p.tileY - SURFACE_Y);
    const cost = tele.calculateCost(depth);

    const btn = document.getElementById('teleportBtn');
    const costEl = document.getElementById('teleportCost');
    const progressWrap = document.getElementById('teleportProgressWrap');
    const progressBar = document.getElementById('teleportProgressBar');
    const cooldownEl = document.getElementById('teleportCooldown');
    const cooldownText = document.getElementById('teleportCooldownText');

    costEl.textContent = `$${cost}`;

    if (depth < 2) {
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
      costEl.textContent = '已在地面';
    } else {
      btn.style.opacity = p.gold >= cost ? '1' : '0.6';
      btn.style.cursor = 'pointer';
    }

    if (tele.isTeleporting()) {
      progressWrap.classList.remove('hidden');
      progressBar.style.width = tele.getProgressPercent() + '%';
      btn.classList.add('hidden');
      cooldownEl.classList.add('hidden');
    } else {
      progressWrap.classList.add('hidden');
      btn.classList.remove('hidden');

      const cooldown = tele.getCooldownPercent();
      if (cooldown > 0) {
        cooldownEl.classList.remove('hidden');
        cooldownText.textContent = Math.ceil((cooldown / 100) * 5) + 's';
        btn.style.opacity = '0.4';
      } else {
        cooldownEl.classList.add('hidden');
      }
    }
  }

  setBar(name, value, max) {
    const bar = document.getElementById(name + 'Bar');
    const text = document.getElementById(name + 'Text');
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    bar.style.width = pct + '%';
    text.textContent = `${Math.floor(value)}/${Math.floor(max)}`;
  }

  checkWarnings() {
    const p = this.game.player;
    const warnings = [];

    if (p.fuel < p.maxFuel * 0.15) warnings.push('⚠️ 燃料不足！');
    if (p.oxygen < p.maxOxygen * 0.15) warnings.push('⚠️ 氧气不足！');
    if (p.heat > p.maxHeat * 0.8) warnings.push('⚠️ 温度过高！');
    if (p.health < p.maxHealth * 0.2) warnings.push('⚠️ 机身受损严重！');
    if (p.cargoUsed >= p.maxCargo) warnings.push('📦 货仓已满！');

    const msg = warnings.join('  ');
    if (msg && !this.warningTimeout) {
      this.showWarning(msg, 2000);
    }
  }

  showWarning(text, duration = 2000, colorClass = 'text-red-200') {
    const el = document.getElementById('warningMessage');
    const textEl = document.getElementById('warningText');
    textEl.textContent = text;
    textEl.className = `font-game text-lg ${colorClass}`;
    el.classList.remove('hidden');

    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(() => {
      el.classList.add('hidden');
      this.warningTimeout = null;
    }, duration);
  }

  openShop() {
    if (!this.game.player.isOnSurface()) {
      this.showWarning('需要返回地面才能打开商店！', 1500);
      return false;
    }
    this.updateShop();
    document.getElementById('shopMenu').classList.remove('hidden');
    document.getElementById('shopMenu').classList.add('flex');
    this.game.paused = true;
    return true;
  }

  closeShop() {
    document.getElementById('shopMenu').classList.add('hidden');
    document.getElementById('shopMenu').classList.remove('flex');
    this.game.paused = false;
  }

  isShopOpen() {
    return !document.getElementById('shopMenu').classList.contains('hidden');
  }

  updateShop() {
    const p = this.game.player;
    document.getElementById('shopGold').textContent = Math.floor(p.gold);

    const sellArea = document.getElementById('sellArea');
    sellArea.innerHTML = '';
    for (const [type, count] of Object.entries(p.cargo)) {
      if (count > 0) {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-gray-300';
        div.innerHTML = `
          <span>${this.getOreIcon(type)} ${ORE_NAMES[type]} x${count}</span>
          <span class="text-yellow-400">$${count * ORE_PRICES[type]}</span>
        `;
        sellArea.appendChild(div);
      }
    }
    if (sellArea.children.length === 0) {
      sellArea.innerHTML = '<div class="text-gray-500 text-center py-2">货仓为空</div>';
    }

    const upgradeArea = document.getElementById('upgradeArea');
    upgradeArea.innerHTML = '';
    for (const [key, def] of Object.entries(UPGRADE_DEFS)) {
      const level = p.upgrades[key];
      const cost = p.getUpgradeCost(key);
      const isMaxed = cost === null;
      const canAfford = !isMaxed && p.gold >= cost;

      const div = document.createElement('div');
      div.className = 'bg-black/30 rounded p-3 border border-yellow-900';
      div.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="text-yellow-300 font-bold">${def.icon} ${def.name}</span>
          <span class="text-xs text-gray-400">Lv.${level}/${def.maxLevel}</span>
        </div>
        <div class="text-xs text-gray-400 mb-2">${def.description}</div>
        <button class="w-full py-1 px-2 rounded text-xs font-bold transition-all ${
          isMaxed ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
          canAfford ? 'bg-yellow-700 hover:bg-yellow-600 text-white border border-yellow-500' :
          'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
        }" ${isMaxed || !canAfford ? 'disabled' : `data-upgrade="${key}"`}>
          ${isMaxed ? '已满级' : `$${cost}`}
        </button>
      `;
      upgradeArea.appendChild(div);
    }

    upgradeArea.querySelectorAll('button[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.upgrade;
        if (p.buyUpgrade(type)) {
          this.updateShop();
        }
      });
    });
  }

  getOreIcon(type) {
    const icons = {
      coal: '⬛',
      iron: '🔩',
      gold: '🪙',
      emerald: '💚',
      ruby: '❤️',
      diamond: '💎'
    };
    return icons[type] || '🪨';
  }

  showGameOver(stats) {
    const screen = document.getElementById('gameOverScreen');
    const statsEl = document.getElementById('gameOverStats');
    statsEl.innerHTML = `
      <div>💰 最终金币: ${Math.floor(stats.gold)}</div>
      <div>📍 最深深度: ${stats.maxDepth}m</div>
      <div>⚔️ 击杀敌人: ${stats.enemiesKilled || 0}</div>
      <div>🪨 挖掘方块: ${stats.blocksDug || 0}</div>
    `;
    screen.classList.remove('hidden');
    screen.classList.add('flex');
  }

  hideGameOver() {
    const screen = document.getElementById('gameOverScreen');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
  }

  showHUD() {
    document.getElementById('hud').classList.remove('hidden');
  }

  hideHUD() {
    document.getElementById('hud').classList.add('hidden');
  }

  setupDailyChallengeButtons() {
    document.getElementById('dailyRetryBtn').addEventListener('click', () => {
      this.game.restartDailyChallenge();
    });

    document.getElementById('dailyBackBtn').addEventListener('click', () => {
      this.game.exitDailyChallenge();
    });

    document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
      this.hideLeaderboard();
    });

    document.getElementById('closeBadgesBtn').addEventListener('click', () => {
      this.hideBadges();
    });

    document.getElementById('changeNameBtn').addEventListener('click', () => {
      this.showNameInput();
    });

    document.getElementById('saveNameBtn').addEventListener('click', () => {
      const name = document.getElementById('playerNameInput').value.trim();
      if (name) {
        dailyChallenge.setPlayerName(name);
        document.getElementById('currentPlayerName').textContent = name;
      }
      this.hideNameInput();
    });

    document.getElementById('cancelNameBtn').addEventListener('click', () => {
      this.hideNameInput();
    });
  }

  showDailyChallengeInfo() {
    const challenge = dailyChallenge.getChallenge();
    document.getElementById('dailyChallengeDesc').textContent = challenge.description;
    document.getElementById('dailyChallengeInfo').classList.remove('hidden');
  }

  hideDailyChallengeInfo() {
    document.getElementById('dailyChallengeInfo').classList.add('hidden');
  }

  updateDailyChallengeHUD(timeElapsed, progress) {
    const challenge = dailyChallenge.getChallenge();
    const timeRemaining = Math.max(0, challenge.timeLimit - timeElapsed);
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    document.getElementById('dailyTimer').textContent = 
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const progressPercent = Math.floor(progress * 100);
    document.getElementById('dailyProgress').textContent = `${progressPercent}%`;
    document.getElementById('dailyProgressBar').style.width = `${progressPercent}%`;

    if (timeRemaining < 30) {
      document.getElementById('dailyTimer').classList.add('text-red-500', 'animate-pulse');
    } else {
      document.getElementById('dailyTimer').classList.remove('text-red-500', 'animate-pulse');
    }
  }

  showDailyChallengeResult(result) {
    const screen = document.getElementById('dailyChallengeResult');
    
    const titleEl = document.getElementById('dailyResultTitle');
    if (result.completed) {
      titleEl.textContent = '🎉 挑战成功！';
      titleEl.className = 'text-4xl text-center font-game mb-6 text-yellow-400';
    } else {
      titleEl.textContent = '⏱️ 挑战结束';
      titleEl.className = 'text-4xl text-center font-game mb-6 text-orange-400';
    }

    document.getElementById('dailyResultCompleted').textContent = result.completed ? '✅ 已完成' : '❌ 未完成';
    document.getElementById('dailyResultCompleted').className = `font-bold ${result.completed ? 'text-green-400' : 'text-red-400'}`;
    document.getElementById('dailyResultProgress').textContent = `${Math.floor(result.progress * 100)}%`;
    
    const minutes = Math.floor(result.timeTaken / 60);
    const seconds = Math.floor(result.timeTaken % 60);
    document.getElementById('dailyResultTime').textContent = `${minutes}分${seconds}秒`;
    
    document.getElementById('dailyResultScore').textContent = result.score;
    
    if (result.rank > 0) {
      document.getElementById('dailyResultRank').textContent = `第 ${result.rank} 名 / 共 ${result.totalPlayers} 人`;
    } else {
      document.getElementById('dailyResultRank').textContent = '未上榜';
    }

    const badgeEl = document.getElementById('dailyResultBadge');
    if (result.badge && result.completed) {
      badgeEl.classList.remove('hidden');
      document.getElementById('dailyBadgeIcon').textContent = this.getBadgeIcon(result.badge.key);
      document.getElementById('dailyBadgeName').textContent = `${result.badge.name}徽章`;
      document.getElementById('dailyBadgeName').style.color = result.badge.color;
    } else {
      badgeEl.classList.add('hidden');
    }

    const rewardsEl = document.getElementById('dailyRewards');
    if (result.rewards.gold > 0) {
      rewardsEl.innerHTML = `💰 金币 +${result.rewards.gold}`;
    } else {
      rewardsEl.innerHTML = '完成挑战以获得奖励';
    }

    screen.classList.remove('hidden');
    screen.classList.add('flex');
  }

  hideDailyChallengeResult() {
    const screen = document.getElementById('dailyChallengeResult');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
  }

  showStartScreen() {
    document.getElementById('startScreen').classList.remove('hidden');
    this.hideHUD();
    this.hideDailyChallengeInfo();
    this.hideDailyChallengeResult();
    this.hideGameOver();
  }

  showLeaderboard() {
    const challenge = dailyChallenge.getChallenge();
    const leaderboard = dailyChallenge.getLeaderboard();
    
    document.getElementById('leaderboardDate').textContent = `日期: ${challenge.dateKey}`;
    
    const listEl = document.getElementById('leaderboardList');
    if (leaderboard.length === 0) {
      listEl.innerHTML = '<div class="text-center text-gray-500 py-4">暂无记录，快来挑战吧！</div>';
    } else {
      listEl.innerHTML = leaderboard.map((entry, index) => `
        <div class="flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-yellow-900/50 border border-yellow-600' : 
          index === 1 ? 'bg-gray-700/50 border border-gray-500' : 
          index === 2 ? 'bg-amber-900/50 border border-amber-700' : 'bg-black/30 border border-gray-700'}">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
            <div>
              <div class="font-bold text-white">${entry.playerName}</div>
              <div class="text-xs text-gray-400">${entry.completed ? '✅ 已完成' : '⏱️ 未完成'} · ${Math.floor(entry.progress * 100)}%</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-yellow-400">${entry.score}分</div>
            <div class="text-xs text-gray-400">深度${entry.maxDepth}m · 击杀${entry.enemiesKilled}</div>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('currentPlayerName').textContent = dailyChallenge.getPlayerName();
    
    const screen = document.getElementById('leaderboardPanel');
    screen.classList.remove('hidden');
    screen.classList.add('flex');
  }

  hideLeaderboard() {
    const screen = document.getElementById('leaderboardPanel');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
  }

  showBadges() {
    const badges = dailyChallenge.getBadges();
    const listEl = document.getElementById('badgesList');
    const noBadgesMsg = document.getElementById('noBadgesMsg');

    if (badges.length === 0) {
      listEl.innerHTML = '';
      noBadgesMsg.classList.remove('hidden');
    } else {
      noBadgesMsg.classList.add('hidden');
      listEl.innerHTML = badges.map(badge => `
        <div class="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-4 border-2 text-center" style="border-color: ${badge.color}">
          <div class="text-5xl mb-2">${this.getBadgeIcon(badge.key)}</div>
          <div class="font-bold text-lg mb-1" style="color: ${badge.color}">${badge.name}徽章</div>
          <div class="text-xs text-gray-400">${badge.dateKey}</div>
          <div class="text-xs text-gray-500 mt-1">深度${badge.stats.maxDepth}m · 击杀${badge.stats.enemiesKilled}</div>
        </div>
      `).join('');
    }

    const screen = document.getElementById('badgesPanel');
    screen.classList.remove('hidden');
    screen.classList.add('flex');
  }

  hideBadges() {
    const screen = document.getElementById('badgesPanel');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
  }

  showNameInput() {
    document.getElementById('playerNameInput').value = dailyChallenge.getPlayerName();
    const screen = document.getElementById('nameInputModal');
    screen.classList.remove('hidden');
    screen.classList.add('flex');
    document.getElementById('playerNameInput').focus();
  }

  hideNameInput() {
    const screen = document.getElementById('nameInputModal');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
  }

  getBadgeIcon(key) {
    const icons = {
      BRONZE: '🥉',
      SILVER: '🥈',
      GOLD: '🥇',
      PLATINUM: '💎'
    };
    return icons[key] || '🏅';
  }
}
