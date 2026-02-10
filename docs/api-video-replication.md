# 复刻视频页面 - 接口文档

本文档描述「复刻视频」功能相关的前端调用接口，包括：上传原视频并解析卖点、上传参考图、创建视频生成任务、轮询任务状态。

**前端封装位置**：`src/services/videoReplicationApi.ts`

---

## 0. 代理服务配置

前端请求使用**相对路径**（如 `/api/process/upload`、`/vod/upload`、`/aigc/create`），在开发环境由 Vite 代理到真实后端，在生产环境由 Nginx（或其它网关）转发。

### 0.1 开发环境（Vite Proxy）

配置位置：`vite.config.ts` → `server.proxy`。复刻视频相关代理如下：

| 前端请求路径（前缀） | 代理目标（Target） | 说明 |
|----------------------|--------------------|------|
| `/api/process` | `http://183.87.33.181:8001` | 视频复刻上传、解析卖点（`/api/process/upload`） |
| `/vod` | `http://94.74.98.20:8000` | VOD 参考图上传（`/vod/upload`） |
| `/aigc` | `http://94.74.98.20:8001` | AIGC 创建任务、查询任务（`/aigc/create`、`/aigc/task`） |

- **匹配顺序**：Vite 按配置顺序匹配，更具体的路径（如 `/api/process`）需写在更泛的 `/api` 之前，否则会被 `/api` 先命中。
- **选项**：`changeOrigin: true`；`/api/process` 含 `secure: false`；路径 `rewrite` 均为保留原路径（如 `/api/process` → `/api/process`）。

### 0.2 生产环境（Nginx / 网关）

生产环境没有 Vite，需在 Nginx（或同类网关）中配置相同路径转发到对应后端：

- `location /api/process` → 反向代理到 `http://183.87.33.181:8001`
- `location /vod` → 反向代理到 `http://94.74.98.20:8000`
- `location /aigc` → 反向代理到 `http://94.74.98.20:8001`

可根据实际部署修改为内网 IP、域名或负载均衡地址。

### 0.3 复刻视频接口与代理对应关系

| 接口 | 前端请求 URL | 开发环境代理目标 |
|------|--------------|------------------|
| 上传视频并解析卖点 | `POST /api/process/upload` | `http://183.87.33.181:8001/api/process/upload` |
| 上传参考图 | `POST /vod/upload` | `http://94.74.98.20:8000/vod/upload` |
| 创建视频任务 | `POST /aigc/create` | `http://94.74.98.20:8001/aigc/create` |
| 查询任务状态 | `POST /aigc/task` | `http://94.74.98.20:8001/aigc/task` |

---

## 1. 上传视频文件（解析并生成卖点）

上传原视频文件，服务端解析视频并返回卖点文案（`prompt_text`），用于后续「参考图 + 卖点」生成复刻视频。

### 请求

| 项目 | 说明 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/process/upload` |
| **认证** | 不使用用户 Token（`useAuth: false`） |
| **请求头** | `X-API-Key: F92sG7kP1rX5b1` |

### 请求体

`Content-Type: multipart/form-data`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 视频文件 |

### 响应

业务数据在统一包装的 `data` 中，或直接为响应体。前端会使用 `response.data || response`。

| 字段 | 类型 | 说明 |
|------|------|------|
| prompt_text | string | 解析得到的卖点/文案，用于后续创建任务时的 prompt |
| （其他） | - | 服务端可能返回的其他字段 |

### 前端调用

```ts
import { uploadVideoFile } from '@/services/videoReplicationApi';

const res = await uploadVideoFile(file); // File
if (res?.prompt_text) setSellingPoints(res.prompt_text);
```

---

## 2. 上传参考图片（VOD）

将参考图上传到 VOD 服务，返回 `fileId`，用于创建视频生成任务时的 `file_id`。

### 请求

| 项目 | 说明 |
|------|------|
| **Method** | `POST` |
| **URL** | `/vod/upload` |
| **认证** | 不使用用户 Token（`useAuth: false`） |

### 请求体

`Content-Type: multipart/form-data`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| region | string | 是 | 区域，默认 `ap-guangzhou` |
| sub_app_id | string | 是 | 子应用 ID，默认 `1320866336` |
| media | File | 是 | 图片文件 |
| cover | string | - | 封面，可为空 `''` |

### 响应

前端使用 `response.data || response` 作为 `MediaUploadResponse`。

| 字段 | 类型 | 说明 |
|------|------|------|
| fileId | string | 上传后得到的文件 ID，创建 AIGC 任务时使用 |
| mediaUrl | string | 可选，媒体 URL |
| coverUrl | string | 可选，封面 URL |

### 前端调用

```ts
import { uploadMediaFile } from '@/services/videoReplicationApi';

