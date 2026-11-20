/**
 * 格局判定引擎（原创规则代码）。
 * 格局名称为传统公共知识，判定逻辑与解读文案均为本项目原创实现，
 * 不复制参考仓库的 patterns 源码。基于归一化 Chart 计算，纯前端。
 */
import type { Chart, PalaceInfo, PatternInfo, StarInfo } from './types';

const BRIGHT = ['庙', '旺', '得'];

function allStars(p: PalaceInfo): StarInfo[] {
  return [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
}
function has(p: PalaceInfo, name: string): boolean {
  return allStars(p).some((s) => s.name === name);
}
function soul(chart: Chart): PalaceInfo {
  return chart.palaces[chart.soulIndex];
}
function surroundedIdx(idx: number): number[] {
  return [idx, (idx + 4) % 12, (idx + 8) % 12, (idx + 6) % 12];
}
function surStars(chart: Chart, idx: number): StarInfo[] {
  return surroundedIdx(idx).flatMap((i) => allStars(chart.palaces[i]));
}
function surNames(chart: Chart, idx: number): Set<string> {
  return new Set(surStars(chart, idx).map((s) => s.name));
}
function surMutagens(chart: Chart, idx: number): Set<string> {
  return new Set(surStars(chart, idx).map((s) => s.mutagen).filter(Boolean) as string[]);
}
function findStar(chart: Chart, name: string): StarInfo | undefined {
  for (const p of chart.palaces) {
    const s = allStars(p).find((x) => x.name === name);
    if (s) return s;
  }
  return undefined;
}
function bright(chart: Chart, name: string): string {
  return findStar(chart, name)?.brightness ?? '';
}
function flanks(chart: Chart, idx: number): [PalaceInfo, PalaceInfo] {
  return [chart.palaces[(idx + 11) % 12], chart.palaces[(idx + 1) % 12]];
}

type Rule = {
  id: string;
  name: string;
  grade: PatternInfo['grade'];
  stars: string[];
  test: (c: Chart) => boolean;
  summary: string;
};

const RULES: Rule[] = [
  {
    id: 'zifu-tonggong', name: '紫府同宫', grade: 'upper', stars: ['紫微', '天府'],
    test: (c) => has(soul(c), '紫微') && has(soul(c), '天府'),
    summary: '帝星与库星同坐命宫，格局宽厚、能聚能守，是天生的统筹者。唯需防两端摇摆、想太多。',
  },
  {
    id: 'zifu-chaoyuan', name: '紫府朝垣', grade: 'upper', stars: ['紫微', '天府'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('紫微') && n.has('天府') && !(has(soul(c), '紫微') && has(soul(c), '天府'));
    },
    summary: '紫微天府从三方四正来朝，贵气环绕，易得平台与贵人托举，适合借力成事。',
  },
  {
    id: 'fubi-gongzhu', name: '辅弼拱主', grade: 'upper', stars: ['紫微', '左辅', '右弼'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return has(soul(c), '紫微') && n.has('左辅') && n.has('右弼');
    },
    summary: '帝星得左辅右弼相拱，一呼百诺，领导力与团队缘俱佳，是带队伍的好手。',
  },
  {
    id: 'riyue-bingming', name: '日月并明', grade: 'upper', stars: ['太阳', '太阴'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('太阳') && n.has('太阴') && BRIGHT.includes(bright(c, '太阳')) && BRIGHT.includes(bright(c, '太阴'));
    },
    summary: '太阳太阴皆得辉会照命宫，阴阳相济、名利双收之象，为人光明又细腻。',
  },
  {
    id: 'riyue-fanbei', name: '日月反背', grade: 'special', stars: ['太阳', '太阴'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('太阳') && n.has('太阴') && bright(c, '太阳') === '陷' && bright(c, '太阴') === '陷';
    },
    summary: '日月皆失辉，古书视为辛劳之象。今解：付出常被低估，宜主动争取曝光、别闷头苦干。',
  },
  {
    id: 'rizhao-leimen', name: '日照雷门', grade: 'upper', stars: ['太阳'],
    test: (c) => has(soul(c), '太阳') && soul(c).branch === '卯',
    summary: '太阳升于卯宫，如旭日东升，少年得志、名声外扬，利公众与表达型事业。',
  },
  {
    id: 'yuesheng-canghai', name: '月生沧海', grade: 'upper', stars: ['太阴'],
    test: (c) => has(soul(c), '太阴') && soul(c).branch === '子',
    summary: '太阴居子入庙，月照沧海，清秀聪慧、财帛暗聚，利长期积累与不动产。',
  },
  {
    id: 'qisha-chaodou', name: '七杀朝斗', grade: 'upper', stars: ['七杀'],
    test: (c) => has(soul(c), '七杀') && ['子', '午', '寅', '申'].includes(soul(c).branch),
    summary: '七杀居四马之地朝斗，魄力惊人、能独当一面，是开疆拓土的将才，宜谋定后动。',
  },
  {
    id: 'shapolang', name: '杀破狼', grade: 'special', stars: ['七杀', '破军', '贪狼'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('七杀') && n.has('破军') && n.has('贪狼');
    },
    summary: '七杀破军贪狼会照命宫，人生动荡而精彩，主动求变者大成，怕的是随波逐流。',
  },
  {
    id: 'jiyue-tongliang', name: '机月同梁', grade: 'middle', stars: ['天机', '太阴', '天同', '天梁'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('天机') && n.has('太阴') && n.has('天同') && n.has('天梁');
    },
    summary: '机月同梁四星会齐，古称"作吏人"，今解为适合专业、幕僚、公职与稳定型职涯。',
  },
  {
    id: 'fuxiang-chaoyuan', name: '府相朝垣', grade: 'upper', stars: ['天府', '天相'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('天府') && n.has('天相');
    },
    summary: '天府天相来朝，库印相扶，衣食丰足、贵人提携，是稳健富足之格。',
  },
  {
    id: 'mingzhu-chuhai', name: '明珠出海', grade: 'upper', stars: ['太阳', '太阴'],
    test: (c) => soul(c).branch === '未' && soul(c).majorStars.length === 0
      && surNames(c, c.soulIndex).has('太阳') && surNames(c, c.soulIndex).has('太阴'),
    summary: '命宫在未空宫，日月并明来照，如明珠出海，才华外显、名利可期。',
  },
  {
    id: 'shizhong-yinyu', name: '石中隐玉', grade: 'middle', stars: ['巨门'],
    test: (c) => has(soul(c), '巨门') && ['子', '午'].includes(soul(c).branch),
    summary: '巨门居子午，美玉藏石，才华需打磨方显，宜以专业与口才立身，大器晚成。',
  },
  {
    id: 'xiongsu-chaoyuan', name: '雄宿朝元', grade: 'upper', stars: ['廉贞'],
    test: (c) => has(soul(c), '廉贞') && ['寅', '申'].includes(soul(c).branch),
    summary: '廉贞居寅申，雄宿朝元，才华与手腕兼备，能文能武，宜公关、管理、创作。',
  },
  {
    id: 'jiju-maoyou', name: '极居卯酉', grade: 'special', stars: ['紫微', '贪狼'],
    test: (c) => has(soul(c), '紫微') && has(soul(c), '贪狼') && ['卯', '酉'].includes(soul(c).branch),
    summary: '紫微贪狼居卯酉，古称脱俗之象。今解：精神追求高于物欲，宜文化、艺术、哲思之路。',
  },
  {
    id: 'matou-daijian', name: '马头带剑', grade: 'special', stars: ['擎羊'],
    test: (c) => has(soul(c), '擎羊') && soul(c).branch === '午',
    summary: '擎羊居午坐命，马头带剑，威权出众但锋芒太露，宜化戾气为魄力、防冲动。',
  },
  {
    id: 'luma-jiaochi', name: '禄马交驰', grade: 'middle', stars: ['禄存', '天马'],
    test: (c) => {
      const n = surNames(c, c.soulIndex);
      return n.has('禄存') && n.has('天马');
    },
    summary: '禄存天马会照，动中求财、越跑越旺，利外地发展、贸易与流动性事业。',
  },
  {
    id: 'sanqi-jiahui', name: '三奇加会', grade: 'upper', stars: ['化禄', '化权', '化科'],
    test: (c) => {
      const m = surMutagens(c, c.soulIndex);
      return m.has('禄') && m.has('权') && m.has('科');
    },
    summary: '化禄化权化科三奇会照命宫，财、权、名齐来，是难得的全能贵格。',
  },
  {
    id: 'yangtuo-jiaming', name: '羊陀夹命', grade: 'special', stars: ['擎羊', '陀罗', '禄存'],
    test: (c) => {
      const [prev, next] = flanks(c, c.soulIndex);
      return (has(prev, '擎羊') && has(next, '陀罗')) || (has(prev, '陀罗') && has(next, '擎羊'));
    },
    summary: '擎羊陀罗夹命（多因禄存同宫），禄逢夹制，求财辛苦、宜守不宜冲，稳中方能聚。',
  },
  {
    id: 'kongjie-jiaming', name: '空劫夹命', grade: 'special', stars: ['地空', '地劫'],
    test: (c) => {
      const [prev, next] = flanks(c, c.soulIndex);
      return (has(prev, '地空') && has(next, '地劫')) || (has(prev, '地劫') && has(next, '地空'));
    },
    summary: '地空地劫夹命，想法超脱、不重物质，利创意与精神事业，理财宜稳健。',
  },
];

/** 判定全部成立格局 */
export function detectPatterns(chart: Chart): PatternInfo[] {
  const soulName = soul(chart).name;
  const out: PatternInfo[] = [];
  for (const r of RULES) {
    try {
      if (r.test(chart)) {
        out.push({
          id: r.id,
          name: r.name,
          grade: r.grade,
          palaces: [soulName],
          stars: r.stars,
          summary: r.summary,
        });
      }
    } catch {
      /* 单条规则异常不影响整体 */
    }
  }
  // 上格优先排序
  const order = { upper: 0, middle: 1, special: 2 };
  return out.sort((a, b) => order[a.grade] - order[b.grade]);
}