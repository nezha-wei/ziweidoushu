# 紫微斗数 · 前后端接口契约（API v1）

> 本文档是前后端契约的**唯一规范文本**；机器可读的唯一类型来源为 [`src/engine/types.ts`](../src/engine/types.ts)。
> 两者字段一一对应：文档中的模型表即该文件接口的逐字段说明，禁止在其它位置重复定义或改写命名。
> 所有成功响应示例由真实引擎生成（`node scripts/gen-examples.mjs`），存于 [`docs/examples/`](./examples/)，与代码零漂移。

---

## 1. 总则

| 约定 | 内容 |
| --- | --- |
| 统一前缀 | `/api/v1`（版本号入路径，破坏性变更升 `v2`，旧版保留过渡期） |
| 传输格式 | 请求与响应均为 `application/json; charset=utf-8` |
| 资源命名 | 复数名词、小写、连字符分隔；子资源用路径嵌套（`/charts/{id}/interpretation`） |
| 方法语义 | `POST` 创建/计算，`GET` 读取（无副作用），`DELETE` 删除 |
| 鉴权 | **当前全部接口公开、无需鉴权**。默认模式下生辰数据不出浏览器；仅当显式配置远端后端时请求才携带生辰输入。未来如引入账户体系，采用 `Authorization: Bearer <token>`，届时在本节增补，不改变现有字段 |
| 响应包裹 | 所有接口（含错误）统一返回 `ApiResult<T>`（见 §2.13），HTTP 状态码与 `ok` 语义一致 |
| 数据来源标记 | `ApiResult.source`：`local` = 前端本地计算/本地存储；`remote` = 后端响应。UI 只消费 `ApiResult`，不感知来源 |
| 命盘 ID | 确定性字符串：`{公历日期}-{时辰序号}-{gender}-{leapPolicy}-{ziHourPolicy}-{yearDivide}-{useTrueSolarTime?1:0}-{dstAdjust?1:0}`，例 `2000-08-16-2-female-split-forward-normal-1-1`。同输入同口径必得同 ID，故 `POST /charts` 天然幂等 |
| 数值单位 | 经度：度（东经正）；时差：分钟（保留 1 位小数）；虚岁/年份：整数；时间戳：毫秒 |
| 空值 | 可选字段缺省时**省略键**（不写 `null`）；字符串空值仅 `StarInfo.brightness` 允许 `""`（表示无亮度等级） |

### 1.1 实现状态总览

| 接口 | 当前实现 | 远端预留 |
| --- | --- | --- |
| `POST /api/v1/charts` | ✅ 前端本地（iztro 引擎，浏览器内计算） | ✅ 配置 `VITE_API_BASE` 后优先远端，失败自动回落本地 |
| `GET /api/v1/charts` | ✅ 本地 localStorage 历史 | ✅ 同上 |
| `GET /api/v1/charts/{id}` | ✅ 本地历史优先 | ✅ 本地未命中再询远端 |
| `DELETE /api/v1/charts/{id}` | ✅ 本地删除 | ✅ 同步发送远端删除（失败不影响本地结果） |
| `POST /api/v1/charts/{id}/interpretation` | ✅ 本地原创解读库 | ✅ 远端 AI 解读预留，失败回落本地 |
| 单星解读 `interpretStar()` | ✅ 纯本地函数（UI 直调，**无 HTTP 对应端点**） | 不预留 |
| 城市表 `City[]` | ✅ 静态内置（`src/content/cities.ts`） | 不预留端点，模型见 §2.12 |

---

## 2. 共享数据模型（集中定义，全文唯一）

### 2.1 枚举

| 枚举 | 取值 | 说明 |
| --- | --- | --- |
| `Gender` | `male` / `female` | 性别 |
| `Mutagen` | `禄` / `权` / `科` / `忌` | 四化 |
| `StarType` | `major` / `soft` / `tough` / `adjective` / `flower` / `helper` / `lucun` / `tianma` | 主星 / 吉辅 / 煞 / 杂耀 / 桃花 / 解神 / 禄存 / 天马 |
| `StarScope` | `origin` / `decadal` / `yearly` | 本命 / 大限 / 流年 |
| `CalendarType` | `solar` / `lunar` | 公历 / 农历 |
| `LeapPolicy` | `split` / `current` | 闰月口径：十五分界 / 整月归本月 |
| `ZiHourPolicy` | `forward` / `current` | 晚子时：23:00 后算来日 / 算当日（作用于引擎 dayDivide，改变日柱与时柱） |
| `YearDivide` | `normal` / `exact` | 年分界：正月初一 / 立春 |
| `Brightness` | `庙` `旺` `得` `利` `平` `不` `陷` `""` | 亮度等级，`""` 为无 |
| `PatternInfo.grade` | `upper` / `middle` / `special` | 上格 / 中格 / 特殊 |
| `ApiErrorCode` | 见 §5 | 统一错误码 |

