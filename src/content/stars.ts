/**
 * 星曜原创解读内容。
 * 全部为本项目原创撰写的娱乐化、人格化表述，不复制任何未开源断语库，
 * 不引用非商用（CC BY-NC-SA）的现代讲课原话。古籍引证见 classics.ts（公有领域）。
 */
import type { StarType } from '../engine/types';

export interface MajorStarContent {
  name: string;
  alias: string; // 古称
  element: string; // 五行
  archetype: string; // 人格原型标题
  keywords: string[];
  desc: string; // 核心描述
  light: string; // 庙旺时的正面发挥
  shadow: string; // 落陷或过度时的提醒
  verse: string; // 一句诗
}

export const MAJOR_STARS: Record<string, MajorStarContent> = {
  紫微: {
    name: '紫微', alias: '帝星', element: '土', archetype: '天生的主角',
    keywords: ['尊贵', '领导', '体面', '主见'],
    desc: '紫微是北斗之主，像人群里自带聚光灯的那个人。你未必最爱出风头，但关键时刻总被推到台前，也天然在意尊严与格调。',
    light: '庙旺时气度从容，能聚人、能扛事，越被信任越出色。',
    shadow: '落陷或孤君无辅时，容易端着、耳根软又好面子，需防曲高和寡。',
    verse: '紫微端坐北辰中，众星拱之自从容。',
  },
  天机: {
    name: '天机', alias: '善星', element: '木', archetype: '停不下来的军师',
    keywords: ['机敏', '谋略', '善变', '思虑'],
    desc: '天机是动脑的星，脑子转得比嘴快。你擅长拆解问题、预判走势，享受"想明白"的快感，却也常常想太多而迟迟不动。',
    light: '庙旺时思路清奇、学习力极强，是团队里的智囊与解题人。',
    shadow: '落陷时思虑过重、计划常改，易神经紧张，宜学会落地与止损。',
    verse: '天机一动百念生，谋定而后动方成。',
  },
  太阳: {
    name: '太阳', alias: '贵星', element: '火', archetype: '行走的发光体',
    keywords: ['热情', '博爱', '付出', '名声'],
    desc: '太阳照着别人，也燃烧着自己。你慷慨、爱张罗、有公众缘，习惯把光和热分出去，有时却忘了给自己留一点。',
    light: '庙旺时光芒四射，利名声、利公众事务，越分享越旺。',
    shadow: '落陷时付出多回报少，易心累眼高手低，宜先照亮自己。',
    verse: '太阳当空照四方，施光不问返照长。',
  },
  武曲: {
    name: '武曲', alias: '财星', element: '金', archetype: '硬核实干家',
    keywords: ['刚毅', '执行力', '财帛', '孤克'],
    desc: '武曲是将财之星，认结果不认情绪。你做事干脆、扛压能力强，对钱和效率敏感，偶尔显得不近人情。',
    light: '庙旺时执行力与理财力俱佳，靠专业与纪律积累实力。',
    shadow: '落陷或过刚时易固执孤僻、与人硬碰，宜柔化表达。',
    verse: '武曲持金断是非，千锤百炼始成器。',
  },
  天同: {
    name: '天同', alias: '福星', element: '水', archetype: '人间小福星',
    keywords: ['温和', '享乐', '随缘', '孩子气'],
    desc: '天同是享福的星，自带松弛感。你与人为善、懂得生活，不愿把日子过成战场，但太舒服时也容易少了点冲劲。',
    light: '庙旺时福泽深厚、人缘极佳，知足常乐反而顺遂。',
    shadow: '落陷时易懒散拖延、安于现状，需一点外力激发。',
    verse: '天同自在福中来，不争不抢亦开怀。',
  },
  廉贞: {
    name: '廉贞', alias: '囚星', element: '火', archetype: '复杂的外交家',
    keywords: ['才华', '公关', '执着', '约束'],
    desc: '廉贞是次桃花兼囚星，魅力与棱角并存。你聪明有手腕、情感浓烈，既懂规则又想突破规则，内心戏很足。',
    light: '庙旺时才华出众、交际手腕高明，能成大事。',
    shadow: '落陷或化忌时易钻牛角尖、被情绪或关系所困，宜守底线。',
    verse: '廉贞如火亦如囚，才情深处自风流。',
  },
  天府: {
    name: '天府', alias: '库星', element: '土', archetype: '稳健的掌库人',
    keywords: ['包容', '守成', '库藏', '体面'],
    desc: '天府是南斗之主、财帛之库，像稳坐后方的管家。你大气、保守、重安全感，擅长守成与统筹，不喜冒险。',
    light: '庙旺时库藏丰盈、格局宽厚，能容人容事容财。',
    shadow: '落陷或空库时易保守过度、外强中干，宜开源而非只守。',
    verse: '天府藏珍库自丰，稳坐中军气度宏。',
  },
  太阴: {
    name: '太阴', alias: '富星', element: '水', archetype: '安静的月光',
    keywords: ['细腻', '内敛', '财富', '阴柔'],
    desc: '太阴是月亮，安静地积聚。你感受力强、审美在线、理财有耐心，情绪如潮汐，外表平静内心丰盈。',
    light: '庙旺时清秀细腻、财帛暗聚，利不动产与长期积累。',
    shadow: '落陷时易多愁善感、优柔寡断，宜建立情绪边界。',
    verse: '太阴如水月如钩，静里乾坤暗自收。',
  },
  贪狼: {
    name: '贪狼', alias: '桃花星', element: '木', archetype: '多才的欲望家',
    keywords: ['欲望', '才艺', '交际', '好奇'],
    desc: '贪狼是欲望与才华之星，对世界充满好奇。你兴趣广、学什么都快、魅力足，人生课题是把"想要"炼成"专精"。',
    light: '庙旺时多才多艺、八面玲珑，能把兴趣做成事业。',
    shadow: '落陷时易贪多嚼不烂、沉迷享乐，宜聚焦与节制。',
    verse: '贪狼多才亦多欲，收得一枝便是春。',
  },
  巨门: {
    name: '巨门', alias: '暗星', element: '水', archetype: '犀利的辩手',
    keywords: ['口才', '研究', '是非', '洞察'],
    desc: '巨门是口舌与暗昧之星，靠嘴和脑吃饭。你观察入微、表达犀利、爱追根究底，适合研究、教学、谈判，也要防口舌。',
    light: '庙旺时口才与洞察力惊人，能以专业服人。',
    shadow: '落陷或化忌时易招是非、言多必失，宜修口德。',
    verse: '巨门一启是非生，言之有物自分明。',
  },
  天相: {
    name: '天相', alias: '印星', element: '水', archetype: '可靠的宰相',
    keywords: ['辅佐', '公正', '体面', '服务'],
    desc: '天相是掌印之相，天生的二把手与协调者。你重承诺、讲公平、有服务精神，擅长把别人的想法漂亮地落地。',
    light: '庙旺时稳重可信、贵人缘佳，是最佳合伙人与幕僚。',
    shadow: '落陷时易缺乏主见、被人影响，宜立定自己的立场。',
    verse: '天相持印辅明君，公正无私自有勋。',
  },
  天梁: {
    name: '天梁', alias: '荫星', element: '土', archetype: '逢凶化吉的长者',
    keywords: ['庇荫', '原则', '老成', '化解'],
    desc: '天梁是荫星与寿星，像团队里的长辈。你有原则、爱照顾人、遇难呈祥，年纪越长越有威望，偶尔有点爱说教。',
    light: '庙旺时逢凶化吉、得长辈提携，利公职与专业权威。',
    shadow: '落陷时易清高孤傲、好为人师，宜多倾听少评判。',
    verse: '天梁荫庇寿绵长，历尽风波自吉祥。',
  },
  七杀: {
    name: '七杀', alias: '将星', element: '金', archetype: '孤勇的将军',
    keywords: ['果决', '独立', '冲劲', '肃杀'],
    desc: '七杀是上将之星，人生靠打拼。你独立、果断、敢闯敢拼，不喜欢被安排，越是硬仗越能激发你的将才。',
    light: '庙旺时魄力惊人、能独当一面，乱世出英雄。',
    shadow: '落陷时易冲动孤克、大起大落，宜谋定后动、留余地。',
    verse: '七杀临阵敢争先，一身孤勇破万难。',
  },
  破军: {
    name: '破军', alias: '耗星', element: '水', archetype: '破局的先锋',
    keywords: ['开创', '破坏', '变动', '先破后立'],
    desc: '破军是先锋与耗星，天生要打破旧局。你不甘平庸、敢推翻重来，人生常常"先破后立"，在变动里开出新路。',
    light: '庙旺时开创力极强，能在废墟上建起新城。',
    shadow: '落陷时易破坏过度、消耗过大，宜破中有立、控制成本。',
    verse: '破军一出旧局开，先破后立见雄才。',
  },
};

