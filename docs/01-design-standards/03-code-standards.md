# 代码规范文档

## 1. 命名约定

### 1.1 文件与目录

- **组件文件**: PascalCase，如 `CampaignPlannerComposer.tsx`、`ReportDisplay.tsx`
- **Hook 文件**: `use` + 驼峰，如 `useReportPolling.ts`、`use-mobile.tsx`
- **工具/常量/类型**: 小写或 camelCase，如 `utils.ts`、`comingSoon.ts`、`apiClient.ts`
- **目录**: 小写 + 连字符或小写单词，如 `ai-toolbox`、`app-plaza`、`modules`

### 1.2 组件与函数

- **React 组件**: PascalCase
- **函数、变量**: camelCase
- **常量**: 全大写下划线（如 `API_BASE_URL`）或 camelCase（如 `sidebarConfig`）
- **类型/接口**: PascalCase，接口可用 `I` 前缀（可选），如 `CampaignPayload`、`ApiResponse<T>`

### 1.3 路由与模块 ID

- **路由 path**: 小写连字符，如 `/ai-toolbox`、`/planning-solutions`
- **侧栏/模块内 pageId**: 小写连字符，与路由一致，如 `app-plaza`、`market-insights`、`text-to-image`

---

## 2. 目录结构

```
src/
├── assets/           # 静态资源
├── components/
│   ├── layout/      # 布局：AppShell, DynamicSidebar, TopNav, ProtectedRoute
│   ├── modules/     # 按业务模块：ai-toolbox, llm-console, geo-insights, memory
│   └── ui/          # 通用 UI 组件（Radix + Tailwind）
├── constants/       # 全局常量，如 comingSoon
├── contexts/       # React Context：ModuleContext, OAuthContext, MemoryContext, ReplicatePrefillContext
├── data/            # 静态数据，如 tiktok-categories
├── hooks/           # 自定义 Hooks
├── i18n/            # 国际化配置与文案
├── lib/             # 工具库，如 cn (utils)
├── pages/           # 页面入口，如 Index, NotFound
├── routes/          # 路由配置 index.tsx
├── services/        # API 与请求封装
├── types/           # 全局类型
├── utils/           # 工具函数，如 cookies
├── index.css        # 全局样式与设计变量
├── App.tsx
└── main.tsx
```

### 2.1 模块内建议结构

- **ai-toolbox**: 按功能分文件（AIToolboxModule、CampaignPlanner、TextToImage、ReportDisplay 等），子功能可放在同名目录（如 `app-plaza/`）
- **services**: 按领域分文件（reportApi、imageGenerationApi、videoReplicationApi 等），通用请求放在 `apiClient.ts`、`apiInterceptor.ts`

---

## 3. 编码标准

### 3.1 TypeScript

- 优先为 props、state、API 响应定义类型或接口
- 使用 `interface` 或 `type` 导出给多文件复用
- 避免 `any`，必要时使用 `unknown` 或泛型

### 3.2 React

- 函数组件 + Hooks，类组件仅在有明确需求时使用
- 状态提升与模块内状态：优先 `useState`；跨模块/跨路由用 Context 或 URL
- 副作用请求与订阅放在 `useEffect`，注意依赖与清理（如 abort、removeEventListener）

### 3.3 样式

- 使用 Tailwind 工具类，复杂组合用 `cn()` 合并
- 设计变量通过 Tailwind 的 theme 引用（如 `hsl(var(--accent))`），不在业务中写死色值
- 组件库样式修改集中在 `src/components/ui/*`，业务只传 `className` 做微调

### 3.4 国际化

- 文案通过 `useTranslation()` 的 `t('key')` 获取，key 定义在 `src/i18n/locales/zh.json`、`en.json`
- 新功能需同时补充中英文 key，避免硬编码中文

### 3.5 导入顺序建议

1. React / 第三方库
2. 项目别名路径（`@/components/...`、`@/services/...`）
3. 相对路径
4. 类型（可 `import type`）

---

## 4. 与规范相关的配置文件

- **ESLint**: 项目根目录配置，`npm run lint` 执行
- **TypeScript**: `tsconfig.json`，路径别名 `@` → `src`
- **Tailwind**: `tailwind.config.ts`，content 覆盖 `src/**/*.{ts,tsx}`
