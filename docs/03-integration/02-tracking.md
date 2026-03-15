# 埋点文档

## 1. 数据埋点需求概述

本文档约定前端行为埋点的**事件定义、命名与上报规范**，便于与数据分析、BI 或第三方统计平台对接。当前仓库内**尚未实现统一埋点 SDK 或工具函数**，以下作为需求与规范说明，落地时需在项目中实现对应封装并在各模块调用。

---

## 2. 事件定义建议

### 2.1 命名规范

- **格式**: `模块_页面_动作` 或 `模块_动作`，小写 + 下划线，如 `ai_toolbox_plan_submit`、`sidebar_click`
- **模块前缀**: `ai_toolbox`、`llm_console`、`geo_insights`、`global`
- **动作**: `view`（曝光）、`click`、`submit`、`change`、`error`、`success` 等

### 2.2 建议覆盖的页面/行为

| 分类 | 示例事件 | 说明 |
|------|----------|------|
| 页面浏览 | `ai_toolbox_planning_solutions_view` | 进入策划方案页 |
| 侧栏导航 | `sidebar_click`，params: `{ module, page_id }` | 点击侧栏菜单 |
| 表单提交 | `ai_toolbox_plan_submit`，params: `{ goal?, budget? }` | 策划方案提交（可带非敏感参数） |
| 能力使用 | `ai_toolbox_text_to_image_submit`、`ai_toolbox_video_replication_submit` | 文生图/复刻视频等提交 |
| 报告/结果 | `report_view`、`report_download`（若有） | 报告打开、下载 |
| 记忆库 | `memory_select`、`memory_open` | 打开记忆库、选择条数等 |
| 错误 | `api_error`，params: `{ endpoint, code, msg }` | 接口或业务错误（脱敏） |

具体事件名与参数以产品/数据需求为准，可在本文档中维护一张「事件清单」表。

---

## 3. 上报规范

### 3.1 公共参数（建议每条上报都带）

- `timestamp`: 客户端时间戳
- `url` / `path`: 当前路由
- `module`: 当前模块（ai-toolbox / llm-console / geo-insights）
- `user_id` 或匿名 id：由登录态或本地生成，与后端约定是否必传

### 3.2 上报方式

- **方式一**: 前端调用自有后端埋点接口（如 `POST /api/track`），后端再转发到数仓或第三方
- **方式二**: 前端直接上报到第三方（如 Google Analytics、神策、GrowingIO），通过其 SDK 或 HTTP 接口
- **建议**: 统一封装为 `track(eventName, params?)`，内部区分环境（开发可打 log，生产才上报），避免业务层散落 if/else

### 3.3 注意点

- 不上报敏感信息（密码、token、完整手机号等）
- 频率过高的事件（如输入框逐字）可做节流或抽样
- 需符合隐私政策与合规要求（如 GDPR、个保法）

---

## 4. 后续实现建议

- 在 `src/utils/tracking.ts` 或 `src/services/tracking.ts` 中实现 `track(event, params)`，并在需要处调用
- 在文档或代码注释中维护「事件清单」与「公共参数」说明，便于前后端与数据对齐
