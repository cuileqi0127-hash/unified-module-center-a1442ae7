# AI Toolbox 需求文档

本文档基于当前 ai-toolbox 模块代码与交互，对功能进行盘点并拆分为可执行需求，供产品、设计与开发对齐使用。

---

## 1. 模块概览

| 路由/入口 ID | 侧栏分组 | 功能名称 | 实现状态 | 说明 |
|-------------|----------|----------|----------|------|
| `app-plaza` | 应用广场 | 应用广场首页 | ✅ 已实现 | 首页入口，品牌营销全链路 + 案例展示 |
| `market-insights` | 市场洞察 | 市场洞察报告（品牌健康度） | ✅ 已实现 | 品牌+品类+竞品 → 洞察报告 |
| `planning-solutions` | 策划方案 | 策划方案 | ✅ 已实现 | 品牌/目标/人群/卖点等 → 策划方案（当前为前端模拟） |
| `tiktok-insights` | — | TikTok 洞察报告 | ✅ 已实现 | 品类+卖点 → 洞察报告 |
| `tiktok-trending-video` / `tiktok-viral-video-matching` | 工具箱 | TikTok 爆款视频匹配 | ✅ 已实现 | 品类+卖点 → 爆款视频列表，支持一键复刻 |
| `text-to-image` | 素材生产-图片 | 文生图 | ✅ 已实现 | 多模型、画布、会话、历史 |
| `text-to-video` | 素材生产-视频 | 文生视频 | ✅ 已实现 | 多模型、画布、会话、历史 |
| `reference-to-video` / `replicate-video` | 素材生产-视频 | 视频复刻 | ✅ 已实现 | 上传参考视频/图 → 生成复刻视频 |
| `ecommerce-assets` | — | 电商素材 | 🔜 即将上线 | 占位页 |
| `reference-to-image` | — | 图生图 | 🔜 即将上线 | 占位页 |
| `trend-analysis` | — | 趋势分析 | 占位 | 占位页 |
| `competitor-monitor` | — | 竞品监测 | 占位 | 占位页 |
| `copywriting-assistant` | — | 文案助手 | 占位 | 占位页 |
| `digital-human` | — | 数字人 | 占位 | 占位页 |

**即将上线列表** 以 `src/constants/comingSoon.ts` 中 `COMING_SOON_ITEMS` 为准，用于侧栏与应用广场的「即将上线」展示。

---

## 2. 功能需求拆分

### 2.1 应用广场（App Plaza）

**路由/ID**：`app-plaza`  
**组件**：`AppPlaza` → `HeroSection`、`FeatureCard`、`ShowcaseCard`、`ShowcaseDetailDialog`、`FeaturePreviews`

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-AP-01 | 首页展示品牌营销全链路入口 | 展示 4 个入口卡片：市场洞察、策划方案、图片生成、视频生成；点击跳转对应功能 |
| R-AP-02 | 展示「AI 营销 Skills」区域 | 含 TikTok 解决方案等入口，当前可仅为展示或占位 |
| R-AP-03 | 案例库按分类展示 | 支持分类：市场洞察、策划方案、图片生成、视频复刻；切换分类仅展示该分类案例 |
| R-AP-04 | 案例分页 | 图片/视频类每页 12 条，其他 16 条；支持上一页/下一页 |
| R-AP-05 | 案例点击行为 | 市场/策划类：有 reportUrl 则新开窗口；图片/视频类：打开案例详情弹窗 |
| R-AP-06 | 案例详情弹窗与一键复刻 | 图片/视频类案例在详情中可「一键复刻」，复刻时写入 ReplicatePrefill 并跳转到对应功能（如视频复刻） |

**依赖**：`ReplicatePrefillContext`、路由 `onNavigate`、`SHOWCASE_CARDS` 数据。

---

### 2.2 市场洞察报告（品牌健康度 / Brand Health）

