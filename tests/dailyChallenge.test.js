import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyChallenge } from '../src/game/dailyChallenge.js';
import { SafeStorage, STORAGE_KEYS, getDateKey, hashString } from '../src/utils/storage.js';
import { DAILY_CHALLENGE_TYPES } from '../src/game/challengeConfig.js';

vi.mock('../src/utils/storage.js', async () => {
  const actual = await vi.importActual('../src/utils/storage.js');
  const mockStorage = {};
  
  return {
    ...actual,
    SafeStorage: {
      get: vi.fn((key, defaultValue = null) => {
        return key in mockStorage ? JSON.parse(mockStorage[key]) : defaultValue;
      }),
      set: vi.fn((key, value) => {
        mockStorage[key] = JSON.stringify(value);
        return true;
      }),
      remove: vi.fn((key) => {
        delete mockStorage[key];
        return true;
      }),
      getRaw: vi.fn((key, defaultValue = null) => {
        return key in mockStorage ? mockStorage[key] : defaultValue;
      }),
      setRaw: vi.fn((key, value) => {
        mockStorage[key] = String(value);
        return true;
      }),
      update: vi.fn((key, updater, defaultValue = null) => {
        const current = key in mockStorage ? JSON.parse(mockStorage[key]) : defaultValue;
        const updated = updater(current);
        mockStorage[key] = JSON.stringify(updated);
        return updated;
      }),
      _clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
      })
    }
  };
});