### 2.2 BirthInput（用户生辰输入）

| 字段 | 类型 | 必填 | 取值范围 | 示例 |
| --- | --- | --- | --- | --- |
| `calendar` | CalendarType | 是 | `solar`/`lunar` | `"solar"` |
| `year` | number | 是 | 整数 1900–2100 | `2000` |
| `month` | number | 是 | 整数 1–12 | `8` |
| `day` | number | 是 | 公历按真实日期校验；农历整数 1–30 | `16` |
| `hour` | number | 是 | 整数 0–23（钟表小时） | `4` |
| `minute` | number | 是 | 整数 0–59 | `30` |
| `gender` | Gender | 是 | `male`/`female` | `"female"` |
| `birthplaceId` | string | 否 | 城市 ID（§2.12） | `"hangzhou"` |
| `longitude` | number | 否 | -180–180（东经正） | `120.15` |
| `useTrueSolarTime` | boolean | 是 | 真太阳时校正开关 | `true` |
| `dstAdjust` | boolean | 是 | 夏令时回拨开关（中国 1986–1991） | `true` |
| `leapPolicy` | LeapPolicy | 是 | `split`/`current` | `"split"` |
| `ziHourPolicy` | ZiHourPolicy | 是 | `forward`/`current` | `"forward"` |
| `yearDivide` | YearDivide | 是 | `normal`/`exact` | `"normal"` |
| `isLeapMonth` | boolean | 否 | 仅 `calendar=lunar` 时有意义 | `false` |
| `nickname` | string | 否 | ≤ 24 字符（星卡署名） | `"示例星旅人"` |

### 2.3 StarInfo（归一化星曜）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 星名，如 `紫微` |
| `type` | StarType | 是 | 分类 |
| `scope` | StarScope | 是 | 作用范围 |
| `brightness` | Brightness | 是 | 亮度，无则 `""` |
| `mutagen` | Mutagen | 否 | 生年四化所属，无则省略 |

### 2.4 DecadalInfo（宫位大限基础）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `range` | [number, number] | 是 | 起止虚岁 |
| `stem` | string | 是 | 大限天干 |
| `branch` | string | 是 | 大限地支 |

### 2.5 PalaceInfo（归一化宫位）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `index` | number | 是 | 宫索引 0–11，**寅起** |
| `name` | string | 是 | 宫名：命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母 |
| `branch` | string | 是 | 地支 |
| `stem` | string | 是 | 宫干 |
| `isSoul` | boolean | 是 | 是否命宫 |
| `isBody` | boolean | 是 | 是否身宫 |
| `isOriginal` | boolean | 是 | 是否来因宫 |
| `majorStars` | StarInfo[] | 是 | 主星（可空数组） |
| `minorStars` | StarInfo[] | 是 | 辅星 |
| `adjectiveStars` | StarInfo[] | 是 | 杂耀 |
| `changsheng12` | string | 是 | 长生十二神 |
| `boshi12` | string | 是 | 博士十二神 |
| `decadal` | DecadalInfo | 是 | 大限 |
| `ages` | number[] | 是 | 小限虚岁列表 |

### 2.6 SiHuaFlight（四化飞星轨迹）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mutagen` | Mutagen | 是 | 禄/权/科/忌 |
| `star` | string | 是 | 化星名 |
| `fromIndex` | number | 是 | 源宫索引（生年四化以来因宫为源；宫干飞化以该宫为源） |
| `toIndex` | number | 是 | 化星所落之宫索引 |
| `self` | boolean | 是 | 是否自化（源=目标） |

