/**
 * 天干四化对照表与飞星工具。
 * 表值与 iztro 默认四化配置一致（已用 decadalList 输出核验：壬=天梁禄紫微权左辅科武曲忌，
 * 辛=巨门禄太阳权文曲科文昌忌，庚=太阳禄武曲权太阴科天同忌）。
 * 四化顺序固定为 [禄, 权, 科, 忌]。
 */
import type { Mutagen, SiHuaFlight } from './types';

export const MUTAGEN_ORDER: Mutagen[] = ['禄', '权', '科', '忌'];

export const STEM_MUTAGEN: Record<string, [string, string, string, string]> = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};

/** 四化语义色（与设计令牌一致） */
export const MUTAGEN_COLOR: Record<Mutagen, string> = {
  禄: '#2d7a4a', // 青绿
  权: '#1a56a8', // 黛蓝
  科: '#8a7018', // 赭金
  忌: '#a83228', // 朱砂
};

/** 四化原创释义 */
export const MUTAGEN_MEANING: Record<Mutagen, { title: string; desc: string }> = {
  禄: { title: '化禄 · 缘起与丰盈', desc: '禄是缘分与财禄的放大器，所到之处机会增多、资源汇聚，但也怕被冲破。' },
  权: { title: '化权 · 掌控与扩张', desc: '权是权力与行动力，所到之处想主导、能扛事，过旺则易强势压人。' },
  科: { title: '化科 · 名声与贵人', desc: '科是名声与科甲，所到之处易得认可、逢凶化吉，是温和的贵气。' },
  忌: { title: '化忌 · 执着与课题', desc: '忌是牵挂与功课，所到之处易纠结、需用心经营，也是成长最深的地方。' },
};

/**
 * 由某宫天干推四化飞星目标。
 * @param fromIndex 源宫索引
 * @param stem 源宫天干
 * @param locateStar 给定星名返回其所在宫索引（找不到返回 -1）
 */
export function flightsFromStem(
  fromIndex: number,
  stem: string,
  locateStar: (name: string) => number,
): SiHuaFlight[] {
  const table = STEM_MUTAGEN[stem];
  if (!table) return [];
  return table.map((star, i) => {
    const toIndex = locateStar(star);
    return {
      mutagen: MUTAGEN_ORDER[i],
      star,
      fromIndex,
      toIndex: toIndex < 0 ? fromIndex : toIndex,
      self: toIndex === fromIndex,
    };
  });
}