describe('DailyChallenge - 奖励领取防重复测试', () => {
  let dailyChallenge;
  const testDateKey = getDateKey();

  beforeEach(() => {
    SafeStorage._clear();
    dailyChallenge = new DailyChallenge();
  });

  describe('奖励领取状态检查', () => {
    it('初始化时应该显示奖励未领取', () => {
      expect(dailyChallenge.isGoldRewardedToday()).toBe(false);
      expect(dailyChallenge.isBadgeRewardedToday()).toBe(false);
    });

    it('标记金币奖励后应该显示已领取', () => {
      const result = dailyChallenge.markGoldRewarded();
      expect(result).toBe(true);
      expect(dailyChallenge.isGoldRewardedToday()).toBe(true);
    });

    it('标记徽章奖励后应该显示已领取', () => {
      const result = dailyChallenge.markBadgeRewarded();
      expect(result).toBe(true);
      expect(dailyChallenge.isBadgeRewardedToday()).toBe(true);
    });

    it('重复标记金币奖励应该返回false', () => {
      expect(dailyChallenge.markGoldRewarded()).toBe(true);
      expect(dailyChallenge.markGoldRewarded()).toBe(false);
      expect(dailyChallenge.markGoldRewarded()).toBe(false);
    });

    it('重复标记徽章奖励应该返回false', () => {
      expect(dailyChallenge.markBadgeRewarded()).toBe(true);
      expect(dailyChallenge.markBadgeRewarded()).toBe(false);
      expect(dailyChallenge.markBadgeRewarded()).toBe(false);
    });

    it('刷新奖励状态应该从存储读取最新值', () => {
      dailyChallenge.markGoldRewarded();
      
      const newInstance = new DailyChallenge();
      expect(newInstance.isGoldRewardedToday()).toBe(true);
    });

    it('不同日期应该重置奖励领取状态', () => {
      dailyChallenge.markGoldRewarded();
      dailyChallenge.markBadgeRewarded();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = getDateKey(tomorrow);
      
      dailyChallenge.dateKey = tomorrowKey;
      dailyChallenge.refreshRewardsClaimed();
      
      expect(dailyChallenge.isGoldRewardedToday()).toBe(false);
      expect(dailyChallenge.isBadgeRewardedToday()).toBe(false);
    });
  });

  describe('submitScore - 奖励发放测试', () => {
    const createStats = (options = {}) => ({
      maxDepth: options.maxDepth || 100,
      enemiesKilled: options.enemiesKilled || 20,
      blocksDug: options.blocksDug || 200,
      cargo: {
        coal: options.coal || 50,
        iron: options.iron || 20,
        gold: options.goldOre || 5,
        emerald: options.emerald || 0,
        ruby: options.ruby || 0,
        diamond: options.diamond || 0
      },
      gold: options.gold || 500
    });

    it('完成挑战应该发放金币奖励', () => {
      dailyChallenge = new DailyChallenge();
      dailyChallenge.currentChallenge = {
        dateKey: testDateKey,
        type: DAILY_CHALLENGE_TYPES.DEPTH,
        target: 50,
        timeLimit: 300,
        rewards: { gold: 1000 }
      };

      const stats = createStats({ maxDepth: 100 });
      const result = dailyChallenge.submitScore('TestPlayer', stats, 150);

      expect(result.rewards.gold).toBe(1000);
      expect(result.rewards.goldAlreadyClaimed).toBe(false);
    });

    it('同一天第二次完成不应该再发放金币', () => {
      dailyChallenge = new DailyChallenge();
      dailyChallenge.currentChallenge = {
        dateKey: testDateKey,
        type: DAILY_CHALLENGE_TYPES.DEPTH,
        target: 50,
        timeLimit: 300,
        rewards: { gold: 1000 }
      };

      const stats1 = createStats({ maxDepth: 100 });
      const result1 = dailyChallenge.submitScore('TestPlayer', stats1, 150);
      expect(result1.rewards.gold).toBe(1000);
      expect(result1.rewards.goldAlreadyClaimed).toBe(false);

      const stats2 = createStats({ maxDepth: 150 });
      const result2 = dailyChallenge.submitScore('TestPlayer', stats2, 120);
      expect(result2.rewards.gold).toBe(0);
      expect(result2.rewards.goldAlreadyClaimed).toBe(true);
    });

    it('同一天多次重试都不应该重复领取金币', () => {
      dailyChallenge = new DailyChallenge();
      dailyChallenge.currentChallenge = {
        dateKey: testDateKey,
        type: DAILY_CHALLENGE_TYPES.ENEMY,
        target: 10,
        timeLimit: 300,
        rewards: { gold: 500 }
      };

      for (let i = 0; i < 5; i++) {
        const stats = createStats({ enemiesKilled: 15 + i });
        const result = dailyChallenge.submitScore('TestPlayer', stats, 200 - i * 10);
        
        if (i === 0) {
          expect(result.rewards.gold).toBe(500);
          expect(result.rewards.goldAlreadyClaimed).toBe(false);
        } else {
          expect(result.rewards.gold).toBe(0);
          expect(result.rewards.goldAlreadyClaimed).toBe(true);
        }
      }
    });

    it('未完成挑战不应该发放奖励', () => {
      dailyChallenge = new DailyChallenge();
      dailyChallenge.currentChallenge = {
        dateKey: testDateKey,
        type: DAILY_CHALLENGE_TYPES.DEPTH,
        target: 100,
        timeLimit: 300,
        rewards: { gold: 1000 }
      };

      const stats = createStats({ maxDepth: 50 });
      const result = dailyChallenge.submitScore('TestPlayer', stats, 300);

      expect(result.rewards.gold).toBe(0);
      expect(result.rewards.badge).toBeNull();
    });

    it('isGoldRewardedToday每次都应该从存储读取', () => {
      dailyChallenge = new DailyChallenge();
      
      expect(dailyChallenge.isGoldRewardedToday()).toBe(false);
      
      SafeStorage.set(STORAGE_KEYS.DAILY_REWARDS_CLAIMED, {
        [testDateKey]: { gold: true, badge: false }
      });
      
      expect(dailyChallenge.isGoldRewardedToday()).toBe(true);
    });
  });

  describe('多实例并发测试', () => {
    it('多个实例应该共享存储状态', () => {
      const instance1 = new DailyChallenge();
      const instance2 = new DailyChallenge();

      instance1.currentChallenge = {
        dateKey: testDateKey,
        type: DAILY_CHALLENGE_TYPES.DEPTH,
        target: 50,
        timeLimit: 300,
        rewards: { gold: 1000 }
      };

      instance2.currentChallenge = instance1.currentChallenge;

      const stats = { maxDepth: 100, enemiesKilled: 10, blocksDug: 100, cargo: {}, gold: 0 };
      
      const result1 = instance1.submitScore('Player1', stats, 150);
      expect(result1.rewards.gold).toBe(1000);

      const result2 = instance2.submitScore('Player2', stats, 140);
      expect(result2.rewards.gold).toBe(0);
      expect(result2.rewards.goldAlreadyClaimed).toBe(true);
    });
  });

  describe('刷新奖励状态', () => {
    it('refreshRewardsClaimed应该更新缓存', () => {
      dailyChallenge = new DailyChallenge();
      
      expect(dailyChallenge.rewardsClaimed.gold).toBe(false);
      
      SafeStorage.set(STORAGE_KEYS.DAILY_REWARDS_CLAIMED, {
        [testDateKey]: { gold: true, badge: true }
      });
      
      const refreshed = dailyChallenge.refreshRewardsClaimed();
      expect(refreshed.gold).toBe(true);
      expect(refreshed.badge).toBe(true);
      expect(dailyChallenge.rewardsClaimed.gold).toBe(true);
    });
  });
});

