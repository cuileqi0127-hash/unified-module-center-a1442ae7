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

// 会话信息
export interface Session {
  id: number;
  createUserString?: string;
  createTime?: string;
  disabled?: boolean;
  updateUserString?: string;
  updateTime?: string;
  title: string;
  taskType: TaskType;
  settings: SessionSettings;
  canvasView: CanvasView;
  messageCount?: number; // 消息数量（如果后端返回）
}

// 会话详情（包含关联数据）
export interface SessionDetail extends Session {
  messages?: MessageDetail[];
  generations?: GenerationDetail[];
  assets?: AssetDetail[];
  canvasItems?: CanvasItemDetail[];
}

// 消息详情
export interface MessageDetail {
  id: number;
  createUserString?: string;
  createTime?: string;
  disabled?: boolean;
  updateUserString?: string;
  updateTime?: string;
  sessionId: number;
  type: 'system' | 'user' | 'assistant';
  content: string;
  status?: 'complete' | 'processing' | 'failed';
  resultSummary?: string;
  generationId?: number;
  assetId?: number;
}

// 生成详情
export interface GenerationDetail {
  id: number;
  createUserString?: string;
  createTime?: string;
  disabled?: boolean;
  updateUserString?: string;
  updateTime?: string;
  sessionId: number;
  model: string;
  size?: string;
  prompt: string;
  refOssKeys?: string[];
  status: 'success' | 'failed' | 'processing';
}

// 资产详情
export interface AssetDetail {
  id: number;
  createUserString?: string;
  createTime?: string;
  disabled?: boolean;
  updateUserString?: string;
  updateTime?: string;
  sessionId: number;
  generationId?: number;
  type: 'image' | 'video';
  role: 'result' | 'reference';
  ossKey: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  seq?: number;
}

// 画布元素详情
export interface CanvasItemDetail {
  id: number;
  createUserString?: string;
  createTime?: string;
  disabled?: boolean;
  updateUserString?: string;
  updateTime?: string;
  sessionId: number;
  assetId: number;
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
 * 生成成功后新增消息并保存生成结果
 */
export async function saveGenerationResult(
  sessionId: number,
  request: SaveGenerationResultRequest
): Promise<ApiResponse<SaveGenerationResultResponse>> {
  return await apiPost<SaveGenerationResultResponse>(
    `/tools/gen/sessions/${sessionId}/messages`,
    request
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
 * 更新会话标题/设置/视图
 */
export async function updateSession(
  sessionId: number,
  request: UpdateSessionRequest
): Promise<ApiResponse<null>> {
  return await apiPatch<null>(`/tools/gen/sessions/${sessionId}`, request);
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
 * 移动/缩放画布元素
 */
export async function updateCanvasItem(
  canvasItemId: number,
  request: UpdateCanvasItemRequest
): Promise<ApiResponse<null>> {
  return await apiPatch<null>(`/tools/gen/canvas-items/${canvasItemId}`, request);
}