export interface MinorStarContent {
  name: string;
  type: StarType;
  note: string;
}

/** 重要辅星/煞星/杂耀的原创短注 */
export const MINOR_STARS: Record<string, MinorStarContent> = {
  左辅: { name: '左辅', type: 'soft', note: '助力之星，贵人暗中相助，做事有人帮衬。' },
  右弼: { name: '右弼', type: 'soft', note: '辅佐之星，人缘与协作力佳，宜团队作战。' },
  文昌: { name: '文昌', type: 'soft', note: '文墨之星，利考试、文书、学术与表达。' },
  文曲: { name: '文曲', type: 'soft', note: '才艺之星，口才与艺术感受力强，带桃花气。' },
  天魁: { name: '天魁', type: 'soft', note: '阳贵人，关键时刻有长辈、男性贵人提携。' },
  天钺: { name: '天钺', type: 'soft', note: '阴贵人，机遇暗藏，常得女性或晚辈助力。' },
  禄存: { name: '禄存', type: 'lucun', note: '财禄之星，主稳定进财与积蓄，逢煞则减力。' },
  天马: { name: '天马', type: 'tianma', note: '驿马之星，主奔波、变动、外出得利。' },
  擎羊: { name: '擎羊', type: 'tough', note: '刚烈煞星，冲劲与冲突并存，宜化戾气为魄力。' },
  陀罗: { name: '陀罗', type: 'tough', note: '纠缠煞星，拖延与反复，宜果断斩乱麻。' },
  火星: { name: '火星', type: 'tough', note: '暴烈煞星，来去如风，爆发力强但易急躁。' },
  铃星: { name: '铃星', type: 'tough', note: '阴火煞星，闷烧与暗劲，宜疏导情绪。' },
  地空: { name: '地空', type: 'tough', note: '空亡之星，想法超脱，利创意不利守财。' },
  地劫: { name: '地劫', type: 'tough', note: '劫耗之星，得而复失，宜稳健理财。' },
  红鸾: { name: '红鸾', type: 'flower', note: '喜庆桃花，主婚恋、人缘与喜事。' },
  天喜: { name: '天喜', type: 'flower', note: '欢喜之星，添丁、庆典与好心情。' },
  天姚: { name: '天姚', type: 'flower', note: '风情桃花，魅力与暧昧，宜把握分寸。' },
  天刑: { name: '天刑', type: 'adjective', note: '刑律之星，自律与原则，亦主小磕碰。' },
  天哭: { name: '天哭', type: 'adjective', note: '情绪之星，感受细腻，宜防低落。' },
  天虚: { name: '天虚', type: 'adjective', note: '虚耗之星，外实内虚，宜充实根本。' },
  龙池: { name: '龙池', type: 'adjective', note: '才艺之星，审美与技艺出众。' },
  凤阁: { name: '凤阁', type: 'adjective', note: '文华之星，仪表与品味佳。' },
  解神: { name: '解神', type: 'helper', note: '化解之星，逢凶化吉，消解煞气。' },
  天巫: { name: '天巫', type: 'adjective', note: '玄缘之星，直觉与升迁之象。' },
  天月: { name: '天月', type: 'adjective', note: '康养之星，留意慢性小恙。' },
  阴煞: { name: '阴煞', type: 'adjective', note: '暗昧之星，防小人与多疑。' },
  天德: { name: '天德', type: 'adjective', note: '福德之星，逢凶化吉的护佑。' },
  月德: { name: '月德', type: 'adjective', note: '阴德之星，贵人暗助。' },
};

/** 亮度对发挥的修饰（原创） */
export const BRIGHTNESS_MOD: Record<string, string> = {
  庙: '能量满格，正面特质发挥得淋漓尽致。',
  旺: '状态上扬，优势明显，正是发力时。',
  得: '得地而稳，发挥均衡，进退有据。',
  利: '尚算得力，需借势而行。',
  平: '力量平平，吉凶参半，靠后天经营。',
  不: '不得其地，优势受限，宜扬长避短。',
  陷: '落陷内敛，能量被压住，反而逼出另一番韧性。',
};

export const MAJOR_STAR_NAMES = Object.keys(MAJOR_STARS);