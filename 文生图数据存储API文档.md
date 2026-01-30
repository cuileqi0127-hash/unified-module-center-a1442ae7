# 文生图数据存储 API 文档

## 概述

本文档定义了文生图功能所需存储的所有数据结构，包括聊天消息、画布图片、画布视图状态（缩放、平移）以及用户设置等字段。

---

## 数据结构定义

### 1. 会话（Session）

会话是用户一次完整的文生图工作流程，包含所有聊天记录、画布图片和视图状态。

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
  canvasImages: CanvasImage[];    // 画布上的图片数组，必填，默认空数组
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
  image?: string;                  // 图片URL（仅系统消息可能有），可选
  timestamp: string;               // 消息时间戳，ISO 8601 格式，必填
  status?: MessageStatus;          // 消息状态（仅系统消息），可选
  designThoughts?: string[];     // 设计思路数组（仅系统消息），可选
  resultSummary?: string;         // 结果摘要（仅系统消息），可选
}

// 消息状态枚举
type MessageStatus = 
  | 'thinking'      // 思考中
  | 'analyzing'     // 图片理解中
  | 'designing'     // 正在设计
  | 'optimizing'    // 优化细节中
  | 'complete';     // 任务已完成
```

**字段说明：**

- `id`: 消息唯一标识，建议使用时间戳或UUID
- `type`: 
  - `user`: 用户发送的消息
  - `system`: AI系统生成的消息
- `content`: 消息文本内容
  - 用户消息：用户输入的提示词
  - 系统消息：AI的回复文本（可能为空，仅显示状态）
- `image`: 图片URL（仅系统消息）
  - 当系统生成图片时，此字段包含图片的URL
- `timestamp`: 消息创建时间，ISO 8601 格式，例如：`"2024-01-15T10:30:00.000Z"`
- `status`: 消息状态（仅系统消息有效）
  - `thinking`: 思考中
  - `analyzing`: 图片理解中
  - `designing`: 正在设计
  - `optimizing`: 优化细节中
  - `complete`: 任务已完成
- `designThoughts`: 设计思路数组（仅系统消息）
  - 例如：`["图片理解：一只橘猫在阳光下", "画面比例：1:1"]`
- `resultSummary`: 结果摘要（仅系统消息）
  - 例如：`"已完成图片生成，输出比例为1:1。"`

---

### 3. 画布图片（CanvasImage）

画布上显示的图片及其位置、尺寸信息。

```typescript
interface CanvasImage {
  id: string;                      // 图片唯一标识符，必填
  url: string;                     // 图片URL，必填
  x: number;                       // 画布X坐标（画布坐标系，非屏幕坐标），必填
  y: number;                       // 画布Y坐标（画布坐标系，非屏幕坐标），必填
  width: number;                   // 图片显示宽度（像素），必填
  height: number;                  // 图片显示高度（像素），必填
  prompt?: string;                 // 生成该图片时使用的提示词，可选
}
```

**字段说明：**

- `id`: 图片唯一标识，建议使用时间戳或UUID
- `url`: 图片的完整URL地址
- `x`: 图片在画布上的X坐标（画布坐标系）
  - 这是**画布坐标系**的坐标，不是屏幕坐标
  - 画布坐标系是固定的，不受缩放和平移影响
  - 例如：`300` 表示距离画布原点右侧300像素
- `y`: 图片在画布上的Y坐标（画布坐标系）
  - 同样使用画布坐标系
  - 例如：`200` 表示距离画布原点下方200像素
- `width`: 图片的显示宽度（像素）
  - 这是图片在画布上的实际显示宽度
  - 例如：`400` 表示图片宽度为400像素
- `height`: 图片的显示高度（像素）
  - 这是图片在画布上的实际显示高度
  - 例如：`300` 表示图片高度为300像素
- `prompt`: 生成该图片时使用的提示词
  - 用于记录图片的生成来源
  - 可能包含AI优化后的提示词

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
- 前端会根据 `zoom` 和 `pan` 值计算图片的实际屏幕位置：
  ```
  屏幕X = 画布X * zoom + pan.x
  屏幕Y = 画布Y * zoom + pan.y
  ```

---

### 5. 用户设置（UserSettings）

记录用户选择的模型、尺寸等配置信息。

```typescript
interface UserSettings {
  model: ImageModel;               // 当前选择的模型，必填
  aspectRatio: string;             // 当前选择的尺寸/比例，必填
  workMode: string;                 // 工作模式，必填，默认：'text-to-image'
  chatPanelWidth: number;          // 聊天面板宽度（百分比），必填，范围：20-60，默认：30
}