### 2.7 PatternInfo（格局判定）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 格局 ID，如 `zifu-chaoyuan` |
| `name` | string | 是 | 格局名 |
| `grade` | `upper`/`middle`/`special` | 是 | 等级 |
| `palaces` | string[] | 是 | 涉及宫名 |
| `stars` | string[] | 是 | 涉及星曜 |
| `summary` | string | 是 | 原创娱乐化解读 |

### 2.8 LifeMetrics（人生五维，0–100 整数，娱乐参考）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `career` | number | 事业 |
| `wealth` | number | 财运 |
| `love` | number | 感情 |
| `health` | number | 健康 |
| `social` | number | 人缘 |

### 2.9 DecadalStage（大限推演项）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `order` | number | 是 | 序号，0 为第一大限 |
| `palaceIndex` | number | 是 | 所在本命宫索引 |
| `palaceName` | string | 是 | 所在本命宫名 |
| `ageRange` | [number, number] | 是 | 起止虚岁 |
| `yearRange` | [number, number] | 是 | 起止公历年 |
| `stem` | string | 是 | 大限天干 |
| `branch` | string | 是 | 大限地支 |
| `mutagen` | string[] | 是 | 大限四化星名，禄权科忌顺序 |
| `narrative` | string | 是 | 原创阶段叙事 |
| `theme` | string | 是 | 阶段主题词 |

### 2.10 TimeCorrection（历法校正明细）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `trueSolarApplied` | boolean | 是 | 是否启用真太阳时 |
| `longitudeOffsetMin` | number | 是 | 经度时差（分钟，1 位小数） |
| `equationOfTimeMin` | number | 是 | 均时差（分钟，1 位小数） |
| `dstOffsetMin` | number | 是 | 夏令时回拨（0 或 -60） |
| `correctedClock` | string | 是 | 校正后钟表时间 `HH:mm` |
| `correctedDate` | string | 是 | 校正后钟表日期 `YYYY-MM-DD`（晚子时日分界由引擎 `dayDivide` 另行作用于日柱/时柱，见 `ganzhi`） |
| `timeIndex` | number | 是 | 时辰序号 0–12（0 早子时，12 晚子时） |
| `timeName` | string | 是 | 时辰名 |
| `inDstSpan` | boolean | 是 | 是否处于中国夏令时区间 |
| `notes` | string[] | 是 | 提示文案 |
| `solarYear` | number | 是 | 校正后钟表公历年 |
| `solarMonth` | number | 是 | 校正后钟表公历月 |
| `solarDay` | number | 是 | 校正后钟表公历日 |

### 2.11 Chart（归一化命盘）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 确定性唯一键（§1） |
| `input` | BirthInput | 是 | 输入回显 |
| `correction` | TimeCorrection | 是 | 校正明细 |
| `solarDate` | string | 是 | `YYYY-MM-DD` |
| `lunarDate` | string | 是 | 中文农历，如 `二〇〇〇年七月十七` |
| `ganzhi` | string | 是 | 干支四柱，空格分隔 |
| `timeName` | string | 是 | 时辰名 |
| `timeRange` | string | 是 | 时辰时间段，如 `03:00~05:00` |
| `zodiac` | string | 是 | 生肖 |
| `sign` | string | 是 | 星座 |
| `soulBranch` | string | 是 | 命宫地支 |
| `bodyBranch` | string | 是 | 身宫地支 |
| `soulMaster` | string | 是 | 命主星 |
| `bodyMaster` | string | 是 | 身主星 |
| `fiveElements` | string | 是 | 五行局，如 `木三局` |
| `genderLabel` | string | 是 | 性别中文 |
| `palaces` | PalaceInfo[] | 是 | 十二宫，按 index 0–11 |
| `soulIndex` | number | 是 | 命宫索引 |
| `bodyIndex` | number | 是 | 身宫索引 |
| `natalFlights` | SiHuaFlight[] | 是 | 生年四化飞星（4 条） |
| `patterns` | PatternInfo[] | 是 | 格局列表（可空） |
| `metrics` | LifeMetrics | 是 | 人生五维 |
| `stages` | DecadalStage[] | 是 | 大限推演（12 项） |
| `archetype` | string | 是 | 命宫主星原型标题（星卡用） |
| `verse` | string | 是 | 诗意一句话（星卡用） |
| `createdAt` | number | 是 | 生成时间戳（毫秒） |