const res = await uploadMediaFile(file, 'ap-guangzhou', '1320866336');
if (res?.fileId) setImageFileId(res.fileId);
```

---

## 3. 创建视频生成任务（AIGC）

根据「卖点文案 + 参考图 fileId」创建一条视频复刻任务，返回任务 ID，用于轮询状态。

### 请求

| 项目 | 说明 |
|------|------|
| **Method** | `POST` |
| **URL** | `/aigc/create` |
| **认证** | 不使用用户 Token（`useAuth: false`） |

### 请求体

`Content-Type: application/json`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| model_name | string | 是 | 固定 `"OS"` |
| prompt | string | 是 | 卖点文案（来自上传视频接口的 prompt_text 或用户编辑） |
| model_version | string | 是 | 固定 `"2.0"` |
| file_id | string | 是 | 参考图上传后返回的 fileId（VOD） |

**示例**

```json
{
  "model_name": "OS",
  "prompt": "产品卖点文案...",
  "model_version": "2.0",
  "file_id": "xxxxxxxx"
}
```

### 响应（后端原始格式）

| 字段 | 类型 | 说明 |
|------|------|------|
| Response | object |  |
| Response.TaskId | string | 任务 ID，用于查询状态 |
| Response.RequestId | string | 请求 ID |

### 前端统一格式（VideoTaskResponse）

| 字段 | 类型 | 说明 |
|------|------|------|
| task_id | string | 任务 ID |
| status | 'queued' \| 'processing' \| 'completed' \| 'failed' | 创建时一般为 `queued` |

### 前端调用

```ts
import { createVideoTask } from '@/services/videoReplicationApi';

const createResponse = await createVideoTask({
  prompt: sellingPoints.trim(),
  fileId: imageFileId,
});
const taskId = createResponse.task_id; // 用于轮询
```

---

## 4. 查询任务状态（AIGC）

根据任务 ID 查询当前状态与进度，完成时返回视频 URL。

### 请求

| 项目 | 说明 |
|------|------|
| **Method** | `POST` |
| **URL** | `/aigc/task` |
| **认证** | 不使用用户 Token（`useAuth: false`） |

### 请求体

`Content-Type: application/json`

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| task_id | string | 是 | 创建任务返回的 TaskId |

**示例**

```json
{
  "task_id": "xxxxxxxx"
}
```

### 响应（后端原始格式 AigcTaskResponse）

| 字段 | 类型 | 说明 |
|------|------|------|
| TaskType | string | 任务类型 |
| Status | string | 总体状态 |
| CreateTime | string | 创建时间 |
| BeginProcessTime | string | 开始处理时间 |
| FinishTime | string | 结束时间 |
| AigcVideoTask | object \| null | 任务详情 |
| AigcVideoTask.TaskId | string | 任务 ID |
| AigcVideoTask.Status | string | PROCESSING / SUCCESS / FAILED 等 |
| AigcVideoTask.ErrCode | number | 错误码 |
| AigcVideoTask.Message | string | 错误或状态信息 |
| AigcVideoTask.Progress | number | 进度 0–100 |
| AigcVideoTask.Input | object | 输入（ModelName、ModelVersion、Prompt 等） |
| AigcVideoTask.Output | object | 输出 |
| AigcVideoTask.Output.FileInfos | array | 文件列表 |
| AigcVideoTask.Output.FileInfos[].FileId | string | 文件 ID |
| AigcVideoTask.Output.FileInfos[].Url / FileUrl | string | 视频 URL（完成时） |

### 前端统一格式（VideoTaskResponse）

| 字段 | 类型 | 说明 |
|------|------|------|
| task_id | string | 任务 ID |
| status | 'queued' \| 'processing' \| 'completed' \| 'failed' | 统一状态 |
| progress | number | 进度 0–100 |
| video_url | string | 完成时的视频地址（来自 FileInfos[0].FileUrl 或 Url） |
| error_message | string | 失败时的错误信息 |
| error_code | number | 失败时的错误码 |

**状态映射**

- 后端 `SUCCESS` / `COMPLETED` / `FINISH` → `completed`
- 后端 `FAILED` / `ERROR` → `failed`
- 后端 `PROCESSING` / `RUNNING` → `processing`
- 其他 → `queued`

### 前端调用

- 单次查询：`getTaskStatus(taskId)`
- 轮询直到完成：`pollTaskUntilComplete(taskId, onProgress?, interval?, maxAttempts?)`

```ts
import { getTaskStatus, pollTaskUntilComplete } from '@/services/videoReplicationApi';

// 单次查询
const status = await getTaskStatus(taskId);

// 轮询（默认 2s 间隔，最多 300 次约 10 分钟）
const finalStatus = await pollTaskUntilComplete(
  taskId,
  (status) => console.log('Task progress:', status),
  2000,
  300
);
if (finalStatus.status === 'completed') {
  const videoUrl = finalStatus.video_url;
}
```

---

## 5. 复刻视频页面流程概览

1. **上传原视频** → 调用 `POST /api/process/upload`，拿到 `prompt_text`，进入「分析/卖点」步骤。
2. **用户编辑卖点（可选）** → 使用或修改 `prompt_text` 作为后续 `prompt`。
3. **上传参考图** → 调用 `POST /vod/upload`，拿到 `fileId`。
4. **创建任务** → 调用 `POST /aigc/create`，传入 `prompt` + `file_id`，拿到 `task_id`。
5. **轮询状态** → 循环调用 `POST /aigc/task`（封装在 `pollTaskUntilComplete`），直到 `status === 'completed'` 或 `'failed'`，完成时使用 `video_url` 展示/下载。

---

## 6. 错误与鉴权说明

- 上述接口均未使用用户登录 Token（`useAuth: false`）。
- `/api/process/upload` 通过请求头 `X-API-Key` 鉴权。
- 接口异常时由统一 `apiClient` / `apiInterceptor` 处理（如 401/403 会触发登出逻辑）。
- 复刻视频接口使用独立路径（`/api/process`、`/vod`、`/aigc`），开发环境依赖 [§0.1 代理服务配置](#01-开发环境vite-proxy)，生产环境需在 Nginx/网关按 [§0.2](#02-生产环境nginx--网关) 将相应路径转发到对应后端 IP/端口。
