import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeDailyChallengePlayer,
  validateDailyChallengePlayer,
  createDailyChallengeStatsObject,
  extractDailyChallengeStats
} from '../src/game/challengeInitializer.js';
import { STANDARD_PLAYER_CONFIG } from '../src/game/challengeConfig.js';
import { TILE_SIZE } from '../src/game/constants.js';

class MockPlayer {
  constructor(startX = 0, startY = 0) {
    this.x = startX * TILE_SIZE + TILE_SIZE / 2;
    this.y = startY * TILE_SIZE + TILE_SIZE / 2;
    this.tileX = startX;
    this.tileY = startY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 'down';
    this.moving = false;

    this.upgrades = {
      engine: 5,
      drill: 3,
      cargo: 2,
      fuel_tank: 4,
      oxygen_tank: 4,
      cooling: 3,
      armor: 2,
      weapon: 3
    };

    this.maxFuel = 260;
    this.fuel = 200;
    this.maxOxygen = 260;
    this.oxygen = 200;
    this.maxHeat = 100;
    this.heat = 50;
    this.maxCargo = 110;
    this.cargoUsed = 50;
    this.maxHealth = 160;
    this.health = 100;

    this.speed = 6;
    this.drillPower = 4;
    this.heatGeneration = 0.09;
    this.coolingRate = 0.17;
    this.fuelConsumption = 0.01;
    this.oxygenConsumption = 0.02;
    this.damageReduction = 0.2;
    this.weaponDamage = 34;
    this.weaponCooldown = 290;
    this.lastShot = 1000;

    this.gold = 5000;
    this.cargo = {
      coal: 10,
      iron: 5,
      gold: 3,
      emerald: 2,
      ruby: 1,
      diamond: 1
    };

    this.maxDepth = 250;
    this.damageFlash = 0.5;
    this.diggingTarget = { x: 10, y: 20 };
    this.diggingProgress = 0.7;
  }

  applyUpgrades() {
    this.maxFuel = 100 + this.upgrades.fuel_tank * 40;
    this.maxOxygen = 100 + this.upgrades.oxygen_tank * 40;
    this.maxCargo = 50 + this.upgrades.cargo * 30;
    this.maxHealth = 100 + this.upgrades.armor * 30;
    
    this.speed = 3 + this.upgrades.engine * 0.6;
    this.drillPower = 1 + this.upgrades.drill;
    this.heatGeneration = 0.15 - this.upgrades.cooling * 0.02;
    this.coolingRate = 0.08 + this.upgrades.cooling * 0.03;
    this.fuelConsumption = 0.03 - this.upgrades.engine * 0.004;
    this.damageReduction = this.upgrades.armor * 0.1;
    this.weaponDamage = 10 + this.upgrades.weapon * 8;
    this.weaponCooldown = Math.max(150, 500 - this.upgrades.weapon * 70);
  }
}

