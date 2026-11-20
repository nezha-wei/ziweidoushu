# 紫微斗数 ZIWEI DOUSHU

> 把一千年的星象学，转成你指尖的罗盘。
> 2026 Qoder 高校创造力大赛 · **LifeHack（生活娱乐）赛道** 原创前端作品。

紫微斗数是一个**纯静态、零后端依赖**的可交互紫微斗数命盘站点，采用「纸墨编辑排版 × 奶金国风工笔插画」美术体系：首页为编辑刊头与六张原创工笔海报组成的入口竖廊；输入出生年月日时与出生地，浏览器内即时排出十二宫命盘；命盘不是表格，而是一面**可拖拽旋转的星象罗盘**——四化飞星沿星盘流动、三方四正连线、宫位聚焦景深；点击宫位与星曜滑出解读抽屉；十二段大限组成可播放的**人生时间轴推演**；最后一键生成可下载分享的**人格化星卡**（原型 + 诗句 + 五维雷达 + 朱砂印章）。

全部排盘与解读计算在浏览器本地完成，**不上传任何生辰数据**；后端以可插拔方式预留（见 [`docs/api.md`](docs/api.md)），未接后端时体验完整不中断。

---

## 一、核心体验与差异化玩法

| 模块 | 内容 |
| --- | --- |
| 起盘 | 公历/农历、性别、年月日时分、出生地城市或手动经度；**真太阳时**（经度差 + 均时差）、**夏令时**（中国 1986–1991）、**闰月口径**（十五分界/整月）、**晚子时口径**（来日/当日）、**年分界**（正月初一/立春）全部可选；实时历法预览与校正明细；字段级错误标红 + 统一错误码 |
| 星象罗盘 | SVG 罗盘：72 刻度外环、十二宫扇区、主星/辅星/杂耀分层、四化飞星弧线动画、三方四正多边形、宫位聚焦景深；拖拽旋转 + 自动旋转；**12 件常驻控制台工具**（视图切换、5 开关、4 滑杆、重置）实时生效 |
| 传统方盘 | 一键切换经典 4×4 方盘视图（共享细线格 + 中央奶金摘要 tile + 生年四化印章），与罗盘共享同一状态 |
| 解读抽屉 | 宫位解读（原创娱乐化文案）、宫内星曜跳转、宫干飞四化清单、三方四正跳转；单星解读（原型意象 + 亮度 + 四化）；ESC/遮罩/按钮关闭 |
| 格局判定 | 20 条经典格局规则（紫府朝垣、府相朝垣、日月并明、机月同梁等），上格/中格/特殊分级 |
| 大限推演 | 12 段大限时间轴：播放/上一段/下一段、进度与人生进度条、阶段叙事与四化 chips、"在罗盘中定位此宫"联动抽屉 |
| 星卡分享 | 本机 Canvas 绘制 1080×1440 星卡：奶金纸底渐变、确定性金墨浮尘、罗盘环、原型标题、诗句、五维雷达、命盘摘要、朱砂印章；署名即时重绘；PNG 下载 + 判词复制 |
| 历史命盘 | localStorage 保存最近 24 盘，一键载入/删除 |
| 氛围 | 纸金浮尘背景、全屏白菜单与左侧竖轨导航、分级入场序列、滚动揭示、合成音效（绑定可见事件，**默认开启**，顶部导航一键静音）、墨金自定义滚动条、`prefers-reduced-motion` 降级 |

主流程：**输入 → 排盘 → 罗盘/抽屉交互探索 → 大限推演 → 星卡导出分享**，桌面与移动端均已实测走通。

## 二、目录结构

```
ziweidoushu/
├─ index.html               # 单页入口
├─ vite.config.ts           # base './' + vendor 分包，纯静态产物
├─ docs/
│  ├─ api.md                # 前后端接口契约唯一规范（/api/v1）
│  └─ examples/             # 由真实引擎生成的响应示例（npm run docs:examples）
├─ scripts/
│  ├─ smoke.mjs             # 引擎级 smoke 测试（npm run test:engine）
│  ├─ uitest.mjs            # 双视口 E2E 实测（npm run test:ui，需本机 Edge）
│  └─ gen-examples.mjs      # 重新生成 docs/examples/*.json
├─ public/posters/          # 六张原创奶金国风工笔海报插画（首页入口竖廊）
├─ src/
│  ├─ main.ts               # 启动入口
│  ├─ engine/               # 排盘引擎（iztro 归一化）+ 历法校正 + 四化 + 格局 + 五维 + 解读
│  │  └─ types.ts           # ★ 共享领域模型唯一来源（与 docs/api.md 一一对应）
│  ├─ content/              # 星曜/宫位/古籍原创解读库、城市经度表
│  ├─ services/             # store（单一状态源）/ api（可插拔数据访问层）/ sound（合成音效）
│  ├─ ui/                   # 组件：nav hero form compass board controls drawer patterns timeline share about starfield
│  ├─ styles/               # tokens / base / layout / components / animations 五层设计系统
│  └─ types/                # 第三方库声明补充
└─ shots/                   # E2E 实测截图（gitignore）
```

## 三、本地运行

