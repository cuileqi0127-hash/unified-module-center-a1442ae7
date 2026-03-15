# 页面/模块说明文档

## 1. 功能模块总览

| 模块 | 路由前缀 | 默认子路径 | 说明 |
|------|----------|------------|------|
| **AI Toolbox** | `/ai-toolbox` | `/ai-toolbox/app-plaza` | 应用广场、市场洞察、策划方案、文生图/文生视频/复刻视频、爆款匹配等 |
| **LLM Console** | `/llm-console` | `/llm-console/playground` | 对话 Playground、仪表盘、Token、用量、钱包、个人资料 |
| **GEO Insights** | `/geo-insights` | `/geo-insights/dashboard` | 仪表盘、写文章、我的文章、审核历史、竞品、设置 |

---

## 2. AI Toolbox

### 2.1 入口与结构

- **组件**: `src/components/modules/ai-toolbox/AIToolboxModule.tsx`
- **侧栏配置**: `DynamicSidebar` 中 `sidebarConfig['ai-toolbox']`，包含：应用广场、市场洞察、策划方案、素材生成（文生图/文生视频/复刻视频）、工具箱（爆款匹配）等
- **路由**: `/ai-toolbox/:pageId`；`campaign-planner` → 重定向到 `planning-solutions`，`brand-health` → `market-insights`

### 2.2 主要页面与交互

| pageId | 功能说明 | 交互与状态要点 |
|--------|----------|----------------|
| **app-plaza** | 应用广场 | 入口页，展示各子能力入口卡片 |
| **market-insights** | 市场洞察 | 报告类能力，可能涉及报告生成与 iframe 展示（ReportDisplay） |
| **planning-solutions** | 策划方案 | 表单（目标、预算、周期等）+ InlinePicker；记忆库 MemoryButtonWithDialog；提交后报告/任务状态 |
| **text-to-image** | 文生图 | 模型选择（与文生视频一致的 InlinePicker）、提示词、生成结果展示 |
| **text-to-video** | 文生视频 | 同上，模型 + 提示词 + 结果 |
| **reference-to-video** | 复刻视频 | 参考视频/记忆库选素材，与策划方案共用 MemoryButtonWithDialog |
| **tiktok-viral-video-matching** | 爆款匹配 | 抖音爆款相关能力 |

### 2.3 状态管理

- **模块级**: 当前激活的 `pageId` 由 URL 决定，侧栏高亮与路由同步
- **页面级**: 各页内部使用 `useState`、`useEffect`；报告/任务状态可能使用轮询（如 `useReportPolling`）或 WebSocket（若后端提供）
- **共享**: 记忆库选择、Replicate 预填等通过 Context（MemoryProvider、ReplicatePrefillContext）在策划方案与复刻视频等页面间共享

---

## 3. LLM Console

### 3.1 入口与结构

- **组件**: `src/components/modules/llm-console/LLMConsoleModule.tsx`
- **侧栏**: Playground、仪表盘、Token、用量、钱包、个人资料

### 3.2 主要页面

| pageId | 功能说明 |
|--------|----------|
| **playground** | 对话式 Playground，模型选择与对话历史 |
| **dashboard** | 使用概览/统计 |
| **tokens** | Token 管理 |
| **usage** | 用量统计 |
| **wallet** | 钱包 |
| **profile** | 个人资料 |

状态以页面内 state 为主，如需跨页可扩展 Context 或共享 API 层缓存。

---

## 4. GEO Insights

### 4.1 入口与结构

- **组件**: `src/components/modules/geo-insights/GEOInsightsModule.tsx`
- **侧栏**: 仪表盘、写文章/我的文章/审核历史、竞品、设置

### 4.2 主要页面

| pageId | 功能说明 |
|--------|----------|
| **dashboard** | 总览 |
| **write-article** | 写文章 |
| **my-articles** | 我的文章列表 |
| **audit-history** | 审核历史 |
| **competitor** | 竞品分析 |
| **settings** | 设置 |

交互与状态同上，按页面本地状态 + 接口请求即可。

---

## 5. 通用能力

- **记忆库**: `MemoryButtonWithDialog` + `MemoryProvider`，在策划方案、复刻视频等页使用；选中项通过 `selectedIds`、`onToggle` 与父组件同步
- **报告展示**: `ReportDisplay` 通过 `reportUrl` 拉取 HTML，在 iframe 中展示，支持生成中状态文案
- **品类选择**: `CategoryCascader` 用于需要三级品类的表单项（如策划方案）
- **Coming Soon**: `COMING_SOON_ITEMS`（`constants/comingSoon.ts`）与侧栏「即将上线」占位一致，避免无效点击
