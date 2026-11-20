/**
 * 紫微斗数 · 共享领域模型
 * ------------------------------------------------------------------
 * 本文件是前端类型与 docs/api.md 接口契约的唯一来源。
 * 所有接口请求/响应、UI 状态、本地计算结果均复用此处定义，
 * 禁止在其它文件重复定义同义字段或出现命名歧义。
 */

/** 性别 */
export type Gender = 'male' | 'female';

/** 四化 */
export type Mutagen = '禄' | '权' | '科' | '忌';

/** 星曜类型（与 iztro 对齐并归一化） */
export type StarType =
  | 'major' // 主星
  | 'soft' // 吉星/辅星
  | 'tough' // 煞星
  | 'adjective' // 杂耀
  | 'flower' // 桃花星
  | 'helper' // 解神
  | 'lucun' // 禄存
  | 'tianma'; // 天马

/** 星曜作用范围 */
export type StarScope = 'origin' | 'decadal' | 'yearly';

/** 历法类型 */
export type CalendarType = 'solar' | 'lunar';

/** 闰月口径：split=十五分界（前半月归本月、后半月归下月）；current=整月归本月 */
export type LeapPolicy = 'split' | 'current';

/** 晚子时口径：forward=23:00 后算来日；current=算当日 */
export type ZiHourPolicy = 'forward' | 'current';

/** 年分界：normal=正月初一；exact=立春 */
export type YearDivide = 'normal' | 'exact';

/** 亮度等级（庙旺得利平不陷） */
export type Brightness = '庙' | '旺' | '得' | '利' | '平' | '不' | '陷' | '';

/** 用户生辰输入（接口 BirthInput） */
export interface BirthInput {
  /** 历法 */
  calendar: CalendarType;
  /** 年（公历 1900–2100；农历同） */
  year: number;
  /** 月 1–12 */
  month: number;
  /** 日 1–31（按历法校验真实存在） */
  day: number;
  /** 钟表小时 0–23 */
  hour: number;
  /** 钟表分钟 0–59 */
  minute: number;
  /** 性别 */
  gender: Gender;
  /** 出生地城市 ID（可选，用于真太阳时） */
  birthplaceId?: string;
  /** 出生地经度（东经正，可由城市推导或手动输入） */
  longitude?: number;
  /** 是否启用真太阳时校正 */
  useTrueSolarTime: boolean;
  /** 是否应用夏令时回拨（中国 1986–1991） */
  dstAdjust: boolean;
  /** 闰月口径 */
  leapPolicy: LeapPolicy;
  /** 晚子时口径 */
  ziHourPolicy: ZiHourPolicy;
  /** 年分界 */
  yearDivide: YearDivide;
  /** 农历输入时是否为闰月 */
  isLeapMonth?: boolean;
  /** 昵称（用于星卡，可选） */
  nickname?: string;
}

/** 归一化星曜 */
export interface StarInfo {
  name: string;
  type: StarType;
  scope: StarScope;
  brightness: Brightness;
  mutagen?: Mutagen;
}

/** 大限（十年运）基础信息 */
export interface DecadalInfo {
  /** 起止虚岁 */
  range: [number, number];
  /** 天干 */
  stem: string;
  /** 地支 */
  branch: string;
}

/** 归一化宫位 */
export interface PalaceInfo {
  /** 宫位索引 0–11（寅起） */
  index: number;
  /** 宫名：命宫/兄弟/夫妻… */
  name: string;
  /** 地支 */
  branch: string;
  /** 天干 */
  stem: string;
  /** 是否命宫 */
  isSoul: boolean;
  /** 是否身宫 */
  isBody: boolean;
  /** 是否来因宫 */
  isOriginal: boolean;
  /** 主星 */
  majorStars: StarInfo[];
  /** 辅星 */
  minorStars: StarInfo[];
  /** 杂耀 */
  adjectiveStars: StarInfo[];
  /** 长生十二神 */
  changsheng12: string;
  /** 博士十二神 */
  boshi12: string;
  /** 大限 */
  decadal: DecadalInfo;
  /** 小限虚岁列表 */
  ages: number[];
}

/** 四化飞星轨迹（用于动画与接口） */
export interface SiHuaFlight {
  mutagen: Mutagen;
  /** 化星名 */
  star: string;
  /** 源宫索引 */
  fromIndex: number;
  /** 目标宫索引（化星所落之宫） */
  toIndex: number;
  /** 是否自化 */
  self: boolean;
}

/** 格局判定结果 */
export interface PatternInfo {
  id: string;
  name: string;
  /** 上格 / 中格 / 特殊 */
  grade: 'upper' | 'middle' | 'special';
  /** 涉及宫位名 */
  palaces: string[];
  /** 涉及星曜 */
  stars: string[];
  /** 原创解读（娱乐化表述） */
  summary: string;
}

