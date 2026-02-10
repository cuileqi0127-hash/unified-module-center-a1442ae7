/**
 * Text-to-Video Configuration
 * 文生视频页面配置数据（Sora 2 / 海螺 / 可灵 / 即梦 / Vidu）
 */

import {
  type VideoModel,
  type VideoSeconds,
  type VideoSize,
  type VideoResolution,
} from '@/services/videoGenerationApi';

// 模型配置接口
export interface VideoModelConfig {
  id: VideoModel;
  label: string;
  seconds: VideoSeconds[];
  sizes: VideoSize[];
  defaultSeconds: VideoSeconds;
  defaultSize: VideoSize;
  resolutions: VideoResolution[];
  defaultResolution: VideoResolution;
  defaultModelVersion: string;
  supportsEnhanceSwitch: boolean;
}

// 模型配置映射（与产品规格表一致）
export const VIDEO_MODEL_CONFIGS: Record<VideoModel, Omit<VideoModelConfig, 'id'>> = {
  OS: {
    label: 'Sora 2',
    seconds: ['4', '8', '12'],
    sizes: ['16:9', '9:16'],
    defaultSeconds: '8',
    defaultSize: '16:9',
    resolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    defaultModelVersion: '2.0',
    supportsEnhanceSwitch: true,
  },
  Hailuo: {
    label: '海螺',
    seconds: ['6', '8'],
    sizes: ['16:9', '9:16'],
    defaultSeconds: '6',
    defaultSize: '16:9',
    resolutions: ['768P', '1080P'],
    defaultResolution: '768P',
    defaultModelVersion: '2.3',
    supportsEnhanceSwitch: true,
  },
  Kling: {
    label: '可灵',
    seconds: ['5', '10'],
    sizes: ['16:9', '9:16', '1:1'],
    defaultSeconds: '5',
    defaultSize: '16:9',
    resolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    defaultModelVersion: '2.5',
    supportsEnhanceSwitch: true,
  },
  Jimeng: {
    label: '即梦',
    seconds: ['10'],
    sizes: ['16:9'], // 表格仅支持 16:9
    defaultSeconds: '10',
    defaultSize: '16:9',
    resolutions: ['1080P'],
    defaultResolution: '1080P',
    defaultModelVersion: '3.0pro',
    supportsEnhanceSwitch: true,
  },
  Vidu: {
    label: 'Vidu',
    seconds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    sizes: ['16:9', '9:16', '4:3', '3:4', '1:1'],
    defaultSeconds: '5',
    defaultSize: '16:9',
    resolutions: ['720P', '1080P'],
    defaultResolution: '720P',
    defaultModelVersion: 'q2-turbo',
    supportsEnhanceSwitch: true,
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
    return VIDEO_MODEL_CONFIGS['OS'].seconds;
  }
  return config.seconds;
}

// 获取模型的尺寸选项
export function getModelSizes(model: VideoModel): VideoSize[] {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    return VIDEO_MODEL_CONFIGS['OS'].sizes;
  }
  return config.sizes;
}

// 获取模型的默认时长
export function getModelDefaultSeconds(model: VideoModel): VideoSeconds {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    return VIDEO_MODEL_CONFIGS['OS'].defaultSeconds;
  }
  return config.defaultSeconds;
}

// 获取模型的默认尺寸
export function getModelDefaultSize(model: VideoModel): VideoSize {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    return VIDEO_MODEL_CONFIGS['OS'].defaultSize;
  }
  return config.defaultSize;
}

// 获取模型的分辨率选项
export function getModelResolutions(model: VideoModel): VideoResolution[] {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    return VIDEO_MODEL_CONFIGS['OS'].resolutions;
  }
  return config.resolutions;
}

// 获取模型的默认分辨率
export function getModelDefaultResolution(model: VideoModel): VideoResolution {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    return VIDEO_MODEL_CONFIGS['OS'].defaultResolution;
  }
  return config.defaultResolution;
}

// 获取模型的默认版本（提交接口用）
export function getModelVersion(model: VideoModel): string {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) {
    return VIDEO_MODEL_CONFIGS['OS'].defaultModelVersion;
  }
  return config.defaultModelVersion;
}

// 是否支持增强开关
export function modelSupportsEnhanceSwitch(model: VideoModel): boolean {
  const config = VIDEO_MODEL_CONFIGS[model];
  if (!config) return false;
  return config.supportsEnhanceSwitch;
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

// 检查分辨率是否属于指定模型
export function isValidResolutionForModel(model: VideoModel, resolution: string): boolean {
  const valid = getModelResolutions(model);
  return valid.includes(resolution as VideoResolution);
}

// 默认模型
export const DEFAULT_VIDEO_MODEL: VideoModel = 'OS';
