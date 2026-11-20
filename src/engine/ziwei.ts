/**
 * 排盘引擎封装：输入校验 → 历法校正 → iztro 排盘 → 归一化 Chart。
 * 排盘内核复用 MIT 许可的 iztro（底层 lunar-typescript），
 * 归一化模型、四化飞星、格局、指标、解读均为本项目原创。
 */
import { astro } from 'iztro';
import type {
  ApiResult, BirthInput, Chart, DecadalStage, PalaceInfo, SiHuaFlight, StarInfo,
} from './types';
import { computeCorrection, isSolarDateValid, leapMonthExists, lunarToSolar } from './calendar';
import { cityById } from './cities';
import { flightsFromStem } from './sihua';
import { detectPatterns } from './patterns';
import { computeMetrics } from './metrics';
import { archetypeOf, verseOf, stageNarrative } from './interpret';

type Astrolabe = ReturnType<typeof astro.withOptions>;

function err(code: any, message: string, fields?: Record<string, string>): ApiResult<Chart> {
  return { ok: false, source: 'local', error: { code, message, fields } };
}

function normStar(s: any): StarInfo {
  return {
    name: s.name,
    type: s.type,
    scope: s.scope ?? 'origin',
    brightness: (s.brightness ?? '') as StarInfo['brightness'],
    mutagen: s.mutagen || undefined,
  };
}

function normPalace(p: any, soulIndex: number): PalaceInfo {
  return {
    index: p.index,
    name: p.name,
    branch: p.earthlyBranch,
    stem: p.heavenlyStem,
    isSoul: p.index === soulIndex,
    isBody: !!p.isBodyPalace,
    isOriginal: !!p.isOriginalPalace,
    majorStars: (p.majorStars ?? []).map(normStar),
    minorStars: (p.minorStars ?? []).map(normStar),
    adjectiveStars: (p.adjectiveStars ?? []).map(normStar),
    changsheng12: p.changsheng12 ?? '',
    boshi12: p.boshi12 ?? '',
    decadal: {
      range: p.decadal?.range ?? [0, 0],
      stem: p.decadal?.heavenlyStem ?? '',
      branch: p.decadal?.earthlyBranch ?? '',
    },
    ages: p.ages ?? [],
  };
}

/** 校验输入，返回错误字段或 null */
function validate(input: BirthInput): Record<string, string> | null {
  const f: Record<string, string> = {};
  if (!['male', 'female'].includes(input.gender)) f.gender = '性别须为男或女';
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) f.year = '年份须在 1900–2100 之间';
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) f.month = '月份须在 1–12 之间';
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) f.hour = '小时须在 0–23 之间';
  if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) f.minute = '分钟须在 0–59 之间';
  if (input.calendar === 'solar') {
    if (!isSolarDateValid(input.year, input.month, input.day)) f.day = '该公历日期不存在';
  } else {
    if (!Number.isInteger(input.day) || input.day < 1 || input.day > 30) f.day = '农历日须在 1–30 之间';
    if (input.isLeapMonth && !leapMonthExists(input.year, input.month)) f.month = `${input.year} 年没有闰 ${input.month} 月`;
  }
  if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) f.longitude = '经度须在 -180–180 之间';
  return Object.keys(f).length ? f : null;
}

/** 星名 → 宫索引（主星唯一） */
function makeLocator(palaces: PalaceInfo[]): (name: string) => number {
  const map = new Map<string, number>();
  for (const p of palaces) {
    for (const s of [...p.majorStars, ...p.minorStars]) {
      if (!map.has(s.name)) map.set(s.name, p.index);
    }
  }
  return (name) => map.get(name) ?? -1;
}

/** 生年四化飞星（以来因宫为源） */
function natalFlights(palaces: PalaceInfo[], soulIndex: number): SiHuaFlight[] {
  const original = palaces.find((p) => p.isOriginal)?.index ?? soulIndex;
  const out: SiHuaFlight[] = [];
  for (const p of palaces) {
    for (const s of [...p.majorStars, ...p.minorStars]) {
      if (s.mutagen) {
        out.push({
          mutagen: s.mutagen, star: s.name,
          fromIndex: original, toIndex: p.index, self: p.index === original,
        });
      }
    }
  }
  const order = { 禄: 0, 权: 1, 科: 2, 忌: 3 };
  return out.sort((a, b) => order[a.mutagen] - order[b.mutagen]);
}

function chartId(input: BirthInput, correctedDate: string, timeIndex: number): string {
  const policy = `${input.leapPolicy}-${input.ziHourPolicy}-${input.yearDivide}-${input.useTrueSolarTime ? 1 : 0}-${input.dstAdjust ? 1 : 0}`;
  return `${correctedDate}-${timeIndex}-${input.gender}-${policy}`;
}

