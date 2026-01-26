# 文生视频数据存储 API 文档

## 概述

本文档定义了文生视频功能所需存储的所有数据结构，包括聊天消息、画布视频、画布视图状态（缩放、平移）以及用户设置等字段。

---

## 数据结构定义

### 1. 会话（Session）

会话是用户一次完整的文生视频工作流程，包含所有聊天记录、画布视频和视图状态。

```typescript
interface Session {
  // 基础信息
  id: string;                    // 会话唯一标识符，必填
  title: string;                  // 会话标题，可选（可由第一条用户消息自动生成）
  userId: string;                 // 用户ID，必填
  createdAt: string;              // 创建时间，ISO 8601 格式，必填
  updatedAt: string;              // 更新时间，ISO 8601 格式，必填
  
  // 聊天消息列表
  messages: ChatMessage[];        // 聊天消息数组，必填，默认空数组
  
  // 画布数据
  canvasVideos: CanvasVideo[];    // 画布上的视频数组，必填，默认空数组
  canvasView: CanvasView;          // 画布视图状态（缩放、平移），必填
  
  // 用户设置
  settings: UserSettings;        // 用户设置，必填
}
```

---

### 2. 聊天消息（ChatMessage）

记录用户输入和系统响应的消息。

```typescript
interface ChatMessage {
  id: string;                     // 消息唯一标识符，必填
  type: 'user' | 'system';         // 消息类型，必填
  content: string;                // 消息文本内容，必填
  video?: string;                  // 视频URL（仅系统消息可能有），可选
  timestamp: string;               // 消息时间戳，ISO 8601 格式，必填
  status?: MessageStatus;          // 消息状态（仅系统消息），可选
  progress?: number;               // 生成进度（0-100，仅系统消息），可选
  designThoughts?: string[];     // 设计思路数组（仅系统消息），可选
  resultSummary?: string;         // 结果摘要（仅系统消息），可选
}

// 消息状态枚举
type MessageStatus = 
  | 'queued'      // 排队中
  | 'processing'  // 处理中
  | 'completed'   // 已完成
  | 'failed';     // 生成失败
```

**字段说明：**

- `id`: 消息唯一标识，建议使用时间戳或UUID
- `type`: 
  - `user`: 用户发送的消息
  - `system`: AI系统生成的消息
- `content`: 消息文本内容
  - 用户消息：用户输入的提示词
  - 系统消息：AI的回复文本（可能为空，仅显示状态）
- `video`: 视频URL（仅系统消息）
  - 当系统生成视频时，此字段包含视频的URL
- `timestamp`: 消息创建时间，ISO 8601 格式，例如：`"2024-01-15T10:30:00.000Z"`
- `status`: 消息状态（仅系统消息有效）
  - `queued`: 排队中
  - `processing`: 处理中
  - `completed`: 已完成
  - `failed`: 生成失败
- `progress`: 生成进度（仅系统消息有效）
  - 范围：`0` 到 `100`
  - 表示视频生成的进度百分比
  - 例如：`50` 表示生成进度为50%
- `designThoughts`: 设计思路数组（仅系统消息）
  - 例如：`["视频理解：图像中的形象在赛跑", "时长：15秒", "尺寸：1280x720"]`
- `resultSummary`: 结果摘要（仅系统消息）
  - 例如：`"已完成视频生成，时长为15秒，尺寸为1280x720。"`

---

### 3. 画布视频（CanvasVideo）

画布上显示的视频及其位置、尺寸信息。

```typescript
interface CanvasVideo {
  id: string;                      // 视频唯一标识符，必填
  url: string;                     // 视频URL，必填
  x: number;                       // 画布X坐标（画布坐标系，非屏幕坐标），必填
  y: number;                       // 画布Y坐标（画布坐标系，非屏幕坐标），必填
  width: number;                   // 视频显示宽度（像素），必填
  height: number;                  // 视频显示高度（像素），必填
  prompt?: string;                 // 生成该视频时使用的提示词，可选
  taskId?: string;                 // 视频生成任务ID，可选
}
```

**字段说明：**

- `id`: 视频唯一标识，建议使用时间戳或UUID
- `url`: 视频的完整URL地址（MP4格式）
- `x`: 视频在画布上的X坐标（画布坐标系）
  - 这是**画布坐标系**的坐标，不是屏幕坐标
  - 画布坐标系是固定的，不受缩放和平移影响
  - 例如：`300` 表示距离画布原点右侧300像素
- `y`: 视频在画布上的Y坐标（画布坐标系）
  - 同样使用画布坐标系
  - 例如：`200` 表示距离画布原点下方200像素