### 2.12 City（出生地）与 ChartSummary（历史列表项）

**City**：`id` string（如 `hangzhou`）、`name` string、`province` string、`longitude` number（东经度）。

**ChartSummary**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 命盘 ID |
| `solarDate` | string | 是 | 公历日期 |
| `lunarDate` | string | 是 | 农历中文 |
| `genderLabel` | string | 是 | 性别中文 |
| `soulBranch` | string | 是 | 命宫地支 |
| `archetype` | string | 是 | 原型标题 |
| `nickname` | string | 否 | 署名 |
| `createdAt` | number | 是 | 时间戳（毫秒） |

### 2.13 Interpretation / ApiError / ApiResult

**Interpretation**：`chartId` string（必填）、`palace` string（可选，宫名；缺省为整盘解读）、`text` string（必填，段落以 `\n\n` 分隔）、`source` `local`/`remote`（必填）。

**ApiError**：`code` ApiErrorCode（必填）、`message` string（必填，面向用户的中文提示）、`fields` Record<string, string>（可选，字段级错误，键为 BirthInput 字段名）。

**ApiResult\<T\>**：`ok` boolean（必填）、`data` T（`ok=true` 时必有）、`error` ApiError（`ok=false` 时必有）、`source` `local`/`remote`（必填）。

---

## 3. 接口明细

### 3.1 排盘（创建命盘）

- **用途**：由生辰输入计算完整命盘（含校正、十二宫、四化、格局、五维、大限）。同输入同口径幂等。
- **方法与路径**：`POST /api/v1/charts`
- **鉴权**：无
- **实现状态**：本地已实现；远端预留（回落机制见 §6）
- **请求体**：`BirthInput`（§2.2），示例：

```json
{
  "calendar": "solar",
  "year": 2000,
  "month": 8,
  "day": 16,
  "hour": 4,
  "minute": 30,
  "gender": "female",
  "birthplaceId": "hangzhou",
  "longitude": 120.15,
  "useTrueSolarTime": true,
  "dstAdjust": true,
  "leapPolicy": "split",
  "ziHourPolicy": "forward",
  "yearDivide": "normal",
  "nickname": "示例星旅人"
}
```

- **成功响应**：`ApiResult<Chart>`，HTTP 200。下例为真实引擎输出节选（`palaces` 仅展示 12 宫中的第 1 宫、`stages` 仅展示第 1 项，其余结构完全相同；**完整响应**见 [`examples/chart.json`](./examples/chart.json)）：

