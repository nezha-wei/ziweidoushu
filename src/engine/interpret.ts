/**
 * 原创解读生成器。
 * 将星曜内容、宫位释义、四化语义组合为可读段落；全部文案本项目原创，
 * 娱乐化表述，不构成医疗、婚姻、投资等任何决策建议。
 */
import type { Chart, DecadalStage, PalaceInfo, StarInfo } from './types';
import { MAJOR_STARS, MINOR_STARS, BRIGHTNESS_MOD } from '../content/stars';
import { PALACES } from '../content/palaces';
import { MUTAGEN_MEANING } from './sihua';

const SOFT = new Set(['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马']);
const TOUGH = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);

/** 各宫原创建议尾句 */
const PALACE_ADVICE: Record<string, string> = {
  命宫: '认清自己的主轴，比羡慕别人的剧本更重要。',
  兄弟: '同辈是镜子，也是后盾，值得用心经营。',
  夫妻: '亲密关系里，先做自己，再成为我们。',
  子女: '你创造的一切，都是另一种形式的孩子。',
  财帛: '钱是工具不是主人，懂它才能用它。',
  疾厄: '身体是最诚实的伙伴，别等它抗议才倾听。',
  迁移: '世界很大，你的舞台未必在出生地。',
  仆役: '人群缘是资源，但真心比数量值钱。',
  官禄: '把力气使在天赋上，努力才不白费。',
  田宅: '根基稳了，枝叶才能放肆生长。',
  福德: '会让自己快乐，是一种被低估的能力。',
  父母: '理解来处，是为了更好地走向去处。',
};

