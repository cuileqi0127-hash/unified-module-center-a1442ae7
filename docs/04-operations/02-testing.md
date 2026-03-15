# 测试用例文档

## 1. 现状说明

当前仓库**尚未接入自动化测试框架**（无 Vitest、Jest、React Testing Library、Cypress、Playwright 等），也没有成体系的单元测试或 E2E 用例。以下为**测试规划与建议**，便于后续补齐。

---

## 2. 单元测试建议

### 2.1 框架选型

- **推荐**: **Vitest** + **React Testing Library**，与 Vite 生态一致，配置简单，支持 TS/JSX、ESM、path 别名
- **安装示例**: `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`

### 2.2 建议覆盖范围

| 类型 | 对象 | 说明 |
|------|------|------|
| 工具函数 | `src/lib/utils.ts`（如 `cn`）、`src/utils/*.ts` | 纯函数，易测 |
| API 封装 | `apiClient` 的请求构造、错误分支（可 mock fetch） | 校验 URL、headers、401 处理 |
| 工具 Hook | 如 `useReportPolling` 的轮询逻辑（mock 定时器） | 校验调用次数、停止条件 |
| 简单组件 | `Button`、`InlinePicker`（受控） | 渲染、点击、选中回调 |
| 表单校验 | 与 zod schema 对应的校验逻辑 | 合法/非法输入与错误信息 |

### 2.3 目录与命名

- 用例位置：与源码同目录的 `*.test.ts` / `*.test.tsx` 或集中到 `src/**/__tests__/*.test.ts(x)`
- 命名：`describe('模块/组件名')`，`it('具体行为描述')`

### 2.4 示例（Vitest + RTL）

```ts
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
});
```

```tsx
// src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button', { name: /click/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 3. E2E 测试建议

### 3.1 框架选型

- **Playwright** 或 **Cypress**：支持多浏览器、录屏、调试友好；Playwright 与 Node 集成好，适合 CI
- **安装示例（Playwright）**: `npm i -D @playwright/test`，`npx playwright install`

### 3.2 建议覆盖场景

| 场景 | 步骤概要 |
|------|----------|
| 登录与权限 | 未登录访问受保护路由 → 出现登录引导；登录后访问主模块 |
| 模块与侧栏 | 点击侧栏切换 AI Toolbox / LLM Console / GEO Insights，URL 与内容一致 |
| 路由重定向 | 访问 `/ai-toolbox/campaign-planner` → 重定向到 `planning-solutions` |
| 策划方案 | 进入策划方案页，选择目标/预算/周期，提交（可 mock 接口） |
| 文生图/文生视频 | 选择模型、输入提示词、触发生成（可 mock） |
| 报告展示 | 有报告 URL 时，ReportDisplay 内 iframe 加载（可 stub 接口返回 HTML） |

### 3.3 环境与数据

- E2E 使用独立测试环境与测试账号，避免污染生产数据
- 接口可部分 mock 或使用测试后端，保证用例稳定、可重复

---

## 4. 后续落地步骤

1. 在仓库中引入 Vitest + React Testing Library，配置 `vite.config.ts` 的 `test` 与 `resolve.alias`
2. 为 `cn`、`apiClient` 等先写少量用例，保证 `npm run test` 可跑通
3. 逐步为关键工具函数与核心组件增加用例，并在 MR 中要求覆盖关键路径
4. 引入 Playwright/Cypress，先覆盖「登录 → 侧栏切换 → 1～2 个核心页」的 smoke，再按需求扩展
5. 在 CI 中增加 `npm run test` 与 E2E 任务（可仅主分支或 PR 触发）

---

## 5. 测试命令建议

在 `package.json` 的 `scripts` 中可增加：

- `"test": "vitest"`：单测
- `"test:run": "vitest run"`：单次运行（CI 用）
- `"test:e2e": "playwright test"`：E2E（按实际框架调整）

当前项目暂无上述脚本，待接入框架后补充即可。
