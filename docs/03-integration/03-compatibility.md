# 兼容性文档

## 1. 浏览器支持

### 1.1 目标环境

- **现代浏览器**: 支持 ES2020+、Fetch API、Promise、async/await、CSS 变量、Flexbox/Grid
- **建议最低版本**（以 Can I Use 等为准，具体以实际测试为准）:
  - Chrome / Edge: 最近两个主版本
  - Safari: 最近两个主版本（含 iOS Safari）
  - Firefox: 最近两个主版本

### 1.2 不支持的浏览器

- IE 11 及以下（未做 polyfill，Vite/React 默认也不支持）
- 若需支持旧版 Android WebView，需单独做兼容与测试

### 1.3 技术依赖的兼容性

- **React 18**: 依赖现代引擎
- **Tailwind**: 生成 CSS 使用变量与现代选择器，无 IE 兼容模式
- **Radix UI**: 依赖现代 DOM 与事件模型
- **Vite**: 构建产物为 ES module，需支持 `<script type="module">` 的浏览器

---

## 2. 设备适配

### 2.1 响应式

- 布局使用 Tailwind 断点（`sm`、`md`、`lg`、`xl` 等），侧栏支持折叠，主内容区随宽度自适应
- 移动端：若未单独做移动布局，建议以「桌面优先」说明；后续可增加断点下侧栏改为抽屉、表格横向滚动等

### 2.2 触控与交互

- 点击区域建议不小于 44×44 px，以兼顾触屏
- Radix 组件 generally 支持键盘与焦点，可在此基础上做焦点顺序与 a11y 优化

### 2.3 分辨率与缩放

- 使用 rem/em 与相对单位，避免固定 px 导致大字号或高 DPI 下错位
- 若存在图表或 canvas，需考虑高 DPR 下的清晰度（如 2x 图或 SVG）

---

## 3. 降级方案

### 3.1 JavaScript 不可用

- 当前为 SPA，强依赖 JS；无 JS 时仅能展示静态壳或提示「请启用 JavaScript」
- 若有 SEO 或首屏必须可读需求，需考虑 SSR（如 Remix、Next.js）或预渲染

### 3.2 接口不可用

- 请求超时或网络错误时，由 apiClient 抛出错误，建议在页面或全局错误边界中提示「网络异常，请稍后重试」及重试入口
- 401/403 等已统一跳转登录，无需业务层额外降级

### 3.3 部分能力不可用

- **本地存储**: 若禁用 localStorage/cookie，登录态可能无法持久化，可提示「请允许 Cookie/本地存储」
- **第三方能力**: 如 Replicate、OAuth 等依赖外部服务，失败时展示明确错误信息与重试或联系支持

### 3.4 暗色模式

- 通过 `.dark` 类切换，依赖 CSS 变量；不支持的系统或旧浏览器仍可正常使用亮色主题

---

## 4. 测试建议

- 在 Chrome、Safari、Firefox、Edge 最新版各测一遍核心流程（登录、主要模块页面、提交、报告查看）
- 在真机或模拟器中测试 Safari iOS、Chrome Android 的触控与布局
- 若有明确最低版本要求，可在 CI 或文档中注明，并考虑使用 Browserstack 等做回归
