/**
 * Generation Session API Service
 * 生成会话数据存储 API 服务
 * 
 * 提供文生图、文生视频的统一数据存储接口封装
 */

import { apiGet, apiPost, apiPatch, apiDelete, type ApiResponse, type PaginatedResponse } from './apiClient';

// 根据环境变量判断使用代理还是直接访问
// 生产环境也使用相对路径，通过 Nginx 代理转发
const API_BASE_URL = '/api';

// ==================== 类型定义 ====================

// 任务类型
export type TaskType = 'image' | 'video';

// 会话设置
export interface SessionSettings {
  model: string;
  size?: string;
  [key: string]: any; // 允许其他设置字段
}

// 画布视图
export interface CanvasView {
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
}

// 画布元素
export interface CanvasItem {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  visible?: boolean;
  zindex?: number;
}

// 参考图
export interface Reference {
  type: 'image' | 'video';
  sourceUrl: string;
  ossKey?: string;
  canvasItem: CanvasItem;
}

// 资产
export interface Asset {
  type: 'image' | 'video';
  sourceUrl: string;
  seq?: number;
  ossKey?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
}

// 生成信息
export interface Generation {
  model: string;
  size?: string;
  prompt: string;
  status: 'success' | 'failed' | 'processing';
  [key: string]: any; // 允许其他字段
}

// 消息
export interface Message {
  type: 'system' | 'user' | 'assistant';
  content: string;
  status?: 'complete' | 'processing' | 'failed';
  resultSummary?: string;
}

// 导出统一的 API 响应格式和分页响应类型
export type { ApiResponse, PaginatedResponse };

// 会话信息（接口返回 id 可能为字符串大数）
export interface Session {
  id: string | number;
  createUserString?: string | null;
  createTime?: string | null;
  disabled?: boolean;
  updateUserString?: string | null;
  updateTime?: string | null;
  title: string;
  taskType: TaskType;
  settings: SessionSettings;
  canvasView: CanvasView;
  taskInfo?: TaskInfoItem[];
  assetCount?: number;
}

// 会话详情中的任务信息项
export interface TaskInfoItem {
  taskId?: string;
  messageId?: string;
  prompt?: string;
  model?: string;
  seconds?: string;
  size?: string;
  status?: string;
  createdAt?: number;
}

// 会话详情（包含关联数据）
export interface SessionDetail extends Session {
  messages?: MessageDetail[];
  generations?: GenerationDetail[];
  assets?: AssetDetail[];
  canvasItems?: CanvasItemDetail[];
}

// 消息详情（接口返回 id/sessionId/generationId/assetId 可能为字符串）
export interface MessageDetail {
  id: string | number;
  createUserString?: string | null;
  createTime?: string | null;
  disabled?: boolean;
  updateUserString?: string | null;
  updateTime?: string | null;
  sessionId: string | number;
  type: 'system' | 'user' | 'assistant';
  content: string;
  status?: 'complete' | 'processing' | 'failed' | 'completed' | 'queued';
  resultSummary?: string | null;
  generationId?: string | number | null;
  assetId?: string | number | null;
}

/**
 * 查询会话详情接口 generations[].status 枚举
 * - queued: 已入队
 * - processing: 处理中
 * - completed: 已完成
 * - failed: 已失败
 */
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'success';

// 生成详情（提交记录）；status 为 queued/processing 时需轮询 /tasks/{id}
export interface GenerationDetail {
  id: string | number;
  createUserString?: string | null;
  createTime?: string | null;
  disabled?: boolean;
  updateUserString?: string | null;
  updateTime?: string | null;
  sessionId: string | number;
  model: string;
  size?: string | null;
  prompt: string;
  refOssKeys?: string[] | null;
  /** 状态：queued=已入队, processing=处理中, completed=已完成, failed=已失败 */
  status: GenerationStatus;
  taskMode?: string | null;
  provider?: string | null;
  internalTaskId?: string | null;
  thirdTaskId?: string | null;
  progress?: number | null;
  failCode?: number | null;
  failMessage?: string | null;
  completedTime?: string | null;
}

