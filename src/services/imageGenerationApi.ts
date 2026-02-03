/**
 * Image Generation API Service
 * 图片生成 API 服务
 * 
 * 提供高可用、可维护、可扩展的图片生成接口封装
 */

import { apiPost, type ApiResponse } from './apiClient';

// 根据环境选择 API 地址：开发环境和生产环境都使用相对路径，通过 Nginx 代理
const API_BASE_URL = '/api/tu-zi/v1';
const API_KEY = 'sk-5ZmMmOyDZ8uyPjCHe8yFlrhwQwYUpGb8M0wrTOdonYe8GpMr';

// 支持的模型类型
export type ImageModel = 'gpt-image-1.5' | 'gemini-3-pro-image-preview-hd' | 'doubao-seedream-4-5-251128' | 'kling-v1-5';

// 支持的图片尺寸（标准比例）
export type ImageSize = '1:1' | '16:9' | '9:16' | '4:3' | '2:3' | '3:2';

// 质量选项：gpt 为 standard/hd；gemini/即梦/可灵 为 1k/2k/4k
export type ImageQuality = 'standard' | 'hd' | '1k' | '2k' | '4k';

// 风格选项：仅 gpt 为 vivid/natural；gemini/即梦/可灵无此参数
export type ImageStyle = 'vivid' | 'natural';

// 即梦模型固定参数（表格：不显示，固定值）
const DEFAULT_DOUBAO_NEGATIVE_PROMPT = '丑陋,模糊,卡通,平面,比例失调,多余的手指,黑白';
const DOUBAO_STEPS = 50;
const DOUBAO_CFG_SCALE = 10;

// 可灵模型固定参数（表格：不显示，固定值）
const DEFAULT_KLING_NEGATIVE_PROMPT = '丑陋,模糊,卡通,平面,比例失调,多余的手指,黑白';
const KLING_STEPS = 30;
const KLING_CFG_SCALE = 10;

// Gemini 模型支持的尺寸（API 格式：1x1, 2x3 等，含 21x9）
export type GeminiImageSize = '1x1' | '2x3' | '3x2' | '3x4' | '4x3' | '4x5' | '5x4' | '9x16' | '16x9' | '21x9';

// 可灵 尺寸为 aspect_ratio（1:1、2:3 等）
export type AspectRatioSize = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9';

// 可灵 aspect_ratio：冒号格式（UI）→ API 格式（1x1、2x3）
const ASPECT_RATIO_TO_API: Record<string, string> = {
  '1:1': '1:1', '2:3': '2:3', '3:2': '3:2', '3:4': '3:4', '4:3': '4:3',
  '4:5': '4:5', '5:4': '5:4', '9:16': '9:16', '16:9': '16:9',
};

// 即梦 尺寸为 size（1024x1024、2048x2048、4096x4096）
export type DoubaoSize = '1024x1024' | '2048x2048' | '4096x4096';

// 所有可能的尺寸类型
export type AllImageSize = ImageSize | GeminiImageSize | AspectRatioSize | DoubaoSize;

// 请求参数接口
export interface ImageGenerationRequest {
  model: ImageModel;
  prompt: string;
  image?: string[]; // 参考图 URL 数组
  n?: number; // 生成图片数量，默认 1
  size?: AllImageSize; // 图片尺寸（根据模型不同，支持不同的尺寸格式）
  quality?: ImageQuality; // 质量：gpt/gemini 传 quality；即梦/可灵 无此参数
  style?: ImageStyle; // 风格：仅 gpt 为 vivid/natural；gemini/即梦/可灵无
  response_format?: 'url' | 'b64_json'; // 响应格式，默认 url
  // 即梦/可灵专用（不显示在 UI，固定值）
  negative_prompt?: string;
  steps?: number;
  cfg_scale?: number;
}

// GPT-Image 模型响应接口
export interface GPTImageResponse {
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
  created: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    [key: string]: any;
  };
}

// Gemini 模型响应接口
export interface GeminiImageResponse {
  data: Array<{
    url: string;
  }>;
  created: number;
}

// 统一响应接口
export type ImageGenerationResponse = GPTImageResponse | GeminiImageResponse;

