/**
 * Text-to-Image Configuration
 * 文生图页面配置数据
 * 
 * 将枚举数据和配置数据与视图层分离，便于维护
 */

import { type ImageModel } from '@/services/imageGenerationApi';
import i18n from '@/i18n';

// 尺寸选项接口
export interface SizeOption {
  id: string;
  label: string;
}

// 质量选项接口（与 SizeOption 结构一致便于复用 UI）
export interface QualityOption {
  id: string;
  label: string;
}

// 风格选项接口
export interface StyleOption {
  id: string;
  label: string;
}

// 模型配置接口
export interface ModelConfig {
  id: ImageModel;
  label: string;
  sizes: SizeOption[];
  defaultSize: string;
  qualities?: QualityOption[];
  defaultQuality?: string;
  styles?: StyleOption[]; // 风格：gpt、gemini 为 vivid/natural；即梦、可灵无
  defaultStyle?: string;
  /** 一起生图时最多支持的参考图数量，0 表示不支持上传参考图 */
  maxImages?: number;
}

// 工作模式配置
export interface WorkModeConfig {
  id: string;
  label: string; // 支持国际化，通过函数传入
}

// 模型配置映射
export const MODEL_CONFIGS: Record<ImageModel, Omit<ModelConfig, 'id'>> = {
  'gemini-3-pro-image-preview-hd': {
    label: 'Nano Banana 2',
    maxImages: 2,
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
    qualities: [
      { id: '1k', label: '1K' },
      { id: '2k', label: '2K' },
      { id: '4k', label: '4K' },
    ],
    defaultQuality: '2k',
  },
  'gpt-image-1.5': {
    label: 'GPT-Image',
    maxImages: 0,
    sizes: [
      { id: '2:3', label: '2:3' },
      { id: '3:2', label: '3:2' },
      { id: '1:1', label: '1:1' },
    ],
    defaultSize: '1:1',
    qualities: [
      { id: 'standard', label: 'Standard' },
      { id: 'hd', label: 'HD' },
    ],
    defaultQuality: 'standard',
    styles: [
      { id: 'vivid', label: 'Vivid' },
      { id: 'natural', label: 'Natural' },
    ],
    defaultStyle: 'vivid',
  },
  'doubao-seedream-4-5-251128': {
    label: '即梦',
    maxImages: 1,
    sizes: [
      // { id: '1024x1024', label: '1K' },
      { id: '2048x2048', label: '2K' },
      { id: '4096x4096', label: '4K' },
    ],
    defaultSize: '2048x2048',
  },
  // 'kling-v1-5': {
  //   label: '可灵',
  //   sizes: [
  //     { id: '1:1', label: '1:1' },
  //     { id: '2:3', label: '2:3' },
  //     { id: '3:2', label: '3:2' },
  //     { id: '3:4', label: '3:4' },
  //     { id: '4:3', label: '4:3' },
  //     { id: '4:5', label: '4:5' },
  //     { id: '5:4', label: '5:4' },
  //     { id: '9:16', label: '9:16' },
  //     { id: '16:9', label: '16:9' },
  //   ],
  //   defaultSize: '1:1',
  // },
};

// 默认模型配置（用于其他未定义的模型）
export const DEFAULT_MODEL_CONFIG: Omit<ModelConfig, 'id'> = {
  label: 'Unknown',
  maxImages: 0,
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

// 获取模型的质量选项（无则返回空数组）
export function getModelQualityOptions(model: ImageModel): QualityOption[] {
  const config = getModelConfig(model);
  return config.qualities ?? [];
}

// 获取模型默认质量（无则返回 null）
export function getModelDefaultQuality(model: ImageModel): string | null {
  const config = getModelConfig(model);
  return config.defaultQuality ?? null;
}

// 获取模型的风格选项（无则返回空数组）
export function getModelStyleOptions(model: ImageModel): StyleOption[] {
  const config = getModelConfig(model);
  return config.styles ?? [];
}

// 获取模型默认风格（无则返回 null）
export function getModelDefaultStyle(model: ImageModel): string | null {
  const config = getModelConfig(model);
  return config.defaultStyle ?? null;
}

/** 获取模型一起生图时最多支持的参考图数量，未配置时返回 0 */
export function getModelMaxImages(model: ImageModel): number {
  const config = getModelConfig(model);
  return config.maxImages ?? 0;
}

// 工作模式配置（支持国际化）
export function getWorkModes(): WorkModeConfig[] {
  return [{ id: 'text-to-image', label: i18n.t('textToImage.title') }];
}

// 默认模型
export const DEFAULT_MODEL: ImageModel = 'gemini-3-pro-image-preview-hd';

// 默认尺寸（会根据模型自动调整）
export const DEFAULT_SIZE = '1:1';

/** 文生图单次生成数量可选值：1、2、3、4 张 */
export const OUTPUT_NUMBER_OPTIONS = [1, 2, 3, 4] as const;
export type OutputNumberOption = (typeof OUTPUT_NUMBER_OPTIONS)[number];