- `width`: 视频的显示宽度（像素）
  - 这是视频在画布上的实际显示宽度
  - 例如：`400` 表示视频宽度为400像素
- `height`: 视频的显示高度（像素）
  - 这是视频在画布上的实际显示高度
  - 例如：`300` 表示视频高度为300像素
- `prompt`: 生成该视频时使用的提示词
  - 用于记录视频的生成来源
- `taskId`: 视频生成任务ID
  - 用于关联视频生成任务，格式如：`sora-2-pro:ed2176f5-5f0b-482b-b119-9bb11fd88bc1`
  - 可用于查询任务状态或重新获取视频

**重要说明：**

画布坐标系统是**固定的坐标系**，不受用户缩放（zoom）和平移（pan）操作影响。前端会根据 `zoom` 和 `pan` 值将画布坐标转换为屏幕坐标进行显示。

---

### 4. 画布视图状态（CanvasView）

记录画布的缩放级别和平移位置，用于恢复用户的视图状态。

```typescript
interface CanvasView {
  zoom: number;                    // 缩放级别，必填，范围：0.25 - 2.0，默认：1.0
  pan: {                           // 平移位置，必填
    x: number;                     // X方向平移量（像素），默认：0
    y: number;                     // Y方向平移量（像素），默认：0
  };
}
```

**字段说明：**

- `zoom`: 画布缩放级别
  - 范围：`0.25` 到 `2.0`
  - `1.0` 表示100%缩放（原始大小）
  - `0.5` 表示50%缩放（缩小）
  - `2.0` 表示200%缩放（放大）
  - 默认值：`1.0`
- `pan`: 画布平移位置
  - `x`: X方向的平移量（像素）
    - 正数表示向右平移
    - 负数表示向左平移
    - 默认值：`0`
  - `y`: Y方向的平移量（像素）
    - 正数表示向下平移
    - 负数表示向上平移
    - 默认值：`0`

**重要说明：**

- `pan.x` 和 `pan.y` 是**屏幕坐标系的偏移量**，用于将画布内容在屏幕上平移显示
- 前端会根据 `zoom` 和 `pan` 值计算视频的实际屏幕位置：
  ```
  屏幕X = 画布X * zoom + pan.x
  屏幕Y = 画布Y * zoom + pan.y
  ```

---

### 5. 用户设置（UserSettings）

记录用户选择的模型、时长、尺寸等配置信息。

```typescript
interface UserSettings {
  model: VideoModel;               // 当前选择的模型，必填
  seconds: string;                 // 当前选择的视频时长，必填
  size: string;                    // 当前选择的视频尺寸，必填
  workMode: string;                 // 工作模式，必填，默认：'text-to-video'
  chatPanelWidth: number;          // 聊天面板宽度（百分比），必填，范围：20-60，默认：30
}

// 支持的模型类型
type VideoModel = 
  | 'sora-2'                    // Sora 2 模型
  | 'sora-2-pro';               // Sora 2 Pro 模型

// 支持的视频时长（根据模型不同而不同）
// sora-2 模型支持：'10' | '15'
// sora-2-pro 模型支持：'10' | '15' | '25'
// 注意：openai 分组、原价分组还支持：'4' | '8' | '12'

// 支持的视频尺寸（根据模型不同而不同）
// sora-2 模型支持：'1280x720' | '720x1280'
// sora-2-pro 模型支持：'1280x720' | '720x1280' | '1024x1792' | '1792x1024'
```

**字段说明：**

- `model`: 当前选择的视频生成模型
  - `sora-2`: Sora 2 模型
  - `sora-2-pro`: Sora 2 Pro 模型
- `seconds`: 当前选择的视频时长（秒）
  - **sora-2 模型**支持：`'10'`、`'15'`
  - **sora-2-pro 模型**支持：`'10'`、`'15'`、`'25'`
  - 注意：openai 分组、原价分组还支持：`'4'`、`'8'`、`'12'`
- `size`: 当前选择的视频尺寸
  - **sora-2 模型**支持：`'1280x720'`（标清横屏）、`'720x1280'`（标清竖屏）
  - **sora-2-pro 模型**支持：
    - `'1280x720'`：标清横屏
    - `'720x1280'`：标清竖屏
    - `'1024x1792'`：高清竖屏（仅 sora-2-pro 支持）
    - `'1792x1024'`：高清横屏（仅 sora-2-pro 支持）
- `workMode`: 工作模式
  - 当前仅支持：`'text-to-video'`（文生视频）
  - 默认值：`'text-to-video'`
