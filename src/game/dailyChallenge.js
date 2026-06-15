export const DAILY_CHALLENGE_TYPES = {
  DEPTH: 'depth',
  ORE: 'ore',
  ENEMY: 'enemy'
};

export const DAILY_CHALLENGE_BADGES = {
  BRONZE: { name: '青铜', color: '#CD7F32', threshold: 0.5 },
  SILVER: { name: '白银', color: '#C0C0C0', threshold: 0.75 },
  GOLD: { name: '黄金', color: '#FFD700', threshold: 0.9 },
  PLATINUM: { name: '铂金', color: '#E5E4E2', threshold: 1.0 }
};

export const DAILY_ORE_TARGETS = ['coal', 'iron', 'gold', 'emerald', 'ruby', 'diamond'];

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(array) {
    return array[this.nextInt(0, array.length - 1)];
  }
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export class DailyChallenge {
  constructor() {
    this.storageKey = 'deepDigger_dailyChallenge';
    this.leaderboardKey = 'deepDigger_leaderboard';
    this.badgesKey = 'deepDigger_badges';
    this.currentChallenge = null;
    this.dateKey = getDateKey();
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.dateKey === this.dateKey) {
          this.currentChallenge = data.challenge;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load daily challenge:', e);
    }
    this.generateNewChallenge();
  }

  generateNewChallenge() {
    const seed = hashString(this.dateKey);
    const rng = new SeededRandom(seed);
    
    const types = Object.values(DAILY_CHALLENGE_TYPES);
    const type = rng.pick(types);
    
    let target, description, timeLimit, difficulty;
    const difficultyRoll = rng.next();
    
    if (difficultyRoll < 0.4) {
      difficulty = 'easy';
      timeLimit = 300;
    } else if (difficultyRoll < 0.75) {
      difficulty = 'medium';
      timeLimit = 240;
    } else {
      difficulty = 'hard';
      timeLimit = 180;
    }

    switch (type) {
      case DAILY_CHALLENGE_TYPES.DEPTH: {
        const baseDepth = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 60 : 100;
        target = baseDepth + rng.nextInt(0, 20);
        description = `在${Math.floor(timeLimit / 60)}分钟内到达 ${target}m 深度`;
        break;
      }
      case DAILY_CHALLENGE_TYPES.ORE: {
        const oreType = rng.pick(DAILY_ORE_TARGETS);
        const oreIndex = DAILY_ORE_TARGETS.indexOf(oreType);
        const baseAmount = [50, 30, 15, 10, 8, 5][oreIndex];
        const multiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
        target = {
          oreType,
          amount: Math.floor(baseAmount * multiplier)
        };
        const oreNames = { coal: '煤炭', iron: '铁矿', gold: '金矿', emerald: '祖母绿', ruby: '红宝石', diamond: '钻石' };
        description = `在${Math.floor(timeLimit / 60)}分钟内收集 ${target.amount} 个${oreNames[oreType]}`;
        break;
      }
      case DAILY_CHALLENGE_TYPES.ENEMY: {
        const baseKills = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 35;
        target = baseKills + rng.nextInt(0, 10);
        description = `在${Math.floor(timeLimit / 60)}分钟内击杀 ${target} 个敌人`;
        break;
      }
    }

    this.currentChallenge = {
      dateKey: this.dateKey,
      seed,
      type,
      target,
      description,
      timeLimit,
      difficulty,
      rewards: {
        gold: difficulty === 'easy' ? 500 : difficulty === 'medium' ? 1000 : 2000
      }
    };

    this.save();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        dateKey: this.dateKey,
        challenge: this.currentChallenge
      }));
    } catch (e) {
      console.warn('Failed to save daily challenge:', e);
    }
  }

  getChallenge() {
    if (!this.currentChallenge || this.currentChallenge.dateKey !== this.dateKey) {
      this.load();
    }
    return this.currentChallenge;
  }

  getSeed() {
    return this.currentChallenge ? this.currentChallenge.seed : Date.now();
  }

  checkCompletion(stats) {
    if (!this.currentChallenge) return { completed: false, progress: 0 };
    
    const { type, target } = this.currentChallenge;
    let progress = 0;
    let completed = false;

    switch (type) {
      case DAILY_CHALLENGE_TYPES.DEPTH:
        progress = Math.min(1, stats.maxDepth / target);
        completed = stats.maxDepth >= target;
        break;
      case DAILY_CHALLENGE_TYPES.ORE:
        const oreCount = stats.cargo[target.oreType] || 0;
        progress = Math.min(1, oreCount / target.amount);
        completed = oreCount >= target.amount;
        break;
      case DAILY_CHALLENGE_TYPES.ENEMY:
        progress = Math.min(1, stats.enemiesKilled / target);
        completed = stats.enemiesKilled >= target;
        break;
    }

    return { completed, progress };
  }

  getLeaderboard() {
    try {
      const stored = localStorage.getItem(this.leaderboardKey);
      if (stored) {
        const data = JSON.parse(stored);
        return data[this.dateKey] || [];
      }
    } catch (e) {
      console.warn('Failed to load leaderboard:', e);
    }
    return [];
  }

  submitScore(playerName, stats, timeTaken) {
    const completion = this.checkCompletion(stats);
    const score = this.calculateScore(stats, timeTaken, completion);
    
    const entry = {
      playerName,
      score,
      completed: completion.completed,
      progress: completion.progress,
      timeTaken,
      maxDepth: stats.maxDepth,
      enemiesKilled: stats.enemiesKilled,
      timestamp: Date.now()
    };

    try {
      const stored = localStorage.getItem(this.leaderboardKey);
      const allData = stored ? JSON.parse(stored) : {};
      
      if (!allData[this.dateKey]) {
        allData[this.dateKey] = [];
      }
      
      allData[this.dateKey].push(entry);
      allData[this.dateKey].sort((a, b) => b.score - a.score);
      allData[this.dateKey] = allData[this.dateKey].slice(0, 10);
      
      localStorage.setItem(this.leaderboardKey, JSON.stringify(allData));
      
      const rank = allData[this.dateKey].findIndex(e => e.timestamp === entry.timestamp) + 1;
      
      if (completion.completed) {
        this.awardBadge(completion.progress, stats);
        this.awardGold(this.currentChallenge.rewards.gold);
      }
      
      return { entry, rank, totalPlayers: allData[this.dateKey].length };
    } catch (e) {
      console.warn('Failed to submit score:', e);
      return { entry, rank: -1, totalPlayers: 0 };
    }
  }

  calculateScore(stats, timeTaken, completion) {
    if (!this.currentChallenge) return 0;
    
    const { type, target, timeLimit } = this.currentChallenge;
    let baseScore = 0;
    
    if (completion.completed) {
      baseScore = 1000;
      const timeBonus = Math.max(0, (timeLimit - timeTaken) / timeLimit) * 500;
      baseScore += timeBonus;
    } else {
      baseScore = completion.progress * 500;
    }

    switch (type) {
      case DAILY_CHALLENGE_TYPES.DEPTH:
        baseScore += stats.maxDepth * 2;
        break;
      case DAILY_CHALLENGE_TYPES.ORE:
        const oreValue = Object.entries(stats.cargo).reduce((sum, [type, count]) => {
          const prices = { coal: 5, iron: 15, gold: 50, emerald: 100, ruby: 150, diamond: 300 };
          return sum + count * prices[type];
        }, 0);
        baseScore += oreValue;
        break;
      case DAILY_CHALLENGE_TYPES.ENEMY:
        baseScore += stats.enemiesKilled * 15;
        break;
    }

    return Math.floor(baseScore);
  }

  awardBadge(progress, stats) {
    let badge = null;
    for (const [key, def] of Object.entries(DAILY_CHALLENGE_BADGES)) {
      if (progress >= def.threshold) {
        badge = { key, ...def, dateKey: this.dateKey, stats };
      }
    }

    if (badge) {
      try {
        const stored = localStorage.getItem(this.badgesKey);
        const badges = stored ? JSON.parse(stored) : [];
        
        const existingIndex = badges.findIndex(b => b.dateKey === this.dateKey);
        if (existingIndex >= 0) {
          const existing = badges[existingIndex];
          const existingRank = Object.keys(DAILY_CHALLENGE_BADGES).indexOf(existing.key);
          const newRank = Object.keys(DAILY_CHALLENGE_BADGES).indexOf(badge.key);
          if (newRank > existingRank) {
            badges[existingIndex] = badge;
          }
        } else {
          badges.push(badge);
        }
        
        localStorage.setItem(this.badgesKey, JSON.stringify(badges));
      } catch (e) {
        console.warn('Failed to award badge:', e);
      }
    }

    return badge;
  }

  awardGold(amount) {
    try {
      const stored = localStorage.getItem('deepDigger_playerGold');
      const currentGold = stored ? parseInt(stored) || 0 : 0;
      localStorage.setItem('deepDigger_playerGold', String(currentGold + amount));
    } catch (e) {
      console.warn('Failed to award gold:', e);
    }
  }

  getBadges() {
    try {
      const stored = localStorage.getItem(this.badgesKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  getSavedGold() {
    try {
      const stored = localStorage.getItem('deepDigger_playerGold');
      return parseInt(stored) || 0;
    } catch (e) {
      return 0;
    }
  }

  hasCompletedToday() {
    const leaderboard = this.getLeaderboard();
    return leaderboard.some(e => e.completed);
  }

  getPlayerName() {
    try {
      return localStorage.getItem('deepDigger_playerName') || '匿名矿工';
    } catch (e) {
      return '匿名矿工';
    }
  }

  setPlayerName(name) {
    try {
      localStorage.setItem('deepDigger_playerName', name);
    } catch (e) {
      console.warn('Failed to save player name:', e);
    }
  }
}

export const dailyChallenge = new DailyChallenge();
