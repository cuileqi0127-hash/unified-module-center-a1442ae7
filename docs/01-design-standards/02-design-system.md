# 设计规范文档

## 1. 设计系统概述

项目采用 **Enterprise Monochrome + Warm Orange** 设计体系：以中性灰为主，**accent** 暖橙色用于强调与选中态，保证专业感与品牌一致。

- **全局样式**: `src/index.css`
- **Tailwind 配置**: `tailwind.config.ts`
- **字体**: Google Fonts — Inter（正文）、Urbanist（展示）

---

## 2. 主题变量（CSS Variables）

所有颜色、圆角、阴影均通过 CSS 变量定义，支持亮色/暗色切换（`.dark`）。

### 2.1 色彩（HSL，无 `hsl()` 包裹，由 Tailwind 使用）

| 变量名 | 用途 | 亮色示例值 |
|--------|------|------------|
| `--background` | 页面背景 | `0 0% 100%` |
| `--foreground` | 主文字 | `0 0% 5%` |
| `--card` / `--card-foreground` | 卡片背景/文字 | 同 background/foreground |
| `--popover` / `--popover-foreground` | 弹层背景/文字 | 同上 |
| `--primary` / `--primary-foreground` | 主按钮、重要操作 | `0 0% 9%` / `0 0% 98%` |
| `--secondary` / `--secondary-foreground` | 次要背景/文字 | `0 0% 96%` / `0 0% 9%` |
| `--muted` / `--muted-foreground` | 弱化背景/说明文字 | `0 0% 96%` / `0 0% 45%` |
| **`--accent`** / **`--accent-foreground`** | **强调、选中、品牌色** | **`15 90% 55%`** / `0 0% 100%` |
| `--destructive` / `--destructive-foreground` | 危险操作、错误 | `0 84% 60%` / `0 0% 98%` |
| `--success` / `--warning` | 成功、警告 | 绿色 / 琥珀色 |
| `--border` / `--input` / `--ring` | 边框、输入框、焦点环 | 灰色系 |
| `--surface-elevated` / `--surface-hover` | 浮层、hover 背景 | `0 0% 99%` / `0 0% 97%` |
| **Sidebar** | 侧边栏 | `--sidebar-background`, `--sidebar-foreground`, `--sidebar-accent` 等 |

### 2.2 圆角与阴影

| 变量 | 说明 |
|------|------|
| `--radius` | 基础圆角，默认 `0.75rem`；Tailwind 中 `rounded-lg` 使用该值 |
| `--shadow-sm` ~ `--shadow-xl` | 通用阴影 |
| `--shadow-card` / `--shadow-card-hover` | 卡片默认与 hover 阴影 |

### 2.3 渐变（可选）

- `--gradient-hero`: 首屏/大区背景
- `--gradient-card`: 卡片渐变
- `--gradient-accent`: 强调渐变（橙系）

---

## 3. 样式指南

### 3.1 字体

- **正文**: `font-sans` → Inter
- **标题/展示**: `font-display` → Urbanist
- 字重：300 / 400 / 500 / 600 / 700 按需使用

### 3.2 按钮与交互

- **主按钮**: `variant="default"`，背景 primary，hover 略加深
- **次要/幽灵**: `variant="ghost"` 或 `variant="outline"`；hover 统一为 `bg-foreground/10`、`text-foreground`（参考国际化按钮）
- **危险**: `variant="destructive"`

### 3.3 下拉与选择

- 触发器：`rounded-lg`、`border`；有值时 `bg-accent/10 border-accent/20 text-accent`
- 下拉面板：`rounded-xl border border-border/30 shadow-lg p-1`，选项 `rounded-lg`，选中项 `bg-accent/10 text-accent`，左侧勾选图标
- 弹层需设置 `collisionPadding={12}`，避免溢出视口

### 3.4 卡片与容器

- 卡片：`rounded-lg border bg-card`，阴影使用 `shadow-card` / `shadow-card-hover`
- 侧边栏：使用 `--sidebar-*` 变量，与主背景区分

### 3.5 动画

Tailwind 中已定义：`animate-fade-in`、`animate-page-enter`、`animate-slide-in-left`、`accordion-down/up`、`shimmer`、`pulse-slow`、`media-viewer-*`、`tag-in`、`trending-card-enter` 等，按需使用，保持时长与缓动一致。

---

## 4. 暗色模式

根节点增加 `.dark` 时启用暗色。所有颜色在 `src/index.css` 的 `.dark` 中重写为深色等效值，无需在业务中重复写 dark: 颜色（除非特殊覆盖）。

---

## 5. 自定义组件类名

`index.css` 中部分业务类名已统一定义，例如：

- `.sidebar-menu-item`、`.sidebar-section-label`
- `.module-nav-item`
- `.stat-card`
- `.data-table`、`.status-badge*`
- `.scrollbar-thin`、`.text-balance`

新组件优先使用 Tailwind + 设计变量，必要时再扩展此类工具类。