```json
{
  "ok": true,
  "source": "local",
  "data": {
    "id": "2000-08-16-2-female-split-forward-normal-1-1",
    "input": { "calendar": "solar", "year": 2000, "month": 8, "day": 16, "hour": 4, "minute": 30, "gender": "female", "birthplaceId": "hangzhou", "longitude": 120.15, "useTrueSolarTime": true, "dstAdjust": true, "leapPolicy": "split", "ziHourPolicy": "forward", "yearDivide": "normal", "nickname": "示例星旅人" },
    "correction": {
      "trueSolarApplied": true,
      "longitudeOffsetMin": 0.6,
      "equationOfTimeMin": -3.7,
      "dstOffsetMin": 0,
      "correctedClock": "04:27",
      "correctedDate": "2000-08-16",
      "timeIndex": 2,
      "timeName": "寅时",
      "inDstSpan": false,
      "notes": ["真太阳时校正：经度差 +0.6 分 + 均时差 -3.7 分。"],
      "solarYear": 2000,
      "solarMonth": 8,
      "solarDay": 16
    },
    "solarDate": "2000-08-16",
    "lunarDate": "二〇〇〇年七月十七",
    "ganzhi": "庚辰 甲申 丙午 庚寅",
    "timeName": "寅时",
    "timeRange": "03:00~05:00",
    "zodiac": "龙",
    "sign": "狮子座",
    "soulBranch": "午",
    "bodyBranch": "戌",
    "soulMaster": "破军",
    "bodyMaster": "文昌",
    "fiveElements": "木三局",
    "genderLabel": "女",
    "palaces": [
      {
        "index": 0,
        "name": "财帛",
        "branch": "寅",
        "stem": "戊",
        "isSoul": false,
        "isBody": false,
        "isOriginal": false,
        "majorStars": [
          { "name": "武曲", "type": "major", "scope": "origin", "brightness": "得", "mutagen": "权" },
          { "name": "天相", "type": "major", "scope": "origin", "brightness": "庙" }
        ],
        "minorStars": [
          { "name": "天马", "type": "tianma", "scope": "origin", "brightness": "" }
        ],
        "adjectiveStars": [
          { "name": "解神", "type": "helper", "scope": "origin", "brightness": "" },
          { "name": "三台", "type": "adjective", "scope": "origin", "brightness": "" },
          { "name": "天寿", "type": "adjective", "scope": "origin", "brightness": "" },
          { "name": "天巫", "type": "adjective", "scope": "origin", "brightness": "" },
          { "name": "天厨", "type": "adjective", "scope": "origin", "brightness": "" },
          { "name": "阴煞", "type": "adjective", "scope": "origin", "brightness": "" },
          { "name": "天哭", "type": "adjective", "scope": "origin", "brightness": "" }
        ],
        "changsheng12": "绝",
        "boshi12": "飞廉",
        "decadal": { "range": [43, 52], "stem": "戊", "branch": "寅" },
        "ages": [9, 21, 33, 45, 57, 69, 81, 93, 105, 117]
      }
    ],
    "soulIndex": 4,
    "bodyIndex": 8,
    "natalFlights": [
      { "mutagen": "禄", "star": "太阳", "fromIndex": 2, "toIndex": 1, "self": false },
      { "mutagen": "权", "star": "武曲", "fromIndex": 2, "toIndex": 0, "self": false },
      { "mutagen": "科", "star": "太阴", "fromIndex": 2, "toIndex": 9, "self": false },
      { "mutagen": "忌", "star": "天同", "fromIndex": 2, "toIndex": 11, "self": false }
    ],
    "patterns": [
      { "id": "zifu-chaoyuan", "name": "紫府朝垣", "grade": "upper", "palaces": ["命宫"], "stars": ["紫微", "天府"], "summary": "紫微天府从三方四正来朝，贵气环绕，易得平台与贵人托举，适合借力成事。" },
      { "id": "fuxiang-chaoyuan", "name": "府相朝垣", "grade": "upper", "palaces": ["命宫"], "stars": ["天府", "天相"], "summary": "天府天相来朝，库印相扶，衣食丰足、贵人提携，是稳健富足之格。" }
    ],
    "metrics": { "career": 70, "wealth": 72, "love": 62, "health": 32, "social": 63 },
    "stages": [
      {
        "order": 0,
        "palaceIndex": 4,
        "palaceName": "命宫",
        "ageRange": [3, 12],
        "yearRange": [2002, 2011],
        "stem": "壬",
        "branch": "午",
        "mutagen": ["天梁", "紫微", "左辅", "武曲"],
        "narrative": "3–12 岁（2002–2011），大限行至命宫，正是懵懂童年。这十年的重心落在「自我 · 天赋 · 主轴」，自我重塑是主课题。天梁化禄带来机会与资源，宜主动把握；紫微化权让你更想主导，行动力上扬；左辅化科添名声与贵人，逢凶化吉；武曲化忌则提醒你在相关事务上多用心、少纠结。认清自己的主轴，比羡慕别人的剧本更重要。",
        "theme": "自我重塑"
      }
    ],
    "archetype": "天生的主角",
    "verse": "紫微端坐北辰中，众星拱之自从容。",
    "createdAt": 1794829405621
  }
}
```

- **字段说明**：见 §2.11（Chart）及其嵌套模型；`palaces` 恒为 12 项、`natalFlights` 恒为 4 项、`stages` 恒为 12 项。
- **错误响应**：HTTP 400/422，`ApiResult.error`，例（真实引擎输出，[`examples/error.json`](./examples/error.json)）：

```json
{
  "ok": false,
  "source": "local",
  "error": {
    "code": "UNSUPPORTED_YEAR",
    "message": "输入校验未通过，请检查标红字段。",
    "fields": { "year": "年份须在 1900–2100 之间" }
  }
}
```

- **限流与缓存**（远端预留）：30 次/分钟/IP；`Cache-Control: no-store`。本地实现无限流。

### 3.2 历史命盘列表

