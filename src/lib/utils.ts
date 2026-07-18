// Statistical Formulas implementation
export const statsUtils = {
  mean: (data: number[]) => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  },
  median: (data: number[]) => {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  mode: (data: number[]) => {
    if (data.length === 0) return 0;
    const counts = new Map<number, number>();
    data.forEach(x => counts.set(x, (counts.get(x) || 0) + 1));
    let maxCount = 0;
    let mode = data[0];
    counts.forEach((count, val) => {
      if (count > maxCount) {
        maxCount = count;
        mode = val;
      }
    });
    return mode;
  },
  range: (data: number[]) => {
    if (data.length === 0) return 0;
    return Math.max(...data) - Math.min(...data);
  },
  variance: (data: number[]) => {
    if (data.length === 0) return 0;
    const m = statsUtils.mean(data);
    return data.reduce((a, b) => a + Math.pow(b - m, 2), 0) / data.length;
  },
  stdDev: (data: number[]) => Math.sqrt(statsUtils.variance(data)),
  moment: (data: number[], r: number) => {
    const m = statsUtils.mean(data);
    return data.reduce((a, b) => a + Math.pow(b - m, r), 0) / data.length;
  },
  skewness: (data: number[]) => {
    const mean = statsUtils.mean(data);
    const median = statsUtils.median(data);
    const s = statsUtils.stdDev(data);
    return s === 0 ? 0 : (3 * (mean - median)) / s;
  },
  kurtosis: (data: number[]) => {
    const m4 = statsUtils.moment(data, 4);
    const s = statsUtils.stdDev(data);
    return s === 0 ? 0 : m4 / Math.pow(s, 4);
  }
};