function allStars(p: PalaceInfo): StarInfo[] {
  return [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
}

/** 单星解读 */
export function starReading(s: StarInfo): { title: string; body: string[] } {
  const major = MAJOR_STARS[s.name];
  const minor = MINOR_STARS[s.name];
  const body: string[] = [];
  let title = s.name;
  if (major) {
    title = `${s.name} · ${major.alias} · ${major.archetype}`;
    body.push(major.desc);
    if (s.brightness && BRIGHTNESS_MOD[s.brightness]) {
      body.push(`亮度「${s.brightness}」：${BRIGHTNESS_MOD[s.brightness]}`);
    }
    body.push(s.brightness === '陷' || s.brightness === '不' ? major.shadow : major.light);
    body.push(`诗曰：${major.verse}`);
  } else if (minor) {
    title = `${s.name} · ${minor.type === 'tough' ? '煞星' : minor.type === 'flower' ? '桃花' : '辅曜'}`;
    body.push(minor.note);
  } else {
    body.push(`${s.name}为杂耀，力量细微，作背景参考即可。`);
  }
  if (s.mutagen) {
    body.push(`生年${s.name}化${s.mutagen}：${MUTAGEN_MEANING[s.mutagen].desc}`);
  }
  return { title, body };
}

/** 宫位解读（多段原创组合） */
export function palaceReading(chart: Chart, p: PalaceInfo): string[] {
  const meta = PALACES[p.name];
  const paras: string[] = [];
  paras.push(`${meta.domain}。${meta.desc}`);

  if (p.majorStars.length > 0) {
    const sentences = p.majorStars.map((s) => {
      const m = MAJOR_STARS[s.name];
      const b = s.brightness ? `（${s.brightness}）` : '';
      return m ? `${s.name}${b}坐守，是「${m.archetype}」的底色` : `${s.name}${b}坐守`;
    });
    paras.push(sentences.join('；') + '。');
  } else {
    const opp = chart.palaces[(p.index + 6) % 12];
    const oppNames = opp.majorStars.map((s) => s.name).join('、') || '无主星';
    paras.push(`此宫无主星，借对宫（${opp.name}）的${oppNames}来看，力量稍减却更灵活，受环境影响大。`);
  }

  const soft = allStars(p).filter((s) => SOFT.has(s.name)).map((s) => s.name);
  const tough = allStars(p).filter((s) => TOUGH.has(s.name)).map((s) => s.name);
  if (soft.length) paras.push(`得${soft.join('、')}相助，这一领域多有贵人与顺缘。`);
  if (tough.length) paras.push(`逢${tough.join('、')}，过程会有波折与磨砺，宜提前布局、以柔克刚。`);

  const mut = allStars(p).filter((s) => s.mutagen);
  for (const s of mut) {
    paras.push(`${s.name}化${s.mutagen}——${MUTAGEN_MEANING[s.mutagen!].desc}`);
  }

  if (p.isBody) paras.push('此宫同为身宫，后天着力处与先天命宫在此交汇，分量更重。');
  paras.push(PALACE_ADVICE[p.name] ?? '顺势而为，尽力而为。');
  return paras;
}

/** 命宫原型标题 */
export function archetypeOf(chart: Chart): string {
  const soul = chart.palaces[chart.soulIndex];
  let majors = soul.majorStars;
  if (majors.length === 0) majors = chart.palaces[(soul.index + 6) % 12].majorStars;
  if (majors.length === 0) return '空宫借星 · 自在如风';
  const titles = majors.map((s) => MAJOR_STARS[s.name]?.archetype ?? s.name);
  return titles.join(' × ');
}

/** 星卡诗意一句话 */
export function verseOf(chart: Chart): string {
  const soul = chart.palaces[chart.soulIndex];
  let majors = soul.majorStars;
  if (majors.length === 0) majors = chart.palaces[(soul.index + 6) % 12].majorStars;
  const first = majors[0];
  if (first && MAJOR_STARS[first.name]) return MAJOR_STARS[first.name].verse;
  return '命由星写，路由己走。';
}

const LIFE_PHASE: [number, string][] = [
  [12, '懵懂童年'], [22, '鲜衣怒马的青春'], [32, '立业成家的关键十年'],
  [42, '全力冲刺的黄金期'], [52, '沉淀与转折的中年'], [62, '收获与传承的时节'], [200, '从容自在的晚晴'],
];

const STAGE_THEME: Record<string, string> = {
  命宫: '自我重塑', 兄弟: '同辈协作', 夫妻: '亲密关系', 子女: '创造孕育',
  财帛: '财富积累', 疾厄: '身心调养', 迁移: '向外拓展', 仆役: '人际网络',
  官禄: '事业进阶', 田宅: '根基置业', 福德: '精神丰盈', 父母: '长辈缘分',
};

/** 大限阶段叙事（原创） */
export function stageNarrative(stage: DecadalStage, chart: Chart): { narrative: string; theme: string } {
  const palace = chart.palaces[stage.palaceIndex];
  const meta = PALACES[stage.palaceName];
  const phase = LIFE_PHASE.find(([max]) => stage.ageRange[0] <= max)?.[1] ?? '人生阶段';
  const theme = STAGE_THEME[stage.palaceName] ?? meta.domain;
  const [lu, quan, ke, ji] = stage.mutagen;
  const parts: string[] = [];
  parts.push(`${stage.ageRange[0]}–${stage.ageRange[1]} 岁（${stage.yearRange[0]}–${stage.yearRange[1]}），大限行至${stage.palaceName}，正是${phase}。`);
  parts.push(`这十年的重心落在「${meta.domain}」，${theme}是主课题。`);
  if (lu) parts.push(`${lu}化禄带来机会与资源，宜主动把握；`);
  if (quan) parts.push(`${quan}化权让你更想主导，行动力上扬；`);
  if (ke) parts.push(`${ke}化科添名声与贵人，逢凶化吉；`);
  if (ji) parts.push(`${ji}化忌则提醒你在相关事务上多用心、少纠结。`);
  parts.push(PALACE_ADVICE[stage.palaceName] ?? '顺势而为。');
  return { narrative: parts.join(''), theme };
}