/** 主入口：计算命盘 */
export function computeChart(input: BirthInput): ApiResult<Chart> {
  const fields = validate(input);
  if (fields) {
    const code = fields.day ? 'INVALID_DATE' : fields.gender ? 'INVALID_GENDER'
      : fields.longitude ? 'INVALID_LONGITUDE' : fields.year ? 'UNSUPPORTED_YEAR'
      : fields.month && input.calendar === 'lunar' ? 'LEAP_MONTH_NOT_EXIST' : 'INVALID_TIME';
    return err(code, '输入校验未通过，请检查标红字段。', fields);
  }

  // 解析出生地经度
  const resolved: BirthInput = { ...input };
  if (resolved.useTrueSolarTime && resolved.longitude === undefined && resolved.birthplaceId) {
    const city = cityById(resolved.birthplaceId);
    if (city) resolved.longitude = city.longitude;
  }

  let correction;
  try {
    correction = computeCorrection(resolved);
  } catch (e) {
    return err('INVALID_DATE', '历法转换失败，请检查出生日期。');
  }

  let a: Astrolabe;
  try {
    a = astro.withOptions({
      type: 'solar',
      dateStr: correction.correctedDate,
      timeIndex: correction.timeIndex,
      gender: resolved.gender === 'male' ? '男' : '女',
      fixLeap: resolved.leapPolicy === 'split',
      language: 'zh-CN',
      config: {
        dayDivide: resolved.ziHourPolicy,
        yearDivide: resolved.yearDivide,
        horoscopeDivide: resolved.yearDivide,
        algorithm: 'default',
      },
    });
  } catch (e) {
    return err('COMPUTE_FAILED', '排盘计算失败，请调整输入后重试。');
  }

  const rawPalaces = a.palaces;
  const soulIndex = rawPalaces.findIndex((p: any) => p.name === '命宫');
  const palaces = rawPalaces.map((p: any) => normPalace(p, soulIndex));
  const bodyIndex = palaces.findIndex((p) => p.isBody);

  const chart: Chart = {
    id: chartId(resolved, correction.correctedDate, correction.timeIndex),
    input: resolved,
    correction,
    solarDate: a.solarDate,
    lunarDate: a.lunarDate,
    ganzhi: a.chineseDate,
    timeName: a.time,
    timeRange: a.timeRange,
    zodiac: a.zodiac,
    sign: a.sign,
    soulBranch: a.earthlyBranchOfSoulPalace,
    bodyBranch: a.earthlyBranchOfBodyPalace,
    soulMaster: a.soul,
    bodyMaster: a.body,
    fiveElements: a.fiveElementsClass,
    genderLabel: resolved.gender === 'male' ? '男' : '女',
    palaces,
    soulIndex,
    bodyIndex,
    natalFlights: natalFlights(palaces, soulIndex),
    patterns: [],
    metrics: { career: 50, wealth: 50, love: 50, health: 50, social: 50 },
    stages: [],
    archetype: '',
    verse: '',
    createdAt: Date.now(),
  };

  chart.patterns = detectPatterns(chart);
  chart.metrics = computeMetrics(chart);
  chart.archetype = archetypeOf(chart);
  chart.verse = verseOf(chart);

  // 大限推演
  try {
    const list = a.decadalList();
    chart.stages = list.map((d: any, order: number): DecadalStage => {
      const stage: DecadalStage = {
        order,
        palaceIndex: d.index,
        palaceName: d.palaceName,
        ageRange: d.ageRange,
        yearRange: d.yearRange,
        stem: d.heavenlyStem,
        branch: d.earthlyBranch,
        mutagen: d.mutagen ?? [],
        narrative: '',
        theme: '',
      };
      const { narrative, theme } = stageNarrative(stage, chart);
      stage.narrative = narrative;
      stage.theme = theme;
      return stage;
    });
  } catch {
    chart.stages = [];
  }

  return { ok: true, source: 'local', data: chart };
}

/** 某宫宫干飞四化（用于交互飞星动画） */
export function palaceFlights(chart: Chart, index: number): SiHuaFlight[] {
  const p = chart.palaces[index];
  return flightsFromStem(index, p.stem, makeLocator(chart.palaces));
}

/** 三方四正宫索引 */
export function surroundedIndices(index: number): number[] {
  return [index, (index + 4) % 12, (index + 8) % 12, (index + 6) % 12];
}

/** 示例盘（首屏即有真实内容） */
export const SAMPLE_INPUT: BirthInput = {
  calendar: 'solar',
  year: 2000, month: 8, day: 16,
  hour: 4, minute: 30,
  gender: 'female',
  birthplaceId: 'hangzhou',
  longitude: 120.15,
  useTrueSolarTime: true,
  dstAdjust: true,
  leapPolicy: 'split',
  ziHourPolicy: 'forward',
  yearDivide: 'normal',
  nickname: '示例星旅人',
};