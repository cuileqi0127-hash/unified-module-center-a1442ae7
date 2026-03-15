# 部署文档

## 1. 构建流程

### 1.1 脚本说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器，默认 `http://[::]:8080`，支持 HMR |
| `npm run build` | 生产构建，输出到 `dist/`，默认 mode 为 production |
| `npm run build:dev` | 以 development 模式构建（可用于测试环境） |
| `npm run preview` | 本地预览构建产物（服务 `dist/` 目录） |
| `npm run lint` | 执行 ESLint 检查 |

### 1.2 构建产物

- **输出目录**: `dist/`（可在 `vite.config.ts` 的 `build.outDir` 修改）
- **内容**: 入口 HTML、JS/CSS 分块（含 hash）、静态资源；所有 API 请求使用相对路径 `/api` 等，依赖部署环境反向代理转发

### 1.3 路径与别名

- 源码中 `@` 指向 `src/`，构建时由 Vite 解析，产物中已替换为实际路径

---

## 2. 环境配置

### 2.1 环境变量

- 使用 Vite 的 `loadEnv(mode, process.cwd())` 可加载 `.env`、`.env.local`、`.env.[mode]` 等
- 前端仅能访问以 `VITE_` 开头的变量，如 `import.meta.env.VITE_APP_TITLE`
- 当前项目 API 基址为相对路径 `/api`，无需在前端区分环境；若需区分后端地址，可配置 `VITE_API_BASE` 并在 apiClient 中使用（需改代码）

### 2.2 开发代理（vite.config.ts）

开发时通过 `server.proxy` 将请求转发到后端，避免跨域：

- `/api`: 主后端 API（具体 target 以当前配置为准）
- `/api/tu-zi`: 第三方 tu-zi API
- `/api/process`、`/api/video-to-prompt`: 视频处理服务
- `/api/proxy`: 文件代理
- `/api/tools/download`: 工具下载（大文件，超时已延长）
- `/aigc`、`/vod`、`/common`: 文生视频、上传等（target 以配置为准）

生产环境不经过 Vite，需在 Nginx 或网关中配置相同 path 的代理到对应后端服务。

---

## 3. 发布流程建议

1. **代码**: 从主分支拉取或合并，确认 `npm run lint` 通过
2. **安装依赖**: `npm ci`（推荐，保证与 lockfile 一致）
3. **构建**: `npm run build`，检查 `dist/` 生成无报错
4. **预览**: 本地 `npm run preview` 做一次冒烟（登录、主要路由、关键接口）
5. **部署**: 将 `dist/` 内容部署到静态服务器或 CDN；确保所有 `/api`、`/aigc`、`/vod`、`/common` 等请求在 Nginx（或网关）中反向代理到正确后端
6. **验证**: 线上访问主路径、登录、核心功能回归

### 3.1 Nginx 示例（仅作参考）

```nginx
# 静态资源
root /path/to/dist;
try_files $uri $uri/ /index.html;

# API 与后端代理（示例，实际 target 以运维为准）
location /api/ { proxy_pass http://backend_api/; }
location /aigc/ { proxy_pass http://aigc_service/; }
location /vod/   { proxy_pass http://vod_service/; }
location /common/ { proxy_pass http://common_service/; }
```

---

## 4. 注意事项

- 生产构建前勿将开发环境 target（如内网 IP）提交到仓库，建议通过环境变量或 CI 注入
- 若使用 OAuth/第三方登录，需在对应平台配置生产回调 URL
- 大文件下载等长超时路径，Nginx 的 `proxy_read_timeout` 等需与前端/后端超时匹配