// 资产详情（接口返回 id/sessionId/generationId 可能为字符串）
export interface AssetDetail {
  id: string | number;
  createUserString?: string | null;
  createTime?: string | null;
  disabled?: boolean;
  updateUserString?: string | null;
  updateTime?: string | null;
  sessionId: string | number;
  generationId?: string | number | null;
  type: 'image' | 'video';
  role: 'result' | 'reference';
  ossKey: string;
  downloadUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fps?: number | null;
  seq?: number;
}

// 画布元素详情（接口返回 id/sessionId/assetId 可能为字符串）
export interface CanvasItemDetail {
  id: string | number;
  createUserString?: string | null;
  createTime?: string | null;
  disabled?: boolean;
  updateUserString?: string | null;
  updateTime?: string | null;
  sessionId: string | number;
  assetId: string | number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  visible?: boolean;
  zindex?: number;
}

// 创建会话请求
export interface CreateSessionRequest {
  title: string;
  taskType: TaskType;
  settings: SessionSettings;
  canvasView: CanvasView;
}

// 更新会话请求
export interface UpdateSessionRequest {
  title?: string;
  taskType?: TaskType;
  settings?: SessionSettings;
  canvasView?: CanvasView;
}

// 保存参考图请求
export interface SaveReferenceRequest {
  reference: Reference;
}

// 保存参考图响应
export interface SaveReferenceResponse {
  assetId: number;
  canvasItemId: number;
  ossKey: string;
  downloadUrl: string;
}

// 生成结果落库请求
export interface SaveGenerationResultRequest {
  generation: Generation;
  asset: Asset;
  message: Message;
  canvasItem: CanvasItem;
  references?: Reference[];
}

// 生成结果落库响应
export interface SaveGenerationResultResponse {
  generationId: number;
  assetId: number;
  messageId: number;
  canvasItemId: number;
  ossKey: string;
  downloadUrl: string;
}

// 提交文生图任务请求（与画布会话接口公用 base 与 token）
export interface SubmitImageTaskRequest {
  model: string;
  prompt: string;
  sourceImages?: string[];
  size: string;
  quality?: string;
  style?: string;
  n?: number;
  canvasItem: CanvasItem;
}

// 提交文生图任务响应
export interface SubmitImageTaskResponse {
  generationId: number;
  internalTaskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  assetId?: number;
  messageId?: number;
  canvasItemId?: number;
  downloadUrl?: string;
  failCode?: number;
  failMessage?: string;
}

// 提交文生视频任务请求（与画布会话接口公用 base 与 token）
export interface SubmitVideoTaskRequest {
  modelName: string;
  modelVersion?: number | string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  /** 分辨率：768P / 1080P */
  resolution?: string;
  /** 是否增强（仅部分模型支持） */
  enhanceSwitch?: boolean;
  sourceImages?: string[];
  canvasItem: CanvasItem;
}

// 提交文生视频任务响应
export interface SubmitVideoTaskResponse {
  generationId: number;
  internalTaskId: string;
  thirdTaskId: string;
  status: 'queued' | 'processing' | 'completed';
}

// 查询任务状态响应
export interface GetTaskStatusResponse {
  sessionId: number;
  generationId: number;
  taskMode: string;
  internalTaskId: string;
  thirdTaskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  failCode?: number;
  failMessage?: string;
  assetId?: number;
  messageId?: number;
  canvasItemId?: number;
  downloadUrl?: string;
}

// 更新画布元素请求
export interface UpdateCanvasItemRequest {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotate?: number;
  visible?: boolean;
  zindex?: number;
}

// ==================== API 函数 ====================

/**
 * 1. 分页查询会话
 * 分页查询当前用户的生成会话
 */
export async function getSessions(
  taskType: TaskType,
  page: number = 1,
  size: number = 10
): Promise<ApiResponse<PaginatedResponse<Session>>> {
  const params = new URLSearchParams({
    taskType,
    page: page.toString(),
    size: size.toString(),
  });

  return await apiGet<PaginatedResponse<Session>>(
    `/tools/gen/sessions?${params.toString()}`
  );
}

/**
 * 2. 创建会话
 * 创建生成会话
 */