**路由/ID**：`market-insights`  
**组件**：`BrandHealth`、`MarketInsightComposer`、`ReportDisplay`、`ReportHistorySheet`  
**接口**：`reportApi.submitBrandHealthTask`、`getReportTaskStatus`；历史：`getReportList(reportType: 'brand_health')`；轮询：`useReportPolling`

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-MI-01 | 输入表单 | 必填：品牌名称、品类（级联选择，使用 TikTok 品类树）、至少一个竞品（可多选）；支持中英文品类树切换 |
| R-MI-02 | 提交与异步生成 | 提交后进入「生成中」状态，展示轮询进度；成功后跳转报告视图 |
| R-MI-03 | 报告展示 | 使用 ReportDisplay 通过 reportUrl 拉取 HTML 并以 iframe/srcDoc 展示；支持注入兜底脚本避免 CDN 报错 |
| R-MI-04 | 报告操作 | 支持「返回」回到表单、「下载报告」为 HTML 文件、「复制到记忆」（可先提示即将上线） |
| R-MI-05 | 历史记录 | 侧边「历史记录」打开 Sheet，调用 getReportList 分页展示；点击某条可加载该任务报告（通过 taskId 取 reportUrl） |
| R-MI-06 | 错误与重试 | 轮询失败或接口错误时 toaster 提示，并允许用户返回表单重新提交 |

**数据**：品类树来自 `@/data/tiktok-categories`（categoryTreeZh / categoryTreeEn）。

---

### 2.3 策划方案（Campaign Planner）

**路由/ID**：`planning-solutions`  
**组件**：`CampaignPlanner`、`CampaignPlannerComposer`、`CampaignPlannerReport`；历史使用 Sheet + localStorage

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-CP-01 | 策划参数输入 | 品牌名、营销目标、目标人群（多标签）、卖点（多标签）、预算档位、渠道、周期等；支持从「记忆」选择内容预填 |
| R-CP-02 | 案例参考 | 作曲区内可展示策划类 Showcase 案例，支持选择案例预填或参考 |
| R-CP-03 | 提交与报告 | 提交后进入 loading，约 2s 后展示策划方案报告（当前为前端模拟，无后端生成） |
| R-CP-04 | 报告内容 | 报告页展示策略摘要、渠道分配、KPI 雷达、周计划等图表与文案；支持「返回」重新编辑 |
| R-CP-05 | 复制到记忆 | 报告页提供「复制到记忆」，将方案以 Markdown 写入 Memory 并可打开记忆抽屉 |
| R-CP-06 | 历史记录 | 历史列表存于 localStorage（campaign-planner-history），支持打开 Sheet、按条恢复、删除单条，最多保留 20 条 |

**说明**：当前报告生成为前端模拟；若后续接入真实 API，需增加「提交任务 → 轮询 → 展示结果」的流程需求。

---

### 2.4 TikTok 洞察报告（TikTok Insights）

**路由/ID**：`tiktok-insights`（侧栏未单独列出，可由应用广场或路由直达）  
**组件**：`TikTokInsights`、`CategoryCascader`、`ReportDisplay`、`ReportHistorySheet`  
**接口**：`reportApi.submitTiktokInsightTask`、轮询同上；历史：`getReportList(reportType: 'tiktok_insight')`

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-TI-01 | 输入表单 | 必填：三级品类（级联）、至少一个卖点（多标签输入）；品类树中英文切换 |
| R-TI-02 | 提交与报告 | 提交后轮询任务状态，成功后展示报告 HTML（同 ReportDisplay） |
| R-TI-03 | 历史与返回 | 支持历史记录 Sheet、返回表单、错误提示 |

---

### 2.5 TikTok 爆款视频匹配（TikTok Trending Video）