- **用途**：列出已保存命盘摘要，按 `createdAt` 降序。
- **方法与路径**：`GET /api/v1/charts`
- **鉴权**：无
- **实现状态**：本地已实现（localStorage，上限 24 条，见 §7）；远端预留
- **请求参数**：无
- **成功响应**：`ApiResult<ChartSummary[]>`，HTTP 200（[`examples/chart-list.json`](./examples/chart-list.json)）：

```json
{
  "ok": true,
  "source": "local",
  "data": [
    {
      "id": "2000-08-16-2-female-split-forward-normal-1-1",
      "solarDate": "2000-08-16",
      "lunarDate": "二〇〇〇年七月十七",
      "genderLabel": "女",
      "soulBranch": "午",
      "archetype": "天生的主角",
      "nickname": "示例星旅人",
      "createdAt": 1794829405621
    }
  ]
}
```

- **字段说明**：§2.12 ChartSummary。空历史返回 `data: []`（非错误）。
- **错误响应**：仅远端故障类（§5）；本地存储不可用时静默返回 `[]`。
- **限流与缓存**（远端预留）：120 次/分钟/IP；`Cache-Control: no-store`。

### 3.3 按 ID 读取命盘

- **用途**：载入历史命盘完整数据。
- **方法与路径**：`GET /api/v1/charts/{id}`
- **鉴权**：无
- **实现状态**：本地已实现（历史优先命中）；远端预留（本地未命中再询远端）
- **路径参数**：

| 名称 | 类型 | 必填 | 取值范围 | 示例 |
| --- | --- | --- | --- | --- |
| `id` | string | 是 | §1 命盘 ID 格式，需 URL 编码 | `2000-08-16-2-female-split-forward-normal-1-1` |

- **成功响应**：`ApiResult<Chart>`，HTTP 200，结构同 §3.1（完整例 [`examples/chart.json`](./examples/chart.json)）。
- **错误响应**：HTTP 404，`error.code = NOT_FOUND`，`message = "未找到该命盘"`。
- **限流与缓存**（远端预留）：120 次/分钟/IP；ID 确定性 ⇒ 内容不可变，`Cache-Control: public, max-age=31536000, immutable`。

### 3.4 删除历史命盘

- **用途**：从历史中移除一条命盘。
- **方法与路径**：`DELETE /api/v1/charts/{id}`
- **鉴权**：无
- **实现状态**：本地已实现；远端预留（本地删除后同步远端，远端失败不回滚本地）
- **路径参数**：同 §3.3
- **成功响应**：`ApiResult<{ id: string }>`，HTTP 200：

```json
{ "ok": true, "source": "local", "data": { "id": "2000-08-16-2-female-split-forward-normal-1-1" } }
```

- **字段说明**：`data.id` 为被删除命盘 ID。删除不存在的 ID 亦返回成功（幂等）。
- **错误响应**：仅远端故障类；本地恒成功。
- **限流与缓存**（远端预留）：30 次/分钟/IP；`no-store`。

### 3.5 命盘解读

- **用途**：获取整盘或指定宫位的解读文本（当前为本地原创解读；远端 AI 预留）。
- **方法与路径**：`POST /api/v1/charts/{id}/interpretation`
- **鉴权**：无
- **实现状态**：本地已实现；远端预留（失败回落本地）
- **路径参数**：同 §3.3
- **请求体**：

| 名称 | 类型 | 必填 | 取值范围 | 示例 |
| --- | --- | --- | --- | --- |
| `palace` | string | 否 | 十二宫名之一；缺省为整盘解读 | `"夫妻"` |

```json
{ "palace": "夫妻" }
```

- **成功响应**：`ApiResult<Interpretation>`，HTTP 200（整盘例 [`examples/interpretation.json`](./examples/interpretation.json)）：

```json
{
  "ok": true,
  "source": "local",
  "data": {
    "chartId": "2000-08-16-2-female-split-forward-normal-1-1",
    "text": "天生的主角。\n\n「紫府朝垣」紫微天府从三方四正来朝，贵气环绕，易得平台与贵人托举，适合借力成事。\n「府相朝垣」天府天相来朝，库印相扶，衣食丰足、贵人提携，是稳健富足之格。",
    "source": "local"
  }
}
```

