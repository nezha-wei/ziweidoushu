/**
 * 引擎级 smoke 测试（node scripts/smoke.mjs）。
 * 用 esbuild 即时打包 TS 引擎后断言核心不变量：宫数 / 飞星数 / 大限数 / ID 确定性 / 错误码 / 口径开关。
 */
import { buildSync } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('.');
const out = path.join(root, 'scripts', '_smoke-bundle.mjs');
buildSync({
  stdin: {
    contents: `
      export { computeChart, SAMPLE_INPUT, palaceFlights, surroundedIndices } from '../src/engine/ziwei';
    `,
    resolveDir: path.join(root, 'scripts'),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'silent',
});
const { computeChart, SAMPLE_INPUT, palaceFlights, surroundedIndices } = await import(pathToFileURL(out).href);
fs.unlinkSync(out);

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
  if (!cond) fail++;
};

const r = computeChart(SAMPLE_INPUT);
ok('示例盘排盘成功', r.ok === true);
const c = r.data;
ok('十二宫齐全且索引唯一', c.palaces.length === 12 && new Set(c.palaces.map((p) => p.index)).size === 12);
ok('生年四化恒为 4 条', c.natalFlights.length === 4);
ok('大限推演恒为 12 段', c.stages.length === 12);
ok('命宫标记唯一', c.palaces.filter((p) => p.isSoul).length === 1 && c.palaces[c.soulIndex].isSoul);
ok('示例盘入格局', c.patterns.length >= 1, `${c.patterns.length} 项`);
ok('五维取值 0–100', Object.values(c.metrics).every((v) => Number.isInteger(v) && v >= 0 && v <= 100));

const r2 = computeChart(SAMPLE_INPUT);
ok('同输入 ID 确定', r2.data.id === c.id);
const strip = (x) => JSON.stringify({ ...x, createdAt: 0 });
ok('同输入内容确定', strip(r2.data) === strip(c));

ok('宫干飞化恒为 4 条', palaceFlights(c, c.soulIndex).length === 4);
ok('三方四正公式', JSON.stringify(surroundedIndices(0)) === JSON.stringify([0, 4, 8, 6]));

const e1 = computeChart({ ...SAMPLE_INPUT, year: 1800 });
ok('越界年份错误码', !e1.ok && e1.error.code === 'UNSUPPORTED_YEAR');
const e2 = computeChart({ ...SAMPLE_INPUT, year: 2001, month: 2, day: 29 });
ok('不存在公历日期错误码', !e2.ok && e2.error.code === 'INVALID_DATE');
const e3 = computeChart({ ...SAMPLE_INPUT, calendar: 'lunar', year: 2001, month: 5, day: 10, isLeapMonth: true });
ok('不存在闰月错误码', !e3.ok && e3.error.code === 'LEAP_MONTH_NOT_EXIST');
const e4 = computeChart({ ...SAMPLE_INPUT, longitude: 200 });
ok('越界经度错误码', !e4.ok && e4.error.code === 'INVALID_LONGITUDE');

const night = { ...SAMPLE_INPUT, hour: 23, minute: 30 };
const nf = computeChart({ ...night, ziHourPolicy: 'forward' });
const nc = computeChart({ ...night, ziHourPolicy: 'current' });
ok('晚子时口径影响日柱时柱', nf.data.ganzhi !== nc.data.ganzhi, `${nf.data.ganzhi} vs ${nc.data.ganzhi}`);
const noTrue = computeChart({ ...SAMPLE_INPUT, useTrueSolarTime: false });
ok('真太阳时开关影响校正', noTrue.data.correction.trueSolarApplied === false && c.correction.trueSolarApplied === true);

console.log(fail ? `\n${fail} 项失败` : '\n引擎 smoke 全部通过');
process.exit(fail ? 1 : 0);