describe('DailyChallenge - 挑战生成测试', () => {
  let dailyChallenge;
  const testDateKey = getDateKey();

  beforeEach(() => {
    SafeStorage._clear();
    dailyChallenge = new DailyChallenge();
  });

  it('应该根据日期生成固定的挑战', () => {
    const challenge1 = dailyChallenge.getChallenge();
    expect(challenge1).toBeDefined();
    expect(challenge1.dateKey).toBe(testDateKey);
    expect(challenge1.type).toBeDefined();
    expect(challenge1.target).toBeDefined();
    expect(challenge1.timeLimit).toBeDefined();

    const dailyChallenge2 = new DailyChallenge();
    const challenge2 = dailyChallenge2.getChallenge();
    
    expect(challenge1.type).toBe(challenge2.type);
    expect(challenge1.target).toEqual(challenge2.target);
    expect(challenge1.timeLimit).toBe(challenge2.timeLimit);
  });

  it('不同日期应该生成不同的挑战', () => {
    const todayChallenge = dailyChallenge.getChallenge();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = getDateKey(tomorrow);
    
    dailyChallenge.dateKey = tomorrowKey;
    dailyChallenge.generateNewChallenge();
    const tomorrowChallenge = dailyChallenge.getChallenge();
    
    expect(todayChallenge.seed).not.toBe(tomorrowChallenge.seed);
  });
});

describe('DailyChallenge - 完成检测测试', () => {
  let dailyChallenge;

  beforeEach(() => {
    SafeStorage._clear();
    dailyChallenge = new DailyChallenge();
  });

  it('深度挑战完成检测', () => {
    dailyChallenge.currentChallenge = {
      type: DAILY_CHALLENGE_TYPES.DEPTH,
      target: 100
    };

    const incompleteStats = { maxDepth: 50 };
    expect(dailyChallenge.checkCompletion(incompleteStats).completed).toBe(false);
    expect(dailyChallenge.checkCompletion(incompleteStats).progress).toBe(0.5);

    const completeStats = { maxDepth: 100 };
    expect(dailyChallenge.checkCompletion(completeStats).completed).toBe(true);
    expect(dailyChallenge.checkCompletion(completeStats).progress).toBe(1);

    const exceedStats = { maxDepth: 150 };
    expect(dailyChallenge.checkCompletion(exceedStats).completed).toBe(true);
    expect(dailyChallenge.checkCompletion(exceedStats).progress).toBe(1);
  });

  it('矿石挑战完成检测', () => {
    dailyChallenge.currentChallenge = {
      type: DAILY_CHALLENGE_TYPES.ORE,
      target: { oreType: 'iron', amount: 30 }
    };

    const stats1 = { cargo: { iron: 15 } };
    expect(dailyChallenge.checkCompletion(stats1).completed).toBe(false);
    expect(dailyChallenge.checkCompletion(stats1).progress).toBe(0.5);

    const stats2 = { cargo: { iron: 30 } };
    expect(dailyChallenge.checkCompletion(stats2).completed).toBe(true);
  });

  it('击杀挑战完成检测', () => {
    dailyChallenge.currentChallenge = {
      type: DAILY_CHALLENGE_TYPES.ENEMY,
      target: 20
    };

    const stats1 = { enemiesKilled: 10 };
    expect(dailyChallenge.checkCompletion(stats1).completed).toBe(false);
    expect(dailyChallenge.checkCompletion(stats1).progress).toBe(0.5);

    const stats2 = { enemiesKilled: 25 };
    expect(dailyChallenge.checkCompletion(stats2).completed).toBe(true);
  });

  it('缺少货物数据应该处理为0', () => {
    dailyChallenge.currentChallenge = {
      type: DAILY_CHALLENGE_TYPES.ORE,
      target: { oreType: 'diamond', amount: 5 }
    };

    const stats = { cargo: {} };
    const result = dailyChallenge.checkCompletion(stats);
    expect(result.progress).toBe(0);
    expect(result.completed).toBe(false);
  });
});

describe('getDateKey', () => {
  it('应该返回正确格式的日期字符串', () => {
    const testDate = new Date(2026, 5, 15);
    const key = getDateKey(testDate);
    expect(key).toBe('2026-06-15');
  });

  it('月份和日期应该补零', () => {
    const testDate = new Date(2026, 0, 5);
    const key = getDateKey(testDate);
    expect(key).toBe('2026-01-05');
  });
});

describe('hashString', () => {
  it('相同字符串应该返回相同哈希', () => {
    const hash1 = hashString('2026-06-15');
    const hash2 = hashString('2026-06-15');
    expect(hash1).toBe(hash2);
  });

  it('不同字符串应该返回不同哈希', () => {
    const hash1 = hashString('2026-06-15');
    const hash2 = hashString('2026-06-16');
    expect(hash1).not.toBe(hash2);
  });

  it('应该返回非负数', () => {
    for (let i = 0; i < 100; i++) {
      const hash = hashString(`test-${i}`);
      expect(hash).toBeGreaterThanOrEqual(0);
    }
  });
});
