/** lunar-javascript 无官方类型声明，此处声明为 any 模块（仅用了历法转换的少量 API）。 */
declare module 'lunar-javascript' {
  export class Lunar {
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Lunar;
    getSolar(): Solar;
    getYearInChinese(): string;
    getYearInGanZhi(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  }
  export class Solar {
    static fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }
  export class LunarYear {
    static fromYear(y: number): LunarYear;
    getLeapMonth(): number;
  }
}