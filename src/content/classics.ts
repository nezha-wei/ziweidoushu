/**
 * 古籍辑要（公有领域）。
 * 仅收录已进入公有领域的古代歌诀原文（《骨髓赋》《紫微斗数全书》等），
 * 不含任何现代人的讲课原话或受 CC BY-NC-SA 约束的内容。
 * 引文用于文化展示与趣味佐证，不构成任何决策建议。
 */
export interface ClassicQuote {
  text: string;
  source: string;
  /** 原创白话提示 */
  hint: string;
}

export const CLASSICS: ClassicQuote[] = [
  {
    text: '斗数至玄至微，理旨难明。',
    source: '《骨髓赋》',
    hint: '开篇即言斗数精微，提醒后人：星盘是参考，不是定论。',
  },
  {
    text: '紫微天府，全依辅弼之功。',
    source: '《骨髓赋》',
    hint: '再尊贵的帝星，也要左辅右弼帮衬——独狼走不远。',
  },
  {
    text: '七杀破军，专依羊铃之虐。',
    source: '《骨髓赋》',
    hint: '刚烈的将星遇上擎羊铃星，冲劲易变冲动，宜修一个"稳"字。',
  },
  {
    text: '日月最嫌反背，禄马最喜交驰。',
    source: '《骨髓赋》',
    hint: '太阳太阴怕失辉，禄存天马爱奔走——动静之间见吉凶。',
  },
  {
    text: '禄逢冲破，吉处藏凶；马遇空亡，终身奔走。',
    source: '《骨髓赋》',
    hint: '好事里也可能埋着坑，热闹中更要留清醒。',
  },
  {
    text: '生逢败地，发也虚花；绝处逢生，花而不败。',
    source: '《骨髓赋》',
    hint: '起点低未必输，绝境里反而开出真花。',
  },
  {
    text: '星临庙旺，再观生克之机；命坐强宫，细察制化之理。',
    source: '《骨髓赋》',
    hint: '好星也要看搭配，强命更需懂制衡——没有绝对的好牌。',
  },
  {
    text: '紫微辅弼同宫，一呼百诺居上品。',
    source: '《骨髓赋》',
    hint: '帝星得辅弼相伴，领导力拉满，是经典的好格局。',
  },
  {
    text: '日月科禄丑未中，定是方伯公。',
    source: '《骨髓赋》',
    hint: '日月会科禄于丑未，古人许以贵格，今人看作名利双收之象。',
  },
  {
    text: '极居卯酉，多为脱俗僧人。',
    source: '《骨髓赋》',
    hint: '紫微贪狼居卯酉，古称脱俗之象，今解为精神追求高于物欲。',
  },
  {
    text: '命实运坚，稻田得雨；身衰命弱，枯草逢霜。',
    source: '《紫微斗数全书》',
    hint: '命与运相扶则如鱼得水，相悖则需更多耐心。',
  },
  {
    text: '星有同异，数有分定，须明其理，方得其真。',
    source: '《紫微斗数全书》',
    hint: '同样的星，不同的盘，道理通了才看得真。',
  },
];

/** 随机取一条古籍（用于空态/彩蛋） */
export function randomClassic(seed?: number): ClassicQuote {
  const i = typeof seed === 'number'
    ? Math.abs(seed) % CLASSICS.length
    : Math.floor(Math.random() * CLASSICS.length);
  return CLASSICS[i];
}