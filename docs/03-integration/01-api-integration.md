# 接口对接文档

## 1. API 调用说明

### 1.1 基础配置

- **Base URL**: 前端统一使用相对路径 `/api`，由 Vite 开发代理或生产环境 Nginx 转发到后端服务
- **封装位置**: `src/services/apiClient.ts`（请求方法）、`src/services/apiInterceptor.ts`（认证与 401 处理）

### 1.2 请求方法

| 方法 | 函数 | 说明 |
|------|------|------|
| GET | `apiGet<T>(endpoint, config?)` | 查询 |
| POST | `apiPost<T>(endpoint, data?, config?)` | 创建/提交；body 为 FormData 时自动不设 Content-Type，由浏览器设置 |
| PATCH | `apiPatch<T>(endpoint, data?, config?)` | 部分更新 |
| DELETE | `apiDelete<T>(endpoint, config?)` | 删除 |

**RequestConfig**（可选）:

| 属性 | 类型 | 说明 |
|------|------|------|
| `useAuth` | `boolean` | 是否带认证头，默认 `true` |
| `parseJson` | `boolean` | 是否解析为 JSON，默认 `true` |
| `baseURL` | `string` | 覆盖 base，与 endpoint 拼接为完整 URL |
| 其他 | `RequestInit` | 如 `headers`、`signal`（AbortController）等 |

**示例**:

```ts
import { apiGet, apiPost, ApiResponse } from '@/services/apiClient';

const res = await apiGet<{ list: Item[] }>('/report/list');
if (res.success && res.data) {
  setList(res.data.list);
}

await apiPost('/campaign/submit', { goal: 'brand', budget: 'mid' });
```

---

## 2. 数据格式

### 2.1 统一响应结构（ApiResponse）

```ts
interface ApiResponse<T = any> {
  code: number | string;
  msg: string;
  success: boolean;
  timestamp?: number;
  data: T;
}
```

- **成功**: `success === true`，业务数据在 `data`
- **失败**: `success === false` 或 HTTP 非 2xx，错误信息在 `msg` 或 `response.statusText`

### 2.2 分页（PaginatedResponse）

```ts
interface PaginatedResponse<T> {
  list: T[];
  total: number;
}
```

列表接口的 `data` 可为此结构，或在此基础上再包一层（以实际后端约定为准）。

### 2.3 认证

- **Token 来源**: 由 `oauthApi` / OAuth 流程写入缓存，`getCachedToken()` 读取
- **请求头**: `Authorization: Bearer <token>`，由 `getAuthHeaders()` 提供，`apiGet`/`apiPost` 等在 `useAuth: true` 时自动附带
- **Cookie**: 部分登录态可能同时使用 cookie（如 `auth_token`），与后端约定一致即可

---

## 3. 错误处理

### 3.1 认证/登录态失效

- **触发条件**:  
  - HTTP 状态码为 401、400、404、500、501 或 403；或  
  - 响应体 JSON 中 `code` 为 401、400、404、500、501（见 `apiInterceptor` 中 `AUTH_ERROR_CODES`）
- **行为**: 清空 OAuth 缓存与本地用户状态，调用 `redirectToLogin()` 跳转登录（或登录页），不再使用弹窗
- **调用方**: 请求方法内检测到上述情况会调用 `handle401Error()` 并 `throw`，业务层可在 try/catch 中做提示或静默

### 3.2 业务错误

- 后端返回 `success: false` 或 `code` 非成功码时，由调用方根据 `msg`/`code` 做提示（如 toast）
- 网络异常、超时、非 2xx：`apiGet`/`apiPost` 等会 `throw new Error(...)`，建议在页面或封装层统一 try/catch 并 toast

### 3.3 取消请求

- 传入 `config.signal`（AbortSignal），在组件卸载或依赖变化时 `controller.abort()`，避免 setState 在未挂载组件上执行

---

## 4. 与后端对接注意点

- 所有接口 path 以 `/api` 为前缀（前端只写 endpoint，如 `/report/list`）
- 响应需符合 `ApiResponse<T>` 结构；若后端字段名不同（如 `message` 而非 `msg`），可在 apiClient 层做一次适配
- 登录态失效的 code 与 HTTP 状态需与前端 `AUTH_ERROR_CODES` 及 401/403 处理一致
- 文件上传使用 `FormData`，调用 `apiPost(url, formData)` 即可，不要手动设置 `Content-Type`
