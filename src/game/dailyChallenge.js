import { SafeStorage, STORAGE_KEYS, getDateKey, hashString } from '../utils/storage.js';
import { createSeededRandom } from '../utils/random.js';
import {
  DAILY_CHALLENGE_TYPES,
  DAILY_CHALLENGE_BADGES,
  DAILY_ORE_TARGETS,
  ORE_NAMES_ZH,
  DIFFICULTY_CONFIG,
  DEPTH_TARGETS,
  ENEMY_TARGETS,
  ORE_TARGETS,
  getBadgeIcon,
  getBadgeByProgress,
  getBadgeRank
} from './challengeConfig.js';

export {
  DAILY_CHALLENGE_TYPES,
  DAILY_CHALLENGE_BADGES,
  DAILY_ORE_TARGETS,
  getBadgeIcon,
  getBadgeByProgress
};

export class DailyChallenge {
  constructor() {
    this.currentChallenge = null;
    this.dateKey = getDateKey();
    this.rewardsClaimed = this.loadRewardsClaimed();
    this.load();
  }

  loadRewardsClaimed() {
    const data = SafeStorage.get(STORAGE_KEYS.DAILY_REWARDS_CLAIMED, {});
    return data[this.dateKey] || { gold: false, badge: false };
  }

  refreshRewardsClaimed() {
    this.rewardsClaimed = this.loadRewardsClaimed();
    return this.rewardsClaimed;
  }

  saveRewardsClaimed() {
    const data = SafeStorage.get(STORAGE_KEYS.DAILY_REWARDS_CLAIMED, {});
    data[this.dateKey] = this.rewardsClaimed;
    SafeStorage.set(STORAGE_KEYS.DAILY_REWARDS_CLAIMED, data);
  }

  isGoldRewardedToday() {
    this.refreshRewardsClaimed();
    return this.rewardsClaimed.gold === true;
  }

  isBadgeRewardedToday() {
    this.refreshRewardsClaimed();
    return this.rewardsClaimed.badge === true;
  }

  markGoldRewarded() {
    this.refreshRewardsClaimed();
    if (this.rewardsClaimed.gold) {
      return false;
    }
    this.rewardsClaimed.gold = true;
    this.saveRewardsClaimed();
    return true;
  }

  markBadgeRewarded() {
    this.refreshRewardsClaimed();
    if (this.rewardsClaimed.badge) {
      return false;
    }
    this.rewardsClaimed.badge = true;
    this.saveRewardsClaimed();
    return true;
  }

  load() {
    try {
      const data = SafeStorage.get(STORAGE_KEYS.DAILY_CHALLENGE, null);
      if (data && data.dateKey === this.dateKey) {
        this.currentChallenge = data.challenge;
        return;
      }
    } catch (e) {
      console.warn('Failed to load daily challenge:', e);
    }
    this.generateNewChallenge();
  }

  generateNewChallenge() {
    const seed = hashString(this.dateKey);
    const rng = createSeededRandom(seed);

    const types = Object.values(DAILY_CHALLENGE_TYPES);
    const type = rng.pick(types);

    const difficultyKeys = Object.keys(DIFFICULTY_CONFIG);
    const difficultyWeights = difficultyKeys.map(k => DIFFICULTY_CONFIG[k].weight);
    const difficulty = rng.pickWeighted(difficultyKeys, difficultyWeights);
    const diffConfig = DIFFICULTY_CONFIG[difficulty];

    let target, description;

    switch (type) {
      case DAILY_CHALLENGE_TYPES.DEPTH: {
        const range = DEPTH_TARGETS[difficulty];
        target = rng.nextInt(range.min, range.max);
        description = `在${Math.floor(diffConfig.timeLimit / 60)}分钟内到达 ${target}m 深度`;
        break;
      }
      case DAILY_CHALLENGE_TYPES.ORE: {
        const oreType = rng.pick(DAILY_ORE_TARGETS);
        const oreRange = ORE_TARGETS[difficulty][oreType];
        target = {
          oreType,
          amount: rng.nextInt(oreRange.min, oreRange.max)
        };
        description = `在${Math.floor(diffConfig.timeLimit / 60)}分钟内收集 ${target.amount} 个${ORE_NAMES_ZH[oreType]}`;
        break;
      }
      case DAILY_CHALLENGE_TYPES.ENEMY: {
        const range = ENEMY_TARGETS[difficulty];
        target = rng.nextInt(range.min, range.max);
        description = `在${Math.floor(diffConfig.timeLimit / 60)}分钟内击杀 ${target} 个敌人`;
        break;
      }
    }

    this.currentChallenge = {
      dateKey: this.dateKey,
      seed,
      type,
      target,
      description,
      timeLimit: diffConfig.timeLimit,
      difficulty,
      rewards: {
        gold: diffConfig.rewardGold
      }
    };

    this.save();
  }

  save() {
    SafeStorage.set(STORAGE_KEYS.DAILY_CHALLENGE, {
      dateKey: this.dateKey,
      challenge: this.currentChallenge
    });
  }

