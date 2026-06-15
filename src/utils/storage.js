export class SafeStorage {
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`[Storage] Failed to get '${key}':`, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to set '${key}':`, e);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to remove '${key}':`, e);
      return false;
    }
  }

  static getRaw(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch (e) {
      console.warn(`[Storage] Failed to get raw '${key}':`, e);
      return defaultValue;
    }
  }

  static setRaw(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to set raw '${key}':`, e);
      return false;
    }
  }

  static update(key, updater, defaultValue = null) {
    const current = this.get(key, defaultValue);
    const updated = updater(current);
    this.set(key, updated);
    return updated;
  }
}

export const STORAGE_KEYS = Object.freeze({
  DAILY_CHALLENGE: 'deepDigger_dailyChallenge',
  LEADERBOARD: 'deepDigger_leaderboard',
  BADGES: 'deepDigger_badges',
  PLAYER_GOLD: 'deepDigger_playerGold',
  PLAYER_NAME: 'deepDigger_playerName',
  DAILY_REWARDS_CLAIMED: 'deepDigger_dailyRewardsClaimed',
  PLAYER_SAVE_DATA: 'deepDigger_playerSaveData'
});

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
