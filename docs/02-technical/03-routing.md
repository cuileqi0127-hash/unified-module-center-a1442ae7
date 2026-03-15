# 路由配置文档

## 1. 页面路由一览

| 路径 | 说明 |
|------|------|
| `/` | 重定向到 `/ai-toolbox/app-plaza` |
| `/ai-toolbox` | 重定向到 `/ai-toolbox/app-plaza` |
| `/ai-toolbox/:pageId` | AI Toolbox 各子页，如 app-plaza、planning-solutions、text-to-image |
| `/llm-console` | 重定向到 `/llm-console/playground` |
| `/llm-console/:pageId` | LLM Console 各子页 |
| `/geo-insights` | 重定向到 `/geo-insights/dashboard` |
| `/geo-insights/:pageId` | GEO Insights 各子页 |

**说明**: 未配置的 path（如 `/other`）在现有配置下会落空，可后续增加 404 路由（如 `element={<NotFound />}`）。

---

## 2. 权限控制

- **ProtectedRoute**：包裹所有业务路由；内部读取 cookie 中的 `auth_token`，若无则**不渲染 children**，并展示登录相关 UI（如登录弹窗），由 `apiInterceptor` 在 401 时也可触发同一逻辑
- **无角色路由区分**：当前未按角色隐藏或重定向某条路由，权限可后续在 ProtectedRoute 或路由守卫中按角色/权限扩展

---

## 3. 导航结构

### 3.1 侧栏与路由对应关系

侧栏配置在 `src/components/layout/DynamicSidebar.tsx` 的 `sidebarConfig`，按模块 key 为 `ai-toolbox`、`llm-console`、`geo-insights`。

- **ai-toolbox**: app-plaza, market-insights, planning-solutions, text-to-image, text-to-video, reference-to-video, tiktok-viral-video-matching（含分组：素材生成、工具箱）
- **llm-console**: playground, dashboard, tokens, usage, wallet, profile
- **geo-insights**: dashboard, write-article, my-articles, audit-history, competitor, settings

点击侧栏项会执行 `navigate(getRoutePath(itemId))`，即 `/模块前缀/:pageId`，与上面路由表一致。

### 3.2 重定向（AI Toolbox）

在 `AIToolboxRoute` 内通过 `PAGE_ID_REDIRECTS` 做 302 替换，保证旧链接仍可用：

- `campaign-planner` → `planning-solutions`
- `brand-health` → `market-insights`

### 3.3 默认页

- 根路径 `/`、`/ai-toolbox`、`/llm-console`、`/geo-insights` 均使用 `<Navigate to="..." replace />` 跳转到各自默认子页，无独立「空白」页。

---

## 4. 实现要点（供开发参考）

- 路由定义：`src/routes/index.tsx` 的 `AppRoutes`
- 模块上下文：`ModuleProvider` 包裹全部 `Routes`，各模块路由包装组件（如 `AIToolboxRoute`）在 `useEffect` 中调用 `setActiveModule('ai-toolbox')` 等，以驱动侧栏与顶栏当前模块
- 子路由参数：`const { pageId } = useParams<{ pageId?: string }>();`，默认值在组件内写死（如 `pageId = 'app-plaza'`）