  getChallenge() {
    if (!this.currentChallenge || this.currentChallenge.dateKey !== this.dateKey) {
      this.dateKey = getDateKey();
      this.rewardsClaimed = this.loadRewardsClaimed();
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
        const oreCount = stats.cargo?.[target.oreType] || 0;
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
    const allData = SafeStorage.get(STORAGE_KEYS.LEADERBOARD, {});
    return allData[this.dateKey] || [];
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

    const rewardsResult = { gold: 0, badge: null, goldAlreadyClaimed: false, badgeAlreadyClaimed: false };

    try {
      const allData = SafeStorage.get(STORAGE_KEYS.LEADERBOARD, {});

      if (!allData[this.dateKey]) {
        allData[this.dateKey] = [];
      }

      allData[this.dateKey].push(entry);
      allData[this.dateKey].sort((a, b) => b.score - a.score);
      allData[this.dateKey] = allData[this.dateKey].slice(0, 10);

      SafeStorage.set(STORAGE_KEYS.LEADERBOARD, allData);

      const rank = allData[this.dateKey].findIndex(e => e.timestamp === entry.timestamp) + 1;

      if (completion.completed) {
        const badgeAlreadyClaimed = this.isBadgeRewardedToday();

        const goldClaimed = this.markGoldRewarded();
        if (goldClaimed) {
          const goldAmount = this.currentChallenge.rewards.gold;
          this.awardGold(goldAmount);
          rewardsResult.gold = goldAmount;
        } else {
          rewardsResult.goldAlreadyClaimed = true;
        }

        const badge = this.awardBadge(completion.progress, stats, badgeAlreadyClaimed);
        rewardsResult.badge = badge;
        if (badgeAlreadyClaimed && !badge) {
          rewardsResult.badgeAlreadyClaimed = true;
        }
      }

      return { entry, rank, totalPlayers: allData[this.dateKey].length, rewards: rewardsResult };
    } catch (e) {
      console.warn('Failed to submit score:', e);
      return { entry, rank: -1, totalPlayers: 0, rewards: rewardsResult };
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

    const ORE_PRICES = { coal: 5, iron: 15, gold: 50, emerald: 100, ruby: 150, diamond: 300 };

    switch (type) {
      case DAILY_CHALLENGE_TYPES.DEPTH:
        baseScore += stats.maxDepth * 2;
        break;
      case DAILY_CHALLENGE_TYPES.ORE:
        const oreValue = Object.entries(stats.cargo || {}).reduce((sum, [type, count]) => {
          return sum + count * (ORE_PRICES[type] || 0);
        }, 0);
        baseScore += oreValue;
        break;
      case DAILY_CHALLENGE_TYPES.ENEMY:
        baseScore += stats.enemiesKilled * 15;
        break;
    }

    return Math.floor(baseScore);
  }

  awardBadge(progress, stats, alreadyClaimed = false) {
    const badgeDef = getBadgeByProgress(progress);
    if (!badgeDef) return null;

    const badge = { ...badgeDef, dateKey: this.dateKey, stats };

    if (alreadyClaimed) {
      const badges = SafeStorage.get(STORAGE_KEYS.BADGES, []);
      const existingIndex = badges.findIndex(b => b.dateKey === this.dateKey);
      if (existingIndex >= 0) {
        const existing = badges[existingIndex];
        const existingRank = getBadgeRank(existing.key);
        const newRank = getBadgeRank(badge.key);
        if (newRank > existingRank) {
          badges[existingIndex] = badge;
          SafeStorage.set(STORAGE_KEYS.BADGES, badges);
          return badge;
        }
        return existing;
      }
      return null;
    }

    try {
      const badges = SafeStorage.get(STORAGE_KEYS.BADGES, []);

      const existingIndex = badges.findIndex(b => b.dateKey === this.dateKey);
      let awardedBadge = badge;

      if (existingIndex >= 0) {
        const existing = badges[existingIndex];
        const existingRank = getBadgeRank(existing.key);
        const newRank = getBadgeRank(badge.key);
        if (newRank > existingRank) {
          badges[existingIndex] = badge;
        } else {
          awardedBadge = existing;
        }
      } else {
        badges.push(badge);
      }

      SafeStorage.set(STORAGE_KEYS.BADGES, badges);
      this.markBadgeRewarded();
      return awardedBadge;
    } catch (e) {
      console.warn('Failed to award badge:', e);
      return null;
    }
  }

  awardGold(amount) {
    const currentGold = SafeStorage.getRaw(STORAGE_KEYS.PLAYER_GOLD, '0');
    const newGold = (parseInt(currentGold) || 0) + amount;
    SafeStorage.setRaw(STORAGE_KEYS.PLAYER_GOLD, String(newGold));
  }

  getBadges() {
    return SafeStorage.get(STORAGE_KEYS.BADGES, []);
  }

  getSavedGold() {
    return parseInt(SafeStorage.getRaw(STORAGE_KEYS.PLAYER_GOLD, '0')) || 0;
  }

  hasCompletedToday(playerName = null) {
    const leaderboard = this.getLeaderboard();
    if (playerName) {
      return leaderboard.some(e => e.completed && e.playerName === playerName);
    }
    return leaderboard.some(e => e.completed);
  }

  getPlayerName() {
    return SafeStorage.getRaw(STORAGE_KEYS.PLAYER_NAME, '匿名矿工');
  }

  setPlayerName(name) {
    SafeStorage.setRaw(STORAGE_KEYS.PLAYER_NAME, name);
  }
}

export const dailyChallenge = new DailyChallenge();