- `chatPanelWidth`: 聊天面板宽度（百分比）
  - 范围：`20` 到 `60`
  - 默认值：`30`
  - 表示聊天面板占整个页面宽度的百分比

---

## 完整数据示例

### 示例 1：新会话（空数据）

```json
{
  "id": "session-001",
  "title": "新会话",
  "userId": "user-123",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "messages": [],
  "canvasVideos": [],
  "canvasView": {
    "zoom": 1.0,
    "pan": {
      "x": 0,
      "y": 0
    }
  },
  "settings": {
    "model": "sora-2",
    "seconds": "15",
    "size": "1280x720",
    "workMode": "text-to-video",
    "chatPanelWidth": 30
  }
}
```

### 示例 2：包含完整数据的会话

```json
{
  "id": "session-002",
  "title": "视频生成示例",
  "userId": "user-123",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "messages": [
    {
      "id": "msg-001",
      "type": "user",
      "content": "图像中的形象在赛跑",
      "timestamp": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "msg-002",
      "type": "system",
      "content": "视频生成中...",
      "timestamp": "2024-01-15T10:00:05.000Z",
      "status": "processing",
      "progress": 50,
      "designThoughts": [
        "视频理解：图像中的形象在赛跑",
        "时长：15秒",
        "尺寸：1280x720"
      ],
      "resultSummary": "已完成视频生成，时长为15秒，尺寸为1280x720。",
      "video": "https://filesystem.site/cdn/20251015/5e8022c322540fce88fdacf01ed424.mp4"
    }
  ],
  "canvasVideos": [
    {
      "id": "video-001",
      "url": "https://filesystem.site/cdn/20251015/5e8022c322540fce88fdacf01ed424.mp4",
      "x": 300,
      "y": 200,
      "width": 400,
      "height": 300,
      "prompt": "图像中的形象在赛跑",
      "taskId": "sora-2-pro:ed2176f5-5f0b-482b-b119-9bb11fd88bc1"
    }
  ],
  "canvasView": {
    "zoom": 1.2,
    "pan": {
      "x": 50,
      "y": -30
    }
  },
  "settings": {
    "model": "sora-2-pro",
    "seconds": "15",
    "size": "1280x720",
    "workMode": "text-to-video",
    "chatPanelWidth": 35
  }
}
```

---

## API 接口规范

### 1. 创建会话

**接口：** `POST /api/sessions`

**请求体：**

```json
{
  "title": "新会话",
  "settings": {
    "model": "sora-2",
    "seconds": "15",
    "size": "1280x720",
    "workMode": "text-to-video",
    "chatPanelWidth": 30
  }
}
```

**响应：**

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "id": "session-001",
    "title": "新会话",
    "userId": "user-123",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "messages": [],
    "canvasVideos": [],
    "canvasView": {
      "zoom": 1.0,
      "pan": {
        "x": 0,
        "y": 0
      }
    },
    "settings": {
      "model": "sora-2",
      "seconds": "15",
      "size": "1280x720",
      "workMode": "text-to-video",
      "chatPanelWidth": 30
    }
  }
}
```

---

### 2. 获取会话列表

**接口：** `GET /api/sessions`

**查询参数：**
- `page`: 页码（可选，默认：1）
- `pageSize`: 每页数量（可选，默认：20）
- `workMode`: 工作模式（可选，用于筛选文生视频会话）

**响应：**

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "session-001",
        "title": "视频生成示例",
        "messageCount": 2,
        "videoCount": 1,
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 3. 获取会话详情

**接口：** `GET /api/sessions/:sessionId`

**响应：**

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "id": "session-001",
    "title": "视频生成示例",
    "userId": "user-123",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "messages": [...],
    "canvasVideos": [...],
    "canvasView": {...},
    "settings": {...}
  }
}
```

---

### 4. 更新会话

**接口：** `PUT /api/sessions/:sessionId`

**请求体：** 包含需要更新的字段（部分更新）

```json
{
  "title": "更新后的标题",
  "messages": [...],
  "canvasVideos": [...],
  "canvasView": {
    "zoom": 1.5,
    "pan": {
      "x": 100,
      "y": 50
    }
  },
  "settings": {
    "model": "sora-2-pro",
    "seconds": "25",
    "size": "1792x1024",
    "workMode": "text-to-video",
    "chatPanelWidth": 40
  }
}
```

