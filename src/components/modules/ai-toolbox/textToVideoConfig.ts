/**
 * Text-to-Video Configuration
 * 文生视频页面配置数据
 */

import { type VideoModel, type VideoSeconds, type VideoSize } from '@/services/videoGenerationApi';

// 模型配置接口
export interface VideoModelConfig {
  id: VideoModel;
  label: string;
  seconds: VideoSeconds[];
  sizes: VideoSize[];
  defaultSeconds: VideoSeconds;
  defaultSize: VideoSize;
}

// 模型配置映射
export const VIDEO_MODEL_CONFIGS: Record<VideoModel, Omit<VideoModelConfig, 'id'>> = {
  'OS': {
    label: 'Sora 2',
    seconds: ['4', '8', '12'],
    sizes: ['16:9', '9:16'],
    defaultSeconds: '8',
    defaultSize: '16:9', // 默认 16:9，对应 720p (1280x720)
  },
  'Kling': {
    label: 'Kling',
    seconds: ['5', '10'],
    sizes: ['16:9', '9:16', '1:1'],
    defaultSeconds: '5',
    defaultSize: '16:9', // 默认 16:9，对应 720p (1280x720)
  },
};

// 获取模型列表
export function getVideoModelList(): Array<{ id: VideoModel; label: string }> {
  return Object.entries(VIDEO_MODEL_CONFIGS).map(([id, config]) => ({
    id: id as VideoModel,
    label: config.label,
  }));
}

// 获取模型的时长选项
export function getModelSeconds(model: VideoModel): VideoSeconds[] {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    console.error(`Model config not found for: ${model}, using default 'OS'`);
    return VIDEO_MODEL_CONFIGS['OS'].seconds;
  }
  return config.seconds;
}

// 获取模型的尺寸选项
export function getModelSizes(model: VideoModel): VideoSize[] {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    console.error(`Model config not found for: ${model}, using default 'OS'`);
    return VIDEO_MODEL_CONFIGS['OS'].sizes;
  }
  return config.sizes;
}

// 获取模型的默认时长
export function getModelDefaultSeconds(model: VideoModel): VideoSeconds {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    console.error(`Model config not found for: ${model}, using default 'OS'`);
    return VIDEO_MODEL_CONFIGS['OS'].defaultSeconds;
  }
  return config.defaultSeconds;
}

// 获取模型的默认尺寸
export function getModelDefaultSize(model: VideoModel): VideoSize {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    console.error(`Model config not found for: ${model}, using default 'OS'`);
    return VIDEO_MODEL_CONFIGS['OS'].defaultSize;
  }
  return config.defaultSize;
}

// 检查时长是否属于指定模型
export function isValidSecondsForModel(model: VideoModel, seconds: string): boolean {
  const validSeconds = getModelSeconds(model);
  return validSeconds.includes(seconds as VideoSeconds);
}

// 检查尺寸是否属于指定模型
export function isValidSizeForModel(model: VideoModel, size: string): boolean {
  const validSizes = getModelSizes(model);
  return validSizes.includes(size as VideoSize);
}

// 默认模型
export const DEFAULT_VIDEO_MODEL: VideoModel = 'OS';