// 支持的模型类型
type ImageModel = 
  | 'gpt-image-1.5'                    // GPT-Image 模型
  | 'gemini-3-pro-image-preview-2k'    // Nano Banana Pro 模型
  | 'doubao-seedream-4-5-251128';      // 即梦模型

// 支持的尺寸/比例（根据模型不同而不同）
// GPT-Image 模型支持：'2:3' | '3:2' | '1:1'
// Nano Banana Pro 模型支持：'1x1' | '2x3' | '3x2' | '3x4' | '4x3' | '4x5' | '5x4' | '9x16' | '16x9' | '21x9'
// 即梦模型支持：'1K' | '2K' | '4K'
```

**字段说明：**

- `model`: 当前选择的图片生成模型
  - `gpt-image-1.5`: GPT-Image 模型
  - `gemini-3-pro-image-preview-2k`: Nano Banana Pro 模型
  - `doubao-seedream-4-5-251128`: 即梦模型
- `aspectRatio`: 当前选择的尺寸/比例
  - **GPT-Image 模型**支持：`'2:3'`、`'3:2'`、`'1:1'`
  - **Nano Banana Pro 模型**支持：`'1x1'`、`'2x3'`、`'3x2'`、`'3x4'`、`'4x3'`、`'4x5'`、`'5x4'`、`'9x16'`、`'16x9'`、`'21x9'`
  - **即梦模型**支持：`'1K'`、`'2K'`、`'4K'`
- `workMode`: 工作模式
  - 当前仅支持：`'text-to-image'`（文生图）
  - 默认值：`'text-to-image'`
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
  "canvasImages": [],
  "canvasView": {
    "zoom": 1.0,
    "pan": {
      "x": 0,
      "y": 0
    }
  },
  "settings": {
    "model": "gpt-image-1.5",
    "aspectRatio": "1:1",
    "workMode": "text-to-image",
    "chatPanelWidth": 30
  }
}
```

### 示例 2：包含完整数据的会话

