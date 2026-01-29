/**
 * Image Generation API Service
 * 图片生成 API 服务
 * 
 * 提供高可用、可维护、可扩展的图片生成接口封装
 */

// 根据环境选择 API 地址：开发环境和生产环境都使用相对路径，通过 Nginx 代理
const API_BASE_URL = '/api/tu-zi/v1';
const API_KEY = 'sk-5ZmMmOyDZ8uyPjCHe8yFlrhwQwYUpGb8M0wrTOdonYe8GpMr';

// 支持的模型类型
export type ImageModel = 'gpt-image-1.5' | 'gemini-3-pro-image-preview-2k' | 'doubao-seedream-4-0-250828';

// 支持的图片尺寸（标准比例）
export type ImageSize = '1:1' | '16:9' | '9:16' | '4:3' | '2:3' | '3:2';

// 即梦模型支持的尺寸
export type SeedreamImageSize = '1K' | '2K' | '4K';

// Gemini 模型支持的尺寸（使用 API 格式：1x1, 2x3, 3x2 等）
export type GeminiImageSize = '1x1' | '2x3' | '3x2' | '3x4' | '4x3' | '4x5' | '5x4' | '9x16' | '16x9' | '21x9';

// 所有可能的尺寸类型
export type AllImageSize = ImageSize | SeedreamImageSize | GeminiImageSize;

// 请求参数接口
export interface ImageGenerationRequest {
  model: ImageModel;
  prompt: string;
  image?: string[]; // 参考图 URL 数组
  n?: number; // 生成图片数量，默认 1
  size?: AllImageSize; // 图片尺寸（根据模型不同，支持不同的尺寸格式）
  response_format?: 'url' | 'b64_json'; // 响应格式，默认 url
}

// GPT 模型响应接口
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
 * 根据模型类型返回不同的格式：
 * - gpt-image-1.5: 2x3, 3x2, 1x1
 * - gemini-3-pro-image-preview-2k: 1x1, 2x3, 3x2, 3x4, 4x3, 4x5, 5x4, 9x16, 16x9, 21x9（直接使用，已是 API 格式）
 * - 即梦模型: 1K, 2K, 4K
 */
export function mapSizeToApiFormat(model: ImageModel, size: AllImageSize): string {
  // 即梦模型使用原始值（1K, 2K, 4K）
  if (model === 'doubao-seedream-4-0-250828') {
    return size as string; // 直接返回 1K, 2K, 4K
  }
  
  // Gemini 模型使用原始值（已经是 API 格式：1x1, 2x3, 3x2 等）
  if (model === 'gemini-3-pro-image-preview-2k') {
    return size as string; // 直接返回 1x1, 2x3, 3x2 等
  }
  
  // gpt-image-1.5 模型使用 2x3, 3x2, 1x1
  if (model === 'gpt-image-1.5') {
    const gptSizeMap: Record<string, string> = {
      '2:3': '2x3',
      '3:2': '3x2',
      '1:1': '1x1',
    };
    return gptSizeMap[size] || '1x1';
  }
  
  // 其他标准模型转换为 API 格式（1x1, 16x9, 9x16, 4x3）
  const apiSizeMap: Record<string, string> = {
    '1:1': '1x1',
    '16:9': '16x9',
    '9:16': '9x16',
    '4:3': '4x3',
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
    response_format = 'url',
  } = params;

  // 构建请求体
  const requestBody = {
    model,
    prompt,
    image,
    n,
    size: mapSizeToApiFormat(model, size),
    response_format,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // 检查响应状态
    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // 如果无法解析错误响应，使用默认错误消息
      }
      
      throw new Error(errorMessage);
    }

    // 解析响应
    const data: ImageGenerationResponse = await response.json();
    
    // 验证响应数据
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