export async function createSession(
  request: CreateSessionRequest
): Promise<ApiResponse<Session>> {
  return await apiPost<Session>('/tools/gen/sessions', request);
}

/**
 * 3. 保存参考图画布
 * 保存参考图资产与画布元素
 */
export async function saveReference(
  sessionId: number,
  request: SaveReferenceRequest
): Promise<ApiResponse<SaveReferenceResponse>> {
  return await apiPost<SaveReferenceResponse>(
    `/tools/gen/sessions/${sessionId}/references`,
    request
  );
}

/**
 * 4. 生成结果落库
 * 生成成功后新增消息并保存生成结果。会话 id 支持字符串（与接口一致）。
 */
export async function saveGenerationResult(
  sessionId: string | number,
  request: SaveGenerationResultRequest
): Promise<ApiResponse<SaveGenerationResultResponse>> {
  return await apiPost<SaveGenerationResultResponse>(
    `/tools/gen/sessions/${String(sessionId)}/messages`,
    request
  );
}

/**
 * 4.1 提交文生图任务
 * 后端发起文生图/图生图并同步落库，与画布会话接口公用 base 与 token
 */
export async function submitImageTask(
  sessionId: string | number,
  request: SubmitImageTaskRequest
): Promise<ApiResponse<SubmitImageTaskResponse>> {
  return await apiPost<SubmitImageTaskResponse>(
    `/tools/gen/sessions/${String(sessionId)}/image-tasks`,
    request
  );
}

/**
 * 4.2 提交文生视频任务
 * 后端发起文生视频/图生视频并异步处理，与画布会话接口公用 base 与 token。会话 id 支持字符串。
 */
export async function submitVideoTask(
  sessionId: string | number,
  request: SubmitVideoTaskRequest
): Promise<ApiResponse<SubmitVideoTaskResponse>> {
  return await apiPost<SubmitVideoTaskResponse>(
    `/tools/gen/sessions/${String(sessionId)}/video-tasks`,
    request
  );
}

/**
 * 4.3 查询任务状态
 * 查询会话下任务状态与落库结果。会话 id、任务 id 均为字符串原样传递。
 */
export async function getTaskStatus(
  sessionId: string | number,
  taskId: string
): Promise<ApiResponse<GetTaskStatusResponse>> {
  return await apiGet<GetTaskStatusResponse>(
    `/tools/gen/sessions/${String(sessionId)}/tasks/${taskId}`
  );
}

/**
 * 5. 查询会话详情
 * 查询会话内全部内容
 */
export async function getSessionDetail(
  sessionId: string
): Promise<ApiResponse<SessionDetail>> {
  return await apiGet<SessionDetail>(`/tools/gen/sessions/${sessionId}`);
}

/**
 * 6. 更新会话
 * 更新会话标题/设置/视图。会话 id 支持字符串（与接口一致）。
 */
export async function updateSession(
  sessionId: string | number,
  request: UpdateSessionRequest
): Promise<ApiResponse<null>> {
  return await apiPatch<null>(`/tools/gen/sessions/${String(sessionId)}`, request);
}

/**
 * 7. 删除画布元素
 * 删除画布元素并级联删除结果
 */
export async function deleteCanvasItem(
  canvasItemId: number
): Promise<ApiResponse<null>> {
  return await apiDelete<null>(`/tools/gen/canvas-items/${canvasItemId}`);
}

/**
 * 9. 批量删除画布元素
 * 批量删除画布元素并级联删除结果
 * 注意：根据 API 文档，此接口使用 DELETE 方法，body 为数组
 */
export async function batchDeleteCanvasItems(
  canvasItemIds: number[]
): Promise<ApiResponse<null>> {
  return await apiDelete<null>('/tools/gen/canvas-items', canvasItemIds);
}

/**
 * 8. 更新画布元素
 * 移动/缩放/放大缩小画布元素。画布元素 id 支持字符串（与接口一致）。
 */
export async function updateCanvasItem(
  canvasItemId: string | number,
  request: UpdateCanvasItemRequest
): Promise<ApiResponse<null>> {
  return await apiPatch<null>(`/tools/gen/canvas-items/${String(canvasItemId)}`, request);
}