```json
{
  "id": "session-002",
  "title": "橘猫阳光场景生成",
  "userId": "user-123",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "messages": [
    {
      "id": "msg-001",
      "type": "user",
      "content": "生成一只橘猫在阳光下的场景",
      "timestamp": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "msg-002",
      "type": "system",
      "content": "生成中...",
      "timestamp": "2024-01-15T10:00:05.000Z",
      "status": "designing",
      "designThoughts": [
        "图片理解：一只橘猫在阳光下",
        "画面比例：1:1"
      ],
      "resultSummary": "已完成图片生成，输出比例为1:1。",
      "image": "https://example.com/images/cat-001.png"
    }
  ],
  "canvasImages": [
    {
      "id": "img-001",
      "url": "https://example.com/images/cat-001.png",
      "x": 300,
      "y": 200,
      "width": 400,
      "height": 400,
      "prompt": "一只橘猫在阳光下"
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
    "model": "gpt-image-1.5",
    "aspectRatio": "1:1",
    "workMode": "text-to-image",
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
    "model": "gpt-image-1.5",
    "aspectRatio": "1:1",
    "workMode": "text-to-image",
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
    "canvasImages": [],
    "canvasView": {
      "zoom": 1.0,
      "pan": {
        "x": 0,
        "y": 0
      }
    },
    "settings": {
      "model": "gpt-image-1.5",
      "aspectRatio": "1:1",
      "workMode": "text-to-image",
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

**响应：**

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "session-001",
        "title": "橘猫阳光场景生成",
        "messageCount": 4,
        "imageCount": 2,
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
    "title": "橘猫阳光场景生成",
    "userId": "user-123",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "messages": [...],
    "canvasImages": [...],
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
  "canvasImages": [...],
  "canvasView": {
    "zoom": 1.5,
    "pan": {
      "x": 100,
      "y": 50
    }
  },
  "settings": {
    "model": "gemini-3-pro-image-preview-2k",
    "aspectRatio": "16:9",
    "workMode": "text-to-image",
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
| canvas_view | JSON | 画布视图状态（zoom, pan） | NOT NULL |
| settings | JSON | 用户设置（model, aspectRatio等） | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |
| updated_at | TIMESTAMP | 更新时间 | NOT NULL |

#### 2. messages 表（消息表）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | VARCHAR(64) | 消息ID | PRIMARY KEY |
| session_id | VARCHAR(64) | 会话ID | NOT NULL, INDEX, FOREIGN KEY |
| type | VARCHAR(20) | 消息类型（user/system） | NOT NULL |
| content | TEXT | 消息内容 | NOT NULL |
| image | VARCHAR(512) | 图片URL | |
| status | VARCHAR(20) | 消息状态 | |
| design_thoughts | JSON | 设计思路数组 | |
| result_summary | TEXT | 结果摘要 | |
| timestamp | TIMESTAMP | 消息时间戳 | NOT NULL |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |

#### 3. canvas_images 表（画布图片表）

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | VARCHAR(64) | 图片ID | PRIMARY KEY |
| session_id | VARCHAR(64) | 会话ID | NOT NULL, INDEX, FOREIGN KEY |
| url | VARCHAR(512) | 图片URL | NOT NULL |
| x | DECIMAL(10,2) | 画布X坐标 | NOT NULL |
| y | DECIMAL(10,2) | 画布Y坐标 | NOT NULL |
| width | INT | 图片宽度（像素） | NOT NULL |
| height | INT | 图片高度（像素） | NOT NULL |
| prompt | TEXT | 生成提示词 | |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |
| updated_at | TIMESTAMP | 更新时间 | NOT NULL |

---

## 重要注意事项

### 1. 画布坐标系说明

- **画布坐标系**是固定的，不受用户缩放和平移影响
- `CanvasImage` 中的 `x` 和 `y` 使用画布坐标系
- `CanvasView` 中的 `pan.x` 和 `pan.y` 是屏幕坐标系的偏移量
- 前端会根据 `zoom` 和 `pan` 计算屏幕显示位置：
  ```
  屏幕X = 画布X * zoom + pan.x
  屏幕Y = 画布Y * zoom + pan.y
  ```

### 2. 数据同步策略

- 建议使用**增量更新**策略，只同步变更的数据
- 画布图片的移动、删除操作需要实时同步
- 画布视图状态（zoom、pan）可以**防抖更新**，避免频繁请求
- 聊天消息在生成完成后同步

### 3. 数据验证

- `zoom` 值必须在 `0.25` 到 `2.0` 之间
- `chatPanelWidth` 值必须在 `20` 到 `60` 之间
- `aspectRatio` 必须与 `model` 匹配（参考 `UserSettings` 说明）
- `CanvasImage` 的 `x`、`y`、`width`、`height` 必须为有效数字

### 4. 性能优化建议

- 会话列表接口只返回基础信息，不包含完整的 `messages` 和 `canvasImages`
- 使用分页加载，避免一次性加载大量数据
- 图片URL建议使用CDN加速
- 考虑使用缓存策略，减少数据库查询

---

## 更新日志

- **2024-01-15**: 初始版本，包含所有基础数据结构定义

---

## 联系方式

如有疑问，请联系前端开发团队。
