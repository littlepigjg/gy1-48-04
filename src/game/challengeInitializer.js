import { STANDARD_PLAYER_CONFIG, STANDARD_UPGRADES } from './challengeConfig.js';

export function initializeDailyChallengePlayer(player) {
  if (!player) {
    throw new Error('Player instance is required for daily challenge initialization');
  }

  const upgrades = { ...STANDARD_UPGRADES };
  player.upgrades = upgrades;

  const baseStats = STANDARD_PLAYER_CONFIG.baseStats;
  player.maxFuel = baseStats.maxFuel;
  player.maxOxygen = baseStats.maxOxygen;
  player.maxHeat = baseStats.maxHeat;
  player.maxCargo = baseStats.maxCargo;
  player.maxHealth = baseStats.maxHealth;
  player.speed = baseStats.speed;
  player.drillPower = baseStats.drillPower;
  player.heatGeneration = baseStats.heatGeneration;
  player.coolingRate = baseStats.coolingRate;
  player.fuelConsumption = baseStats.fuelConsumption;
  player.oxygenConsumption = baseStats.oxygenConsumption;
  player.damageReduction = baseStats.damageReduction;
  player.weaponDamage = baseStats.weaponDamage;
  player.weaponCooldown = baseStats.weaponCooldown;

  const resources = STANDARD_PLAYER_CONFIG.startingResources;
  player.gold = resources.gold;
  player.cargo = { ...resources.cargo };
  player.cargoUsed = resources.cargoUsed;
  player.maxDepth = resources.maxDepth;
  player.fuel = resources.fuel;
  player.oxygen = resources.oxygen;
  player.heat = resources.heat;
  player.health = resources.health;

  player.damageFlash = 0;
  player.lastShot = 0;
  player.diggingTarget = null;
  player.diggingProgress = 0;
  player.vx = 0;
  player.vy = 0;
  player.facing = 'down';
  player.moving = false;

  return player;
}

export function validateDailyChallengePlayer(player) {
  const errors = [];
  const expected = STANDARD_PLAYER_CONFIG;

  for (const [key, value] of Object.entries(expected.upgrades)) {
    if (player.upgrades[key] !== value) {
      errors.push(`Upgrade '${key}' should be ${value}, got ${player.upgrades[key]}`);
    }
  }

  const statChecks = {
    maxFuel: expected.baseStats.maxFuel,
    maxOxygen: expected.baseStats.maxOxygen,
    maxHeat: expected.baseStats.maxHeat,
    maxCargo: expected.baseStats.maxCargo,
    maxHealth: expected.baseStats.maxHealth,
    speed: expected.baseStats.speed,
    drillPower: expected.baseStats.drillPower,
    heatGeneration: expected.baseStats.heatGeneration,
    coolingRate: expected.baseStats.coolingRate,
    fuelConsumption: expected.baseStats.fuelConsumption,
    oxygenConsumption: expected.baseStats.oxygenConsumption,
    damageReduction: expected.baseStats.damageReduction,
    weaponDamage: expected.baseStats.weaponDamage,
    weaponCooldown: expected.baseStats.weaponCooldown,
    gold: expected.startingResources.gold,
    cargoUsed: expected.startingResources.cargoUsed,
    maxDepth: expected.startingResources.maxDepth,
    fuel: expected.startingResources.fuel,
    oxygen: expected.startingResources.oxygen,
    heat: expected.startingResources.heat,
    health: expected.startingResources.health
  };

  for (const [key, expectedValue] of Object.entries(statChecks)) {
    if (player[key] !== expectedValue) {
      errors.push(`Stat '${key}' should be ${expectedValue}, got ${player[key]}`);
    }
  }

  for (const [ore, expectedValue] of Object.entries(expected.startingResources.cargo)) {
    if (player.cargo[ore] !== expectedValue) {
      errors.push(`Cargo '${ore}' should be ${expectedValue}, got ${player.cargo[ore]}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function createDailyChallengeStatsObject() {
  return {
    maxDepth: 0,
    enemiesKilled: 0,
    blocksDug: 0,
    cargo: {
      coal: 0,
      iron: 0,
      gold: 0,
      emerald: 0,
      ruby: 0,
      diamond: 0
    },
    gold: 0
  };
}

export function extractDailyChallengeStats(player, gameStats) {
  return {
    maxDepth: player.maxDepth || 0,
    enemiesKilled: gameStats?.enemiesKilled || 0,
    blocksDug: gameStats?.blocksDug || 0,
    cargo: { ...player.cargo },
    gold: player.gold || 0
  };
}
