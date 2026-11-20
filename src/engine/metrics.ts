/**
 * 人生五维趣味指标。
 * 由相关宫位的星曜亮度、吉煞、四化确定性加权计算，纯娱乐参考，非命理定论。
 * 同一命盘恒得同一结果（无随机）。
 */
import type { Chart, LifeMetrics, PalaceInfo, StarInfo } from './types';

const BRIGHT_SCORE: Record<string, number> = {
  庙: 13, 旺: 10, 得: 7, 利: 4, 平: 0, 不: -4, 陷: -7, '': 0,
};
const SOFT = new Set(['左辅', '右弼', '文昌', '文曲', '天魁', '天钺']);
const TOUGH = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);
const FLOWER = new Set(['红鸾', '天喜', '天姚', '贪狼', '廉贞']);
const MUTAGEN_SCORE: Record<string, number> = { 禄: 9, 权: 6, 科: 8, 忌: -9 };

function stars(p: PalaceInfo): StarInfo[] {
  return [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
}
function byName(chart: Chart, name: string): PalaceInfo {
  return chart.palaces.find((p) => p.name === name)!;
}
function opposite(p: PalaceInfo, chart: Chart): PalaceInfo {
  return chart.palaces[(p.index + 6) % 12];
}

/** 单宫能量分（0–100 区间内的原始分） */
function palaceEnergy(chart: Chart, name: string, borrow = true): number {
  const p = byName(chart, name);
  let score = 50;
  const majors = p.majorStars;
  if (majors.length === 0 && borrow) {
    // 空宫借对宫主星，权重 0.6
    const opp = opposite(p, chart);
    for (const s of opp.majorStars) score += (BRIGHT_SCORE[s.brightness] ?? 0) * 0.6;
  } else {
    for (const s of majors) score += BRIGHT_SCORE[s.brightness] ?? 0;
  }
  for (const s of stars(p)) {
    if (SOFT.has(s.name)) score += 4;
    if (s.name === '禄存') score += 6;
    if (s.name === '天马') score += 3;
    if (TOUGH.has(s.name)) score -= 5;
    if (s.mutagen) score += MUTAGEN_SCORE[s.mutagen] ?? 0;
  }
  return score;
}

function clamp(n: number): number {
  return Math.max(6, Math.min(98, Math.round(n)));
}

export function computeMetrics(chart: Chart): LifeMetrics {
  const career = palaceEnergy(chart, '官禄') * 0.7 + palaceEnergy(chart, '命宫') * 0.3;
  const wealth = palaceEnergy(chart, '财帛') * 0.7 + palaceEnergy(chart, '田宅') * 0.3;
  const loveBase = palaceEnergy(chart, '夫妻');
  const loveFlower = stars(byName(chart, '夫妻')).filter((s) => FLOWER.has(s.name)).length * 3;
  const love = loveBase + loveFlower;
  // 健康：疾厄宫煞星越多越需注意，故用基础分减去煞星惩罚后再映射
  const health = palaceEnergy(chart, '疾厄');
  const social = palaceEnergy(chart, '仆役') * 0.5 + palaceEnergy(chart, '迁移') * 0.5;
  return {
    career: clamp(career),
    wealth: clamp(wealth),
    love: clamp(love),
    health: clamp(health),
    social: clamp(social),
  };
}

export const METRIC_LABELS: { key: keyof LifeMetrics; label: string; icon: string }[] = [
  { key: 'career', label: '事业', icon: '⛰' },
  { key: 'wealth', label: '财运', icon: '◈' },
  { key: 'love', label: '感情', icon: '❤' },
  { key: 'health', label: '健康', icon: '✚' },
  { key: 'social', label: '人缘', icon: '✦' },
];