describe('challengeInitializer', () => {
  describe('initializeDailyChallengePlayer', () => {
    let player;

    beforeEach(() => {
      player = new MockPlayer(10, 5);
    });

    it('should reset all upgrade levels to 0', () => {
      initializeDailyChallengePlayer(player);
      
      for (const key of Object.keys(player.upgrades)) {
        expect(player.upgrades[key]).toBe(0);
      }
    });

    it('should reset all base stats to standard config', () => {
      initializeDailyChallengePlayer(player);
      const expected = STANDARD_PLAYER_CONFIG.baseStats;

      expect(player.maxFuel).toBe(expected.maxFuel);
      expect(player.maxOxygen).toBe(expected.maxOxygen);
      expect(player.maxHeat).toBe(expected.maxHeat);
      expect(player.maxCargo).toBe(expected.maxCargo);
      expect(player.maxHealth).toBe(expected.maxHealth);
      expect(player.speed).toBe(expected.speed);
      expect(player.drillPower).toBe(expected.drillPower);
      expect(player.heatGeneration).toBe(expected.heatGeneration);
      expect(player.coolingRate).toBe(expected.coolingRate);
      expect(player.fuelConsumption).toBe(expected.fuelConsumption);
      expect(player.oxygenConsumption).toBe(expected.oxygenConsumption);
      expect(player.damageReduction).toBe(expected.damageReduction);
      expect(player.weaponDamage).toBe(expected.weaponDamage);
      expect(player.weaponCooldown).toBe(expected.weaponCooldown);
    });

    it('should reset all resources to initial values', () => {
      initializeDailyChallengePlayer(player);
      const expected = STANDARD_PLAYER_CONFIG.startingResources;

      expect(player.gold).toBe(expected.gold);
      expect(player.cargoUsed).toBe(expected.cargoUsed);
      expect(player.maxDepth).toBe(expected.maxDepth);
      expect(player.fuel).toBe(expected.fuel);
      expect(player.oxygen).toBe(expected.oxygen);
      expect(player.heat).toBe(expected.heat);
      expect(player.health).toBe(expected.health);
    });

    it('should clear all cargo', () => {
      initializeDailyChallengePlayer(player);
      const expectedCargo = STANDARD_PLAYER_CONFIG.startingResources.cargo;

      for (const ore of Object.keys(expectedCargo)) {
        expect(player.cargo[ore]).toBe(expectedCargo[ore]);
      }
    });

    it('should reset temporary state', () => {
      initializeDailyChallengePlayer(player);

      expect(player.damageFlash).toBe(0);
      expect(player.lastShot).toBe(0);
      expect(player.diggingTarget).toBeNull();
      expect(player.diggingProgress).toBe(0);
      expect(player.vx).toBe(0);
      expect(player.vy).toBe(0);
      expect(player.facing).toBe('down');
      expect(player.moving).toBe(false);
    });

    it('should completely overwrite previously upgraded attributes', () => {
      player.upgrades.engine = 10;
      player.maxFuel = 500;
      player.fuel = 500;
      player.gold = 99999;
      player.maxDepth = 500;
      player.cargo.diamond = 99;

      initializeDailyChallengePlayer(player);

      expect(player.upgrades.engine).toBe(0);
      expect(player.maxFuel).toBe(100);
      expect(player.fuel).toBe(100);
      expect(player.gold).toBe(0);
      expect(player.maxDepth).toBe(0);
      expect(player.cargo.diamond).toBe(0);
    });

    it('should return the player object for chaining', () => {
      const result = initializeDailyChallengePlayer(player);
      expect(result).toBe(player);
    });

    it('should throw error when player is null', () => {
      expect(() => initializeDailyChallengePlayer(null)).toThrow('Player instance is required');
    });
  });

  describe('validateDailyChallengePlayer', () => {
    let player;

    beforeEach(() => {
      player = new MockPlayer();
      initializeDailyChallengePlayer(player);
    });

    it('properly initialized player should pass validation', () => {
      const result = validateDailyChallengePlayer(player);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('incorrect upgrade level should return errors', () => {
      player.upgrades.engine = 1;
      const result = validateDailyChallengePlayer(player);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('engine'))).toBe(true);
    });

    it('incorrect base stat should return errors', () => {
      player.maxFuel = 200;
      const result = validateDailyChallengePlayer(player);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('maxFuel'))).toBe(true);
    });

    it('incorrect resource value should return errors', () => {
      player.fuel = 50;
      const result = validateDailyChallengePlayer(player);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('fuel'))).toBe(true);
    });

    it('incorrect cargo count should return errors', () => {
      player.cargo.coal = 10;
      const result = validateDailyChallengePlayer(player);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('coal'))).toBe(true);
    });

    it('should return multiple errors for multiple issues', () => {
      player.upgrades.drill = 2;
      player.maxOxygen = 150;
      player.gold = 100;
      const result = validateDailyChallengePlayer(player);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('createDailyChallengeStatsObject', () => {
    it('should create correct initial stats object', () => {
      const stats = createDailyChallengeStatsObject();
      
      expect(stats.maxDepth).toBe(0);
      expect(stats.enemiesKilled).toBe(0);
      expect(stats.blocksDug).toBe(0);
      expect(stats.gold).toBe(0);
      expect(stats.cargo).toEqual({
        coal: 0,
        iron: 0,
        gold: 0,
        emerald: 0,
        ruby: 0,
        diamond: 0
      });
    });

    it('should return new object, modifications do not affect other calls', () => {
      const stats1 = createDailyChallengeStatsObject();
      const stats2 = createDailyChallengeStatsObject();
      
      stats1.maxDepth = 100;
      stats1.cargo.coal = 10;
      
      expect(stats2.maxDepth).toBe(0);
      expect(stats2.cargo.coal).toBe(0);
    });
  });

  describe('extractDailyChallengeStats', () => {
    let player;
    let gameStats;

    beforeEach(() => {
      player = new MockPlayer();
      gameStats = {
        enemiesKilled: 15,
        blocksDug: 100
      };
    });

    it('should correctly extract player data', () => {
      player.maxDepth = 123;
      player.gold = 500;
      player.cargo = {
        coal: 10,
        iron: 5,
        gold: 0,
        emerald: 0,
        ruby: 0,
        diamond: 2
      };

      const result = extractDailyChallengeStats(player, gameStats);

      expect(result.maxDepth).toBe(123);
      expect(result.gold).toBe(500);
      expect(result.cargo).toEqual({
        coal: 10,
        iron: 5,
        gold: 0,
        emerald: 0,
        ruby: 0,
        diamond: 2
      });
    });

    it('should correctly extract game stats', () => {
      const result = extractDailyChallengeStats(player, gameStats);

      expect(result.enemiesKilled).toBe(15);
      expect(result.blocksDug).toBe(100);
    });

    it('should handle missing game stats with defaults', () => {
      const result = extractDailyChallengeStats(player, {});

      expect(result.enemiesKilled).toBe(0);
      expect(result.blocksDug).toBe(0);
    });

    it('should default maxDepth to 0 when undefined', () => {
      delete player.maxDepth;
      const result = extractDailyChallengeStats(player, gameStats);
      expect(result.maxDepth).toBe(0);
    });

    it('should default gold to 0 when undefined', () => {
      delete player.gold;
      const result = extractDailyChallengeStats(player, gameStats);
      expect(result.gold).toBe(0);
    });

    it('cargo should be a copy, modifications do not affect original', () => {
      const result = extractDailyChallengeStats(player, gameStats);
      result.cargo.coal = 999;
      expect(player.cargo.coal).not.toBe(999);
    });
  });

  describe('integration test - upgrade then initialize', () => {
    it('fully upgraded player should be correctly reset', () => {
      const player = new MockPlayer();
      
      player.upgrades = {
        engine: 10,
        drill: 10,
        cargo: 10,
        fuel_tank: 10,
        oxygen_tank: 10,
        cooling: 10,
        armor: 10,
        weapon: 10
      };
      player.applyUpgrades();
      player.gold = 999999;
      player.cargo = { coal: 999, iron: 999, gold: 999, emerald: 999, ruby: 999, diamond: 999 };
      player.maxDepth = 999;
      player.fuel = player.maxFuel;
      player.oxygen = player.maxOxygen;
      player.health = player.maxHealth;

      initializeDailyChallengePlayer(player);

      const validation = validateDailyChallengePlayer(player);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });
});