**响应：**

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "id": "session-001",
    "updatedAt": "2024-01-15T10:35:00.000Z",
    ...
  }
}
```

---

### 5. 删除会话

**接口：** `DELETE /api/sessions/:sessionId`

**响应：**

```json
{
  "code": "0",
  "msg": "success",
  "data": null
}
```

---

## 数据库设计建议

### 表结构设计

#### 1. sessions 表（会话表）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | VARCHAR(64) | 会话ID | PRIMARY KEY |
| user_id | VARCHAR(64) | 用户ID | NOT NULL, INDEX |
| title | VARCHAR(255) | 会话标题 | |
| work_mode | VARCHAR(50) | 工作模式（text-to-video） | NOT NULL |
| canvas_view | JSON | 画布视图状态（zoom, pan） | NOT NULL |
| settings | JSON | 用户设置（model, seconds, size等） | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |
| updated_at | TIMESTAMP | 更新时间 | NOT NULL |

#### 2. messages 表（消息表）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | VARCHAR(64) | 消息ID | PRIMARY KEY |
| session_id | VARCHAR(64) | 会话ID | NOT NULL, INDEX, FOREIGN KEY |
| type | VARCHAR(20) | 消息类型（user/system） | NOT NULL |
| content | TEXT | 消息内容 | NOT NULL |
| video | VARCHAR(512) | 视频URL | |
| status | VARCHAR(20) | 消息状态（queued/processing/completed/failed） | |
| progress | INT | 生成进度（0-100） | |
| design_thoughts | JSON | 设计思路数组 | |
| result_summary | TEXT | 结果摘要 | |
| timestamp | TIMESTAMP | 消息时间戳 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |

#### 3. canvas_videos 表（画布视频表）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | VARCHAR(64) | 视频ID | PRIMARY KEY |
| session_id | VARCHAR(64) | 会话ID | NOT NULL, INDEX, FOREIGN KEY |
| url | VARCHAR(512) | 视频URL | NOT NULL |
| x | DECIMAL(10,2) | 画布X坐标 | NOT NULL |
| y | DECIMAL(10,2) | 画布Y坐标 | NOT NULL |
| width | INT | 视频宽度（像素） | NOT NULL |
| height | INT | 视频高度（像素） | NOT NULL |
| prompt | TEXT | 生成提示词 | |
| task_id | VARCHAR(128) | 视频生成任务ID | |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |
| updated_at | TIMESTAMP | 更新时间 | NOT NULL |

---

## 重要注意事项

### 1. 画布坐标系说明

- **画布坐标系**是固定的，不受用户缩放和平移影响
- `CanvasVideo` 中的 `x` 和 `y` 使用画布坐标系
- `CanvasView` 中的 `pan.x` 和 `pan.y` 是屏幕坐标系的偏移量
- 前端会根据 `zoom` 和 `pan` 计算屏幕显示位置：
  ```
  屏幕X = 画布X * zoom + pan.x
  屏幕Y = 画布Y * zoom + pan.y
  ```

### 2. 数据同步策略

- 建议使用**增量更新**策略，只同步变更的数据
- 画布视频的移动、删除操作需要实时同步
- 画布视图状态（zoom、pan）可以**防抖更新**，避免频繁请求
- 聊天消息在生成过程中需要实时更新进度（progress字段）
- 视频生成完成后同步最终结果

### 3. 数据验证

- `zoom` 值必须在 `0.25` 到 `2.0` 之间
- `chatPanelWidth` 值必须在 `20` 到 `60` 之间
- `seconds` 必须与 `model` 匹配（参考 `UserSettings` 说明）
- `size` 必须与 `model` 匹配（参考 `UserSettings` 说明）
- `progress` 值必须在 `0` 到 `100` 之间
- `CanvasVideo` 的 `x`、`y`、`width`、`height` 必须为有效数字

### 4. 视频播放功能

- 画布上的视频支持点击播放/暂停
- 视频URL必须是有效的MP4格式
- 建议使用CDN加速视频加载
- 视频文件可能较大，需要考虑存储和带宽成本

### 5. 性能优化建议

- 会话列表接口只返回基础信息，不包含完整的 `messages` 和 `canvasVideos`
- 使用分页加载，避免一次性加载大量数据
- 视频URL建议使用CDN加速
- 考虑使用视频缩略图，减少加载时间
- 对于长时间的视频生成任务，可以考虑异步通知机制
- 考虑使用缓存策略，减少数据库查询

### 6. 任务ID说明

- `taskId` 格式：`{model}:{uuid}`
  - 例如：`sora-2-pro:ed2176f5-5f0b-482b-b119-9bb11fd88bc1`
- 可用于查询任务状态或重新获取视频
- 建议在数据库中存储，以便后续查询

---

## 更新日志

- **2024-01-15**: 初始版本，包含所有基础数据结构定义

---

## 联系方式

如有疑问，请联系前端开发团队。
