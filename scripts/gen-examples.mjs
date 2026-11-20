/**
 * 从真实引擎生成 docs/examples/*.json（接口文档的成功响应示例）。
 * 运行：node scripts/gen-examples.mjs
 * 保证文档示例与 src/engine/types.ts 契约零漂移。
 */
import { buildSync } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('.');
const out = path.join(root, 'scripts', '_example-bundle.mjs');
buildSync({
  stdin: {
    contents: `
      import { computeChart, SAMPLE_INPUT } from '../src/engine/ziwei';
      import { archetypeOf } from '../src/engine/interpret';
      const chart = computeChart(SAMPLE_INPUT).data;
      const errorResult = computeChart({ ...SAMPLE_INPUT, year: 1800 });
      const summary = {
        id: chart.id, solarDate: chart.solarDate, lunarDate: chart.lunarDate,
        genderLabel: chart.genderLabel, soulBranch: chart.soulBranch,
        archetype: chart.archetype, nickname: chart.input.nickname, createdAt: chart.createdAt,
      };
      const patterns = chart.patterns.length
        ? chart.patterns.map((p) => '「' + p.name + '」' + p.summary).join('\\n')
        : '此盘未入经典格局，星曜组合自有独特轨迹，不必拘泥古格。';
      const interpretation = {
        chartId: chart.id, palace: undefined,
        text: archetypeOf(chart) + '。\\n\\n' + patterns, source: 'local',
      };
      export { chart, summary, interpretation, errorResult };
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

const mod = await import(pathToFileURL(out).href);
const dir = path.join(root, 'docs', 'examples');
fs.mkdirSync(dir, { recursive: true });
const wrap = (data) => ({ ok: true, data, source: 'local' });
fs.writeFileSync(path.join(dir, 'chart.json'), JSON.stringify(wrap(mod.chart), null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'chart-list.json'), JSON.stringify(wrap([mod.summary]), null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'interpretation.json'), JSON.stringify(wrap(mod.interpretation), null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'error.json'), JSON.stringify(mod.errorResult, null, 2) + '\n');
fs.unlinkSync(out);
console.log('examples written:', fs.readdirSync(dir).join(', '));