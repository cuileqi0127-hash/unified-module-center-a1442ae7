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
  'sora-2': {
    label: 'Sora 2',
    seconds: ['10', '15'],
    sizes: ['1280x720', '720x1280'],
    defaultSeconds: '15',
    defaultSize: '1280x720',
  },
  'sora-2-pro': {
    label: 'Sora 2 Pro',
    seconds: ['10', '15', '25'],
    sizes: ['1280x720', '720x1280', '1024x1792', '1792x1024'],
    defaultSeconds: '15',
    defaultSize: '1280x720',
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
  return config.seconds;
}

// 获取模型的尺寸选项
export function getModelSizes(model: VideoModel): VideoSize[] {
  const config = VIDEO_MODEL_CONFIGS[model];
  return config.sizes;
}

// 获取模型的默认时长
export function getModelDefaultSeconds(model: VideoModel): VideoSeconds {
  const config = VIDEO_MODEL_CONFIGS[model];
  return config.defaultSeconds;
}

// 获取模型的默认尺寸
export function getModelDefaultSize(model: VideoModel): VideoSize {
  const config = VIDEO_MODEL_CONFIGS[model];
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
export const DEFAULT_VIDEO_MODEL: VideoModel = 'sora-2';
