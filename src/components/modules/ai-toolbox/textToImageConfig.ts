/**
 * Text-to-Image Configuration
 * 文生图页面配置数据
 * 
 * 将枚举数据和配置数据与视图层分离，便于维护
 */

import { type ImageModel } from '@/services/imageGenerationApi';

// 尺寸选项接口
export interface SizeOption {
  id: string;
  label: string;
}

// 模型配置接口
export interface ModelConfig {
  id: ImageModel;
  label: string;
  sizes: SizeOption[];
  defaultSize: string;
}

// 工作模式配置
export interface WorkModeConfig {
  id: string;
  label: string; // 支持国际化，通过函数传入
}

// 模型配置映射
export const MODEL_CONFIGS: Record<ImageModel, Omit<ModelConfig, 'id'>> = {
  'gpt-image-1.5': {
    label: 'GPT',
    sizes: [
      { id: '2:3', label: '2:3' },
      { id: '3:2', label: '3:2' },
      { id: '1:1', label: '1:1' },
    ],
    defaultSize: '1:1',
  },
  'gemini-3-pro-image-preview-2k': {
    label: 'Gemini 3',
    sizes: [
      { id: '1x1', label: '1x1' },
      { id: '2x3', label: '2x3' },
      { id: '3x2', label: '3x2' },
      { id: '3x4', label: '3x4' },
      { id: '4x3', label: '4x3' },
      { id: '4x5', label: '4x5' },
      { id: '5x4', label: '5x4' },
      { id: '9x16', label: '9x16' },
      { id: '16x9', label: '16x9' },
      { id: '21x9', label: '21x9' },
    ],
    defaultSize: '1x1',
  },
  'doubao-seedream-4-0-250828': {
    label: '即梦',
    sizes: [
      { id: '1K', label: '1K' },
      { id: '2K', label: '2K' },
      { id: '4K', label: '4K' },
    ],
    defaultSize: '2K',
  },
};

// 默认模型配置（用于其他未定义的模型）
export const DEFAULT_MODEL_CONFIG: Omit<ModelConfig, 'id'> = {
  label: 'Unknown',
  sizes: [
    { id: '1:1', label: '1:1' },
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
    { id: '4:3', label: '4:3' },
  ],
  defaultSize: '1:1',
};

// 获取模型配置
export function getModelConfig(model: ImageModel): Omit<ModelConfig, 'id'> {
  return MODEL_CONFIGS[model] || DEFAULT_MODEL_CONFIG;
}

// 获取模型列表
export function getModelList(): Array<{ id: ImageModel; label: string }> {
  return Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
    id: id as ImageModel,
    label: config.label,
  }));
}

// 获取模型的尺寸选项
export function getModelSizes(model: ImageModel): SizeOption[] {
  const config = getModelConfig(model);
  return config.sizes;
}

// 获取模型的默认尺寸
export function getModelDefaultSize(model: ImageModel): string {
  const config = getModelConfig(model);
  return config.defaultSize;
}

// 检查尺寸是否属于指定模型
export function isValidSizeForModel(model: ImageModel, size: string): boolean {
  const sizes = getModelSizes(model);
  return sizes.some(s => s.id === size);
}

// 工作模式配置（支持国际化）
export function getWorkModes(isZh: boolean): WorkModeConfig[] {
  return [
    { id: 'text-to-image', label: isZh ? '文生图' : 'Text to Image' },
  ];
}

// 默认模型
export const DEFAULT_MODEL: ImageModel = 'gpt-image-1.5';

// 默认尺寸（会根据模型自动调整）
export const DEFAULT_SIZE = '1:1';