/** 人生五维趣味指标（0–100，娱乐参考） */
export interface LifeMetrics {
  career: number; // 事业
  wealth: number; // 财运
  love: number; // 感情
  health: number; // 健康
  social: number; // 人缘
}

/** 大限推演项（人生阶段时间轴） */
export interface DecadalStage {
  /** 序号（0 为第一大限） */
  order: number;
  /** 所在本命宫索引 */
  palaceIndex: number;
  /** 所在本命宫名 */
  palaceName: string;
  /** 起止虚岁 */
  ageRange: [number, number];
  /** 起止公历年 */
  yearRange: [number, number];
  /** 大限天干 */
  stem: string;
  /** 大限地支 */
  branch: string;
  /** 大限四化星（禄权科忌顺序） */
  mutagen: string[];
  /** 原创阶段叙事 */
  narrative: string;
  /** 阶段主题词 */
  theme: string;
}

/** 历法校正明细（真太阳时/夏令时） */
export interface TimeCorrection {
  /** 是否启用真太阳时 */
  trueSolarApplied: boolean;
  /** 经度时差（分钟） */
  longitudeOffsetMin: number;
  /** 均时差（分钟） */
  equationOfTimeMin: number;
  /** 夏令时回拨（分钟，0 或 -60） */
  dstOffsetMin: number;
  /** 校正后钟表时间 HH:mm */
  correctedClock: string;
  /** 校正后钟表日期 YYYY-MM-DD（晚子时日分界由引擎 dayDivide 另行作用，见 ganzhi） */
  correctedDate: string;
  /** 时辰序号 0–12（0 早子时，12 晚子时） */
  timeIndex: number;
  /** 时辰名 */
  timeName: string;
  /** 是否处于中国夏令时区间 */
  inDstSpan: boolean;
  /** 提示文案 */
  notes: string[];
  /** 校正后钟表公历年 */
  solarYear: number;
  /** 校正后钟表公历月 */
  solarMonth: number;
  /** 校正后钟表公历日 */
  solarDay: number;
}

/** 归一化命盘（接口 Chart 的核心） */
export interface Chart {
  /** 命盘唯一键：YYYY-MM-DD-timeIndex-gender-口径hash */
  id: string;
  /** 输入回显 */
  input: BirthInput;
  /** 历法校正明细 */
  correction: TimeCorrection;
  /** 公历日期 YYYY-MM-DD */
  solarDate: string;
  /** 农历日期（中文） */
  lunarDate: string;
  /** 干支纪年（年 月 日 时） */
  ganzhi: string;
  /** 时辰名 */
  timeName: string;
  /** 时辰时间段 */
  timeRange: string;
  /** 生肖 */
  zodiac: string;
  /** 星座 */
  sign: string;
  /** 命宫地支 */
  soulBranch: string;
  /** 身宫地支 */
  bodyBranch: string;
  /** 命主星 */
  soulMaster: string;
  /** 身主星 */
  bodyMaster: string;
  /** 五行局 */
  fiveElements: string;
  /** 性别中文 */
  genderLabel: string;
  /** 十二宫（按索引 0–11） */
  palaces: PalaceInfo[];
  /** 命宫索引 */
  soulIndex: number;
  /** 身宫索引 */
  bodyIndex: number;
  /** 生年四化飞星 */
  natalFlights: SiHuaFlight[];
  /** 格局列表 */
  patterns: PatternInfo[];
  /** 人生五维 */
  metrics: LifeMetrics;
  /** 大限推演 */
  stages: DecadalStage[];
  /** 命宫主星原型标题（星卡用） */
  archetype: string;
  /** 诗意一句话（星卡用） */
  verse: string;
  /** 生成时间戳 */
  createdAt: number;
}

/** 统一错误码 */
export type ApiErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_GENDER'
  | 'INVALID_LONGITUDE'
  | 'UNSUPPORTED_YEAR'
  | 'LEAP_MONTH_NOT_EXIST'
  | 'COMPUTE_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'BACKEND_UNAVAILABLE'
  | 'INTERNAL';

/** 统一错误响应 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** 可选字段级错误 */
  fields?: Record<string, string>;
}

/** 统一响应包裹 */
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
  /** 数据来源：local=前端本地计算；remote=后端 */
  source: 'local' | 'remote';
}

/** 城市（出生地） */
export interface City {
  id: string;
  name: string;
  province: string;
  /** 东经度数 */
  longitude: number;
}

/** 命盘摘要（历史记录列表项） */
export interface ChartSummary {
  id: string;
  solarDate: string;
  lunarDate: string;
  genderLabel: string;
  soulBranch: string;
  archetype: string;
  nickname?: string;
  createdAt: number;
}

/** 解读响应（未来 AI 接口预留） */
export interface Interpretation {
  chartId: string;
  palace?: string;
  text: string;
  /** local=本地原创解读；remote=后端 AI */
  source: 'local' | 'remote';
}