环境：**Node.js ≥ 16**（开发验证于 Node 16.20.2 / npm 8.19.4）。

```bash
npm install        # 依赖仅 iztro + lunar-javascript（运行时），vite + typescript（构建）
npm run dev        # 开发服务器 http://localhost:5173
npm run typecheck  # TS 全量检查
npm run test:engine  # 引擎不变量 smoke（17 项断言）
npm run build      # 产出纯静态 dist/
npm run preview    # 本地预览构建产物 http://localhost:4173
npm run test:ui    # 双视口 E2E（1440×900 / 390×844，62 项断言；需本机安装 Edge，先 build + preview）
node scripts/verify-flow.mjs  # 主流程人工式实测（33 项断言：海报入口→起盘→拖拽→抽屉→方盘→菜单→播放→PNG 落盘）
```

`dist/` 为完全自包含静态产物（相对路径 `base: './'`），可直接托管于任意静态服务器，无需 Node 常驻进程。

## 四、打包分享给别人（不部署）

- `npm run pack:share`：生成 `release/紫微斗数-离线体验包/`——单 chunk 构建后将全部 JS/CSS 内联进一个 index.html（file:// 下内联 module 脚本不触发跨域 fetch），附六张海报、LICENSE 与使用说明。**对方解压后双击 index.html 即可玩全部功能**：无需联网、无需装软件、无需起服务。
- `npm run test:offline`：离线包 file:// 双视口实测（26 项断言：起盘/拖拽/抽屉/三方四正/方盘/播放/星卡 PNG 落盘/音效/溢出/控制台/资源零失败）。
- 发送方式：把 `release/紫微斗数-离线体验包/` 目录压缩为 zip 发给对方（约 6 MB）；给开发者另发源码包（src/public/scripts/docs/配置文件/README/LICENSE，不含 node_modules 与构建产物），对方 `npm install && npm run dev` 即可二次开发。
- 注意：常规 `dist/` 为外链 module 脚本，file:// 双击会被浏览器 CORS 拦截；**双击场景请用离线体验包**，托管场景用 `dist/`。

## 五、发布到 Qoder Sites（免费静态托管）

Qoder Sites 个人 Free 版支持静态网页部署，本站产物与其完全兼容。

**方式 A · Qoder IDE（推荐）**
1. `npm run build` 生成 `dist/`；
2. 在 Qoder IDE 中打开本项目，左侧栏选择 **站点**（或在会话中 `@sites`），向 Agent 表达意图：「把本项目的 `dist` 目录发布成静态站点」；
3. Agent 经 `sites-building` / `sites-hosting` 技能打包并准备部署，本地预览确认后执行发布（写操作会先复述影响并征得确认）；
4. 在站点设置中将可见范围切换为 **公开（任何人都可访问）**，获得 `*.qoder.website` 分享链接。

**方式 B · Qoder CLI**
1. 安装并登录 Qoder CLI（≥ v1.1.54）；
2. 交互式会话中输入 `/sites` 打开面板，或直接说「帮我把 dist 发布成站点」，由内置 Sites Skills 驱动构建与发布流水线；
3. 面板中完成 **发布** 与 **共享 → 公开**；自动化场景可用 `qoder sites list_sites` 等只读子命令查询状态（操作入参以 `qoder sites describe <operation>` 的 JSON Schema 为准）。

发布后无需任何环境变量：默认即纯本地计算模式。若未来接入自建后端，构建期注入 `VITE_API_BASE` 即可（见 `docs/api.md` §6）。

## 六、许可与数据来源声明

- **本项目代码与原创解读文案**：MIT License（见 [`LICENSE`](LICENSE)）。解读、格局判词、大限叙事、星卡诗句均为本项目原创娱乐化表述。
- **排盘算法内核**：[iztro](https://github.com/SylarLong/iztro)（MIT License），浏览器端安星/排盘/大限计算；本项目对其输出做归一化封装，未复制其界面或断语库。
- **历法转换**：[lunar-javascript](https://github.com/6tail/lunar-javascript)（MIT License），公农历互转、闰月与节气支持。
- **知识参考**：倪海厦《天纪》紫微斗数体系的公开讲义框架（宫位/星曜/四化/格局知识结构），参考开源仓库 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) 的 MIT 部分作为算法与知识地基；**未使用**其 CC BY-NC-SA 内容、未开源断语库、AI prompt 与后端接口，界面与产品形态为完全原创。
- **古籍引文**：《紫微斗数全书》《骨髓赋》《太微赋》等公有领域古籍原文短句（首页轮播与关于页），属公有领域文本。
- **真太阳时均时差**：采用公开天文近似公式（NOAA 太阳位置近似式）自行实现。
- **字体**：系统字体栈（ serif 中文衬线 + 无衬线正文），无外部字体资源。
- **音效**：Web Audio 实时合成，无外部音频素材。

### 免责声明

紫微斗数属传统民俗文化，本站全部内容仅供**文化体验与娱乐参考**，不构成任何决策建议；五维指标为确定性趣味算法，同一命盘恒得同一结果，与真实人生无关。生辰数据默认仅存于你的浏览器本地。