**路由/ID**：`tiktok-trending-video`、`tiktok-viral-video-matching`（同一页面）  
**组件**：`TikTokTrendingVideo`、`CategoryCascader`、`TiktokTrendingVideoHistorySheet`、`MediaViewer`  
**接口**：`tiktokInsightApi.submitTiktokInsightJob`、`pollTiktokInsightJobStatus`、`getTiktokInsightJobResult`；历史：`getTiktokInsightJobList`

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-TTV-01 | 输入表单 | 三级品类 + 多个卖点（与 TikTok 洞察一致）；中英文品类树 |
| R-TTV-02 | 提交与轮询 | 提交后轮询 job 状态，完成后拉取 result.videos 列表 |
| R-TTV-03 | 结果展示 | 瀑布流卡片：封面/视频、标题、点赞/播放/转化等数据、卖点命中率、分析标签；支持 hover 播放/静音、原链接跳转 |
| R-TTV-04 | 一键复刻 | 卡片提供「一键复刻」，将视频信息写入 sessionStorage 并跳转视频复刻页，复刻页可预填参考视频 |
| R-TTV-05 | 历史记录 | 使用 tiktok-insight job 列表接口，Sheet 内分页展示，点击某条可恢复该 job 的结果视图（需带 jobId 拉取 result） |
| R-TTV-06 | 媒体查看器 | 支持多图/多视频在 MediaViewer 中切换查看 |

---

### 2.6 文生图（Text-to-Image）

**路由/ID**：`text-to-image`  
**组件**：`TextToImage`、`UniversalCanvas`、`ImageCapsule`、`GenerationChatPanel`、`useTextToImage`、`textToImageConfig`  
**接口**：`generationSessionApi`（会话/任务）、`imageGenerationApi`（模型/尺寸等）、`fileUploadApi`、`toolsDownloadApi`

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-T2I-01 | 画布与图层 | 支持无限画布，图层可拖拽、缩放、选中、删除、复制；支持图片/视频/占位符图层 |
| R-T2I-02 | 提示词与模型 | 输入提示词；选择模型（如 Nano Banana 2 等）、比例、质量、风格、张数（依模型） |
| R-T2I-03 | 参考图 | 支持上传参考图（数量依模型），与提示词一起参与生成 |
| R-T2I-04 | 会话与任务 | 基于 generationSessionApi 的会话与任务；提交后任务入队、轮询状态、完成后结果落画布 |
| R-T2I-05 | 对话与优化 | 支持对话式优化提示词（GenerationChatPanel），可展示思考/设计过程 |
| R-T2I-06 | 历史会话 | 支持会话列表、恢复某会话（画布与任务状态）、历史记录展示 |
| R-T2I-07 | 导出与下载 | 支持单图/多图下载；与 toolsDownloadApi 对齐 |
| R-T2I-08 | 工作模式 | 支持「一起生图」等模式切换（依产品配置） |

**配置**：模型与尺寸/质量/风格等来自 `textToImageConfig` 与 `imageGenerationApi`。

---

### 2.7 文生视频（Text-to-Video）

**路由/ID**：`text-to-video`  
**组件**：`TextToVideo`、`UniversalCanvas`、`ImageCapsule`、`GenerationChatPanel`、`useTextToVideo`、`textToVideoConfig`  
**接口**：`generationSessionApi`、`videoGenerationApi`、`fileUploadApi`、`toolsDownloadApi`

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-T2V-01 | 画布与图层 | 与文生图类似，支持视频/图片/占位符图层，拖拽、缩放、选中、删除、复制 |
| R-T2V-02 | 提示词与模型 | 提示词输入；选择视频模型、时长、比例等（依 textToVideoConfig） |
| R-T2V-03 | 参考图/视频 | 支持参考图或首帧图参与生成（依模型能力） |
| R-T2V-04 | 会话与任务 | 会话与任务创建、轮询、完成后视频落画布并可播放 |
| R-T2V-05 | 对话与历史 | 对话式优化、会话历史与恢复、导出下载（同文生图思路） |
| R-T2V-06 | 增强开关 | 部分模型支持「增强」等开关，需在 UI 与请求参数中体现 |

---

### 2.8 视频复刻（Reference-to-Video / Replicate Video）

**路由/ID**：`reference-to-video`、`replicate-video`  
**组件**：`VideoReplication`；可选 `MemoryButtonWithDialog`  
**接口**：`videoReplicationApi`（上传视频/图片、创建任务、轮询）、VOD 上传、AIGC 创建与轮询

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-VR-01 | 参考视频上传 | 支持拖拽或选择视频文件上传；限制格式与大小（如 50MB）；支持从「爆款视频」跳转时通过 sessionStorage 预填视频 URL |
| R-VR-02 | 视频解析（可选） | 若产品有「解析中」步骤，展示解析状态后再进入下一步 |
| R-VR-03 | 卖点与参考图 | 输入卖点文案；可选上传参考图（用于形象/风格） |
| R-VR-04 | 生成参数 | 支持动态程度、分辨率（720p/1080p/2k）、比例（16:9、9:16）等（依接口能力） |
| R-VR-05 | 记忆选择 | 可选从记忆中选择内容参与复刻（MemoryButtonWithDialog） |
| R-VR-06 | 提交与轮询 | 提交后进入生成中状态，轮询任务直至完成或失败 |
| R-VR-07 | 结果展示与下载 | 展示生成视频、支持播放与下载；错误时提示并允许重试 |

**说明**：接口文档见 `docs/api-video-replication.md`；上传与 AIGC 基路径通过 Nginx/ Vite 代理配置。

---

### 2.9 占位与「即将上线」

**占位页**（`PlaceholderPage`）：`trend-analysis`、`competitor-monitor`、`copywriting-assistant`、`digital-human`、`ecommerce-assets`、`reference-to-image`。  
**即将上线**：以 `comingSoon.ts` 为准，当前包含 `ecommerce-assets`、`reference-to-image`。侧栏与应用广场中对这些 ID 展示「即将上线」或禁用态。

| 需求 ID | 需求描述 | 验收要点 |
|---------|----------|----------|
| R-PH-01 | 占位页统一体验 | 进入未实现功能时展示统一占位文案（标题+描述），文案来自 i18n |
| R-PH-02 | 即将上线一致性 | 侧栏与应用广场中，COMING_SOON_ITEMS 内的 ID 均展示为「即将上线」或不可点击态 |

---

## 3. 公共能力与约束

### 3.1 国际化（i18n）

- 所有用户可见文案需支持中英文（`zh`/`en`），通过 `react-i18next` 的 `t()` 或 `labelKey` 引用。
- 品类树、报告类型、侧栏标题等均需在 `src/i18n/locales` 中维护。

### 3.2 记忆（Memory）

- 市场洞察、策划方案、视频复刻等支持「复制到记忆」或「从记忆选择」时，需使用 `MemoryContext` 与 `MemoryButtonWithDialog`，与统一记忆模块对接。

### 3.3 报告类通用组件

- **ReportDisplay**：通过 reportUrl 拉取 HTML，srcDoc 展示，注入兜底脚本。
- **ReportHistorySheet**：按 reportType 拉取 getReportList，分页、状态展示、点击加载报告。
- **useReportPolling**：统一轮询 report 任务状态直至完成或失败。

### 3.4 品类与数据

- TikTok 相关功能统一使用 `@/data/tiktok-categories` 的 categoryTreeZh / categoryTreeEn，与后端约定一致。

### 3.5 错误与登录

- 接口 401 等需统一处理（如 `redirectToLogin`）；业务错误通过 toast 提示，并允许用户返回或重试。

---

## 4. 需求优先级建议（参考）

| 优先级 | 需求范围 | 说明 |
|--------|----------|------|
| P0 | 已上线功能的稳定性与接口对接 | 市场洞察、TikTok 洞察/爆款视频、文生图、文生视频、视频复刻的接口与错误处理 |
| P1 | 策划方案后端对接 | 若策划方案接入真实生成 API，需补充提交/轮询/结果展示与历史持久化 |
| P1 | 应用广场与案例数据 | 案例数据可 CMS 化或接口化，复刻预填与跳转逻辑保持 |
| P2 | 即将上线功能 | 电商素材、图生图从占位变为真实页面时的需求细化 |
| P3 | 占位功能 | 趋势分析、竞品监测、文案助手、数字人等排期后的需求文档补充 |

---

## 5. 文档维护

- 本文档基于当前代码与交互整理，若新增路由、侧栏项或接口，请同步更新「模块概览」与对应小节。
- 具体接口契约以 `reportApi`、`tiktokInsightApi`、`videoReplicationApi`、`generationSessionApi`、`imageGenerationApi`、`videoGenerationApi` 及项目内 API 文档为准。
