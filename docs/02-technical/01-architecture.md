# 技术方案文档

## 1. 架构设计

### 1.1 整体架构

项目为 **单页应用（SPA）**，采用「模块化 + 路由分区」的前端架构：

- **入口**: `main.tsx` → `StrictMode` + `BrowserRouter` + `ModuleProvider` + `App` → `AppRoutes`
- **布局**: 所有业务路由在 `ProtectedRoute` 内，通过 `AppShell` 提供统一外壳（侧栏 + 顶栏 + 主内容区）
- **模块**: 三大业务模块 — **AI Toolbox**、**LLM Console**、**GEO Insights**；每个模块有独立侧栏配置与 `:pageId` 子路由，由 `ModuleContext` 维护当前模块与侧栏折叠态
- **数据流**: 页面级状态以 React 本地 state + Context 为主；接口通过 `services/apiClient` 统一请求，认证与 401 由 `apiInterceptor` 处理

### 1.2 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18 | 函数组件 + Hooks |
| 路由 | React Router v6 | 声明式路由、`Navigate`、`useParams`、`useNavigate` |
| 构建 | Vite | 开发/生产构建、代理、路径别名 `@` → `src` |
| 样式 | Tailwind CSS | 工具类 + 设计变量（`tailwind.config.ts` + `index.css`） |
| UI 基础 | Radix UI | 无障碍组件，封装在 `src/components/ui/` |
| 国际化 | react-i18next | `useTranslation`，文案在 `src/i18n/locales/` |
| 请求 | 原生 fetch 封装 | `apiClient.ts`（apiGet/apiPost 等）+ `apiInterceptor.ts`（cookie 认证、401 弹窗） |
| 类型 | TypeScript | 严格类型、接口与泛型 |

### 1.3 核心依赖关系

- **ModuleContext**：被 `AppShell`、`DynamicSidebar`、各模块路由包装组件使用，用于 `activeModule`、`sidebarCollapsed`、`setActiveModule` 等
- **ProtectedRoute**：依赖 cookie 中的 `auth_token`，未登录时展示登录弹窗，不渲染子路由
- **API**：业务层调用 `apiGet`/`apiPost` 等，统一走 `/api` 前缀，由 Vite 或 Nginx 代理到后端

---

## 2. 技术选型说明

- **Vite**：快速冷启、HMR，适合中大型 SPA
- **Tailwind + CSS 变量**：主题与暗色可集中维护，组件只引用变量
- **Radix UI**：无障碍与键盘导航开箱可用，风格通过 Tailwind 覆盖
- **单层路由 + 模块内 pageId**：避免嵌套过深，侧栏与 URL 一一对应，便于分享与书签

---

## 3. 性能优化方案

### 3.1 已采用

- **路由级懒加载**：可按需对 `AIToolboxModule`、`LLMConsoleModule`、`GEOInsightsModule` 使用 `React.lazy` + `Suspense`，减小首包
- **图片/静态资源**：放在 `src/assets`，由 Vite 处理哈希与缓存
- **接口**：统一走 `apiClient`，可在此层做请求去重、缓存策略（若后续需要）

### 3.2 建议扩展

- **大列表/报表**：虚拟滚动（如 `@tanstack/react-virtual`）或分页，避免一次性渲染大量 DOM
- **大模块**：按 pageId 或功能块进一步拆包，配合 `React.lazy` 按需加载
- **首屏**：关键 CSS 内联、非关键组件延迟加载；可考虑路由级 code splitting 已落地后的体积分析（如 `vite-plugin-visualizer`）
