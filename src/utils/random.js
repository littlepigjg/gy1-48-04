export class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  nextInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min, max) {
    return min + this.next() * (max - min);
  }

  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  pickWeighted(items, weights) {
    if (!items || items.length === 0) return undefined;
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length');
    }
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.next() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    
    return items[items.length - 1];
  }

  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  chance(probability) {
    return this.next() < probability;
  }
}

export function createSeededRandom(seed) {
  return new SeededRandom(seed);
}

export function createRandomFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const seed = (year * 10000 + month * 100 + day) >>> 0;
  return new SeededRandom(seed);
}