// 错误响应接口
export interface ApiError {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * 将 size 转换为 API 需要的格式
 * - gpt-image-1.5: 1:1/2:3/3:2 → 1x1, 2x3, 3x2
 * - gemini: 1x1…21x9 直接使用
 * - 即梦: size 为 1K/2K/4k，在请求体中单独处理
 * - 可灵: 1:1…16:9（UI）→ 1x1…16x9（aspect_ratio）
 */
export function mapSizeToApiFormat(model: ImageModel, size: AllImageSize): string {
  if (model === 'kling-v1-5') {
    return ASPECT_RATIO_TO_API[size as string] ?? (size as string);
  }
  if (model === 'gemini-3-pro-image-preview-hd') {
    return size as string;
  }
  if (model === 'gpt-image-1.5') {
    const gptSizeMap: Record<string, string> = {
      '2:3': '2x3', '3:2': '3x2', '1:1': '1x1',
    };
    return gptSizeMap[size] || '1x1';
  }
  const apiSizeMap: Record<string, string> = {
    '1:1': '1x1', '16:9': '16x9', '9:16': '9x16', '4:3': '4x3',
  };
  return apiSizeMap[size] || '1x1';
}

/**
 * 生成图片
 * 
 * @param params 生成参数
 * @returns Promise<ImageGenerationResponse>
 * @throws {Error} 当请求失败时抛出错误
 */
export async function generateImage(
  params: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const {
    model,
    prompt,
    image = [],
    n = 1,
    size = '1:1',
    quality,
    style,
    response_format = 'url',
  } = params;

  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    image,
    n,
    response_format,
  };

  // 即梦：尺寸字段为 size（1024x1024、2048x2048、4096x4096），无 quality；可灵：aspect_ratio，无 quality；均传 watermark: false
  if (model === 'doubao-seedream-4-5-251128') {
    requestBody.size = size; // 1024x1024、2048x2048、4096x4096
    requestBody.negative_prompt = params.negative_prompt ?? DEFAULT_DOUBAO_NEGATIVE_PROMPT;
    requestBody.steps = params.steps ?? DOUBAO_STEPS;
    requestBody.cfg_scale = params.cfg_scale ?? DOUBAO_CFG_SCALE;
    requestBody.watermark = false;
  } else if (model === 'kling-v1-5') {
    requestBody.aspect_ratio = mapSizeToApiFormat(model, size);
    requestBody.negative_prompt = params.negative_prompt ?? DEFAULT_KLING_NEGATIVE_PROMPT;
    requestBody.steps = params.steps ?? KLING_STEPS;
    requestBody.cfg_scale = params.cfg_scale ?? KLING_CFG_SCALE;
    requestBody.watermark = false;
  } else {
    requestBody.size = mapSizeToApiFormat(model, size);
  }

  if (model === 'gpt-image-1.5') {
    requestBody.quality = quality || 'standard';
    requestBody.style = style || 'vivid';
  }
  if (model === 'gemini-3-pro-image-preview-hd') {
    requestBody.quality = quality || '2k';
  }

  try {
    const response = await apiPost<ImageGenerationResponse>('/images/generations', requestBody, {
      baseURL: API_BASE_URL,
      useAuth: false, // 图片生成接口使用 API Key 认证，不使用用户 token
      parseJson: true,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
    });
    console.log(response,'response')
    // 验证响应数据
    const data = response as ImageGenerationResponse;
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Invalid response: missing image data');
    }

    return data;
  } catch (error) {
    // 处理网络错误或其他异常
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred during image generation');
  }
}

/**
 * 从响应中提取图片 URL
 * 
 * @param response API 响应
 * @returns 图片 URL 数组
 */
export function extractImageUrls(response: ImageGenerationResponse): string[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }
  
  return response.data
    .map(item => item.url)
    .filter((url): url is string => Boolean(url));
}

/**
 * 从响应中提取修订后的提示词（如果存在）
 * 
 * @param response API 响应
 * @returns 修订后的提示词，如果不存在则返回 null
 */
export function extractRevisedPrompt(response: ImageGenerationResponse): string | null {
  if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
    return null;
  }
  
  const firstItem = response.data[0];
  if ('revised_prompt' in firstItem && firstItem.revised_prompt) {
    return firstItem.revised_prompt;
  }
  
  return null;
}
