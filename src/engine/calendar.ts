/**
 * 历法校正引擎：真太阳时、中国夏令时、时辰序号、农历/公历互转。
 * 纯函数、无副作用，全部在浏览器端运行。
 */
import { Lunar, Solar, LunarYear } from 'lunar-javascript';
import type { BirthInput, TimeCorrection } from './types';

/** 时辰名（索引 0 早子时 … 11 亥时，12 晚子时） */
export const TIME_NAMES = [
  '早子时', '丑时', '寅时', '卯时', '辰时', '巳时',
  '午时', '未时', '申时', '酉时', '戌时', '亥时', '晚子时',
];

/** 时辰时间段 */
export const TIME_RANGES = [
  '00:00–00:59', '01:00–02:59', '03:00–04:59', '05:00–06:59',
  '07:00–08:59', '09:00–10:59', '11:00–12:59', '13:00–14:59',
  '15:00–16:59', '17:00–18:59', '19:00–20:59', '21:00–22:59', '23:00–23:59',
];

/** 中国 1986–1991 夏令时区间（含起含止） */
const DST_SPANS: Record<number, [string, string]> = {
  1986: ['1986-05-04', '1986-09-14'],
  1987: ['1987-04-12', '1987-09-13'],
  1988: ['1988-04-10', '1988-09-11'],
  1989: ['1989-04-16', '1989-09-17'],
  1990: ['1990-04-15', '1990-09-16'],
  1991: ['1991-04-14', '1991-09-15'],
};

/** 标准时区中央经线（中国 UTC+8 → 东经 120°） */
const STANDARD_MERIDIAN = 120;

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isSolarDateValid(y: number, m: number, d: number): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** 某农历年是否存在指定闰月 */
export function leapMonthExists(lunarYear: number, month: number): boolean {
  try {
    return LunarYear.fromYear(lunarYear).getLeapMonth() === month;
  } catch {
    return false;
  }
}

/** 农历转公历（取正午避免边界抖动） */
export function lunarToSolar(
  y: number, m: number, d: number, isLeap: boolean,
): { year: number; month: number; day: number } {
  const lunar = Lunar.fromYmdHms(y, isLeap ? -m : m, d, 12, 0, 0);
  const solar = lunar.getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}

/** 公历转农历（用于预览） */
export function solarToLunar(y: number, m: number, d: number): Lunar {
  return Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
}

function dayOfYear(y: number, m: number, d: number): number {
  const start = Date.UTC(y, 0, 1);
  const cur = Date.UTC(y, m - 1, d);
  return Math.floor((cur - start) / 86400000) + 1;
}

/** 均时差（分钟），近似公式 */
export function equationOfTime(y: number, m: number, d: number): number {
  const n = dayOfYear(y, m, d);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** 判断某公历日期是否落在夏令时区间 */
export function inDstSpan(y: number, m: number, d: number): boolean {
  const span = DST_SPANS[y];
  if (!span) return false;
  const t = `${y}-${pad(m)}-${pad(d)}`;
  return t >= span[0] && t <= span[1];
}

export function dstSpanOf(year: number): [string, string] | null {
  return DST_SPANS[year] ?? null;
}

/** 由小时推时辰序号（0 早子 … 12 晚子） */
export function timeIndexFromHour(hour: number): number {
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 校正结果即共享模型 TimeCorrection（唯一定义见 engine/types.ts） */
export type CorrectionResult = TimeCorrection;

/**
 * 计算历法校正。
 * 顺序：农历→公历（若需要）→ 夏令时回拨 → 真太阳时（经度差+均时差）→ 推时辰。
 * 跨日由 Date 自然进位处理。
 */
export function computeCorrection(input: BirthInput): CorrectionResult {
  const notes: string[] = [];

  // 1. 统一到公历
  let sy = input.year, sm = input.month, sd = input.day;
  if (input.calendar === 'lunar') {
    const conv = lunarToSolar(input.year, input.month, input.day, !!input.isLeapMonth);
    sy = conv.year; sm = conv.month; sd = conv.day;
    notes.push(`农历 ${input.year}年${input.isLeapMonth ? '闰' : ''}${input.month}月${input.day}日 → 公历 ${sy}-${pad(sm)}-${pad(sd)}`);
  }

  // 以正午构造基准 Date，仅用于取日期；时分单独累加，避免时区干扰
  const base = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  let totalMin = input.hour * 60 + input.minute;

  // 2. 夏令时回拨
  const inDst = inDstSpan(sy, sm, sd);
  let dstOffsetMin = 0;
  if (inDst) {
    if (input.dstAdjust) {
      dstOffsetMin = -60;
      totalMin += dstOffsetMin;
      notes.push(`该日处于中国 ${sy} 年夏令时区间，已按标准时回拨 60 分钟。`);
    } else {
      notes.push(`该日处于中国 ${sy} 年夏令时区间，当前未回拨（钟表读数含 +1 小时）。`);
    }
  }

  // 3. 真太阳时
  let longitudeOffsetMin = 0;
  let equationOfTimeMin = 0;
  const trueSolarApplied = input.useTrueSolarTime && typeof input.longitude === 'number';
  if (trueSolarApplied) {
    longitudeOffsetMin = (input.longitude! - STANDARD_MERIDIAN) * 4;
    equationOfTimeMin = equationOfTime(sy, sm, sd);
    totalMin += longitudeOffsetMin + equationOfTimeMin;
    notes.push(
      `真太阳时校正：经度差 ${fmtSigned(longitudeOffsetMin)} 分 + 均时差 ${fmtSigned(equationOfTimeMin)} 分。`,
    );
  } else if (input.useTrueSolarTime) {
    notes.push('已启用真太阳时，但未提供出生地经度，按东经 120° 标准时排盘。');
  }

  // 4. 进位处理跨日（先取整到分钟，避免均时差引入浮点秒）
  totalMin = Math.round(totalMin);
  const dayShift = Math.floor(totalMin / 1440);
  let minuteOfDay = ((totalMin % 1440) + 1440) % 1440;
  base.setDate(base.getDate() + dayShift);
  const cy = base.getFullYear();
  const cm = base.getMonth() + 1;
  const cd = base.getDate();
  const ch = Math.floor(minuteOfDay / 60);
  const cmin = minuteOfDay % 60;
  const timeIndex = timeIndexFromHour(ch);

  if (dayShift !== 0) {
    notes.push(`校正后时间跨日，排盘日期调整为 ${cy}-${pad(cm)}-${pad(cd)}。`);
  }
  if (timeIndex === 12) {
    notes.push(
      input.ziHourPolicy === 'forward'
        ? '晚子时（23:00 后）按来日排盘。'
        : '晚子时（23:00 后）按当日排盘。',
    );
  }

  return {
    trueSolarApplied,
    longitudeOffsetMin: round1(longitudeOffsetMin),
    equationOfTimeMin: round1(equationOfTimeMin),
    dstOffsetMin,
    correctedClock: `${pad(ch)}:${pad(cmin)}`,
    correctedDate: `${cy}-${pad(cm)}-${pad(cd)}`,
    timeIndex,
    timeName: TIME_NAMES[timeIndex],
    inDstSpan: inDst,
    notes,
    solarYear: cy,
    solarMonth: cm,
    solarDay: cd,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fmtSigned(n: number): string {
  const r = round1(n);
  return r >= 0 ? `+${r}` : `${r}`;
}