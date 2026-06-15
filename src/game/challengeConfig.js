export const DAILY_CHALLENGE_TYPES = Object.freeze({
  DEPTH: 'depth',
  ORE: 'ore',
  ENEMY: 'enemy'
});

export const DAILY_CHALLENGE_BADGES = Object.freeze({
  BRONZE: { name: '青铜', color: '#CD7F32', threshold: 0.5, icon: '🥉' },
  SILVER: { name: '白银', color: '#C0C0C0', threshold: 0.75, icon: '🥈' },
  GOLD: { name: '黄金', color: '#FFD700', threshold: 0.9, icon: '🥇' },
  PLATINUM: { name: '铂金', color: '#E5E4E2', threshold: 1.0, icon: '💎' }
});

export const DAILY_ORE_TARGETS = Object.freeze(['coal', 'iron', 'gold', 'emerald', 'ruby', 'diamond']);

export const ORE_NAMES_ZH = Object.freeze({
  coal: '煤炭',
  iron: '铁矿',
  gold: '金矿',
  emerald: '祖母绿',
  ruby: '红宝石',
  diamond: '钻石'
});

export const DIFFICULTY_CONFIG = Object.freeze({
  easy: {
    name: '简单',
    timeLimit: 300,
    rewardGold: 500,
    weight: 40
  },
  medium: {
    name: '中等',
    timeLimit: 240,
    rewardGold: 1000,
    weight: 35
  },
  hard: {
    name: '困难',
    timeLimit: 180,
    rewardGold: 2000,
    weight: 25
  }
});

export const STANDARD_UPGRADES = Object.freeze({
  engine: 0,
  drill: 0,
  cargo: 0,
  fuel_tank: 0,
  oxygen_tank: 0,
  cooling: 0,
  armor: 0,
  weapon: 0
});

export const STANDARD_PLAYER_CONFIG = Object.freeze({
  upgrades: { ...STANDARD_UPGRADES },
  
  baseStats: {
    maxFuel: 100,
    maxOxygen: 100,
    maxHeat: 100,
    maxCargo: 50,
    maxHealth: 100,
    speed: 3,
    drillPower: 1,
    heatGeneration: 0.15,
    coolingRate: 0.08,
    fuelConsumption: 0.03,
    oxygenConsumption: 0.02,
    damageReduction: 0,
    weaponDamage: 10,
    weaponCooldown: 500
  },

  startingResources: {
    gold: 0,
    cargo: {
      coal: 0,
      iron: 0,
      gold: 0,
      emerald: 0,
      ruby: 0,
      diamond: 0
    },
    cargoUsed: 0,
    maxDepth: 0,
    fuel: 100,
    oxygen: 100,
    heat: 20,
    health: 100
  }
});

export const DEPTH_TARGETS = Object.freeze({
  easy: { min: 30, max: 50 },
  medium: { min: 60, max: 80 },
  hard: { min: 100, max: 120 }
});

export const ENEMY_TARGETS = Object.freeze({
  easy: { min: 10, max: 20 },
  medium: { min: 20, max: 30 },
  hard: { min: 35, max: 45 }
});

export const ORE_TARGETS = Object.freeze({
  easy: {
    coal: { min: 50, max: 70 },
    iron: { min: 30, max: 45 },
    gold: { min: 15, max: 22 },
    emerald: { min: 10, max: 15 },
    ruby: { min: 8, max: 12 },
    diamond: { min: 5, max: 8 }
  },
  medium: {
    coal: { min: 75, max: 100 },
    iron: { min: 45, max: 65 },
    gold: { min: 22, max: 32 },
    emerald: { min: 15, max: 22 },
    ruby: { min: 12, max: 18 },
    diamond: { min: 8, max: 12 }
  },
  hard: {
    coal: { min: 100, max: 140 },
    iron: { min: 60, max: 90 },
    gold: { min: 30, max: 45 },
    emerald: { min: 20, max: 30 },
    ruby: { min: 16, max: 24 },
    diamond: { min: 10, max: 15 }
  }
});

export function getBadgeIcon(key) {
  return DAILY_CHALLENGE_BADGES[key]?.icon || '🏅';
}

export function getBadgeByProgress(progress) {
  let result = null;
  for (const [key, def] of Object.entries(DAILY_CHALLENGE_BADGES)) {
    if (progress >= def.threshold) {
      result = { key, ...def };
    }
  }
  return result;
}

export function getBadgeRank(key) {
  return Object.keys(DAILY_CHALLENGE_BADGES).indexOf(key);
}