- **字段说明**：§2.13 Interpretation；指定宫位时 `data.palace` 回显宫名，`text` 为该宫原创解读（段落 `\n\n` 分隔）。
- **错误响应**：HTTP 404 `NOT_FOUND`（命盘不存在）；宫名非法时本地返回提示文本而非错误（保持体验连续）。
- **限流与缓存**（远端预留）：10 次/分钟/IP（AI 成本保护）；`no-store`。

---

## 4. 本地专属能力（无 HTTP 端点）

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 单星解读 | `interpretStar(chart, starName)` | 纯函数，UI 抽屉直调；返回段落文本 |
| 宫干飞四化 | `palaceFlights(chart, palaceIndex)` | 纯函数，返回 `SiHuaFlight[]`（4 条），驱动飞星动画 |
| 三方四正 | `surroundedIndices(index)` | 纯函数，返回 `[i, (i+4)%12, (i+8)%12, (i+6)%12]` |
| 历法预览/校正 | `computeCorrection(input)`、`solarToLunar(...)` | 纯函数，表单实时预览 |
| 城市表 | `CITIES: City[]` | 静态内置，含经度 |

以上均为浏览器端纯计算，**不产生网络请求**，是"后端缺失核心体验不中断"的根基。

---

## 5. 统一错误码表

| code | HTTP | 触发条件 | 前端表现 |
| --- | --- | --- | --- |
| `INVALID_DATE` | 400 | 公历日期不存在 / 农历日越界 / 历法转换失败 | 字段标红 + 错误框 |
| `INVALID_TIME` | 400 | 小时或分钟越界 | 同上 |
| `INVALID_GENDER` | 400 | 性别非 male/female | 同上 |
| `INVALID_LONGITUDE` | 400 | 经度超出 -180–180 | 同上 |
| `UNSUPPORTED_YEAR` | 422 | 年份超出 1900–2100 | 同上 |
| `LEAP_MONTH_NOT_EXIST` | 422 | 指定农历年无该闰月 | 同上 |
| `COMPUTE_FAILED` | 500 | 引擎内部异常 | 错误框 + 重试引导 |
| `NOT_FOUND` | 404 | 命盘 ID 不存在 | 历史项失效提示 |
| `RATE_LIMITED` | 429 | 远端限流（预留），附 `Retry-After` 头 | 自动回落本地 |
| `BACKEND_UNAVAILABLE` | 503 | 远端不可达/超时（预留） | 自动回落本地 |
| `INTERNAL` | 500 | 远端未分类错误（预留） | 自动回落本地 |

校验类错误的 `error.fields` 键与 BirthInput 字段名严格一致，文案与引擎 `validate()` 输出一致。

---

## 6. 前后端联调与替换 mock

1. **零配置（默认）**：`VITE_API_BASE` 未设置 ⇒ 全部走本地实现，`source` 恒为 `local`，站点纯静态可部署。
2. **接入后端**：构建期注入环境变量，例如
   ```bash
   VITE_API_BASE=https://api.example.com npm run build
   ```
   数据访问层（`src/services/api.ts`）即对 §3 各端点发起请求；**UI 无需任何改动**。
3. **回落规则**：远端请求 8 秒超时（AbortController）；网络错误、非 2xx、`ok=false` 均触发本地回落；`getChart` 本地历史优先；`saveChart`/`removeChart` 本地先落地再异步同步远端。回落对用户透明，仅 `source` 与命盘 meta 区"数据源"徽标变化。
4. **后端实现清单**：按 §3 实现 5 个端点、按 §2 序列化模型、按 §5 返回错误即可通过联调；命盘 ID 必须采用 §1 确定性公式以保证幂等与缓存语义。
5. **契约回归**：`node scripts/gen-examples.mjs` 重新生成 `docs/examples/*.json`；后端响应可与该文件逐字段 diff 作为验收基准。

---

## 7. 本地存储契约（浏览器端）

| 键 | 内容 | 约束 |
| --- | --- | --- |
| `ziwei.orbit.history.v1` | `Array<{ summary: ChartSummary, chart: Chart }>` | 上限 24 条，新记录置首；同 ID 去重覆盖；读写失败静默降级 |

版本后缀 `v1` 与 API 版本对齐；未来结构变更升键名并迁移，不就地破坏。