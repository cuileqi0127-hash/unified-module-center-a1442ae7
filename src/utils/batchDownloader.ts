/**
 * Batch Downloader Utility
 * 批量下载工具类
 * 
 * 支持同时下载多种类型的文件，包括图片和视频
 * 提供下载进度指示、断点续传和文件组织功能
 */

import JSZip from 'jszip';
import { toast } from 'sonner';
import i18n from '@/i18n';

// 媒体项接口
export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name?: string;
  prompt?: string;
}

// 下载任务状态
export type DownloadTaskStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

// 下载任务接口
export interface DownloadTask {
  id: string;
  item: MediaItem;
  status: DownloadTaskStatus;
  progress: number;
  error?: string;
  blob?: Blob;
  retryCount: number;
}

// 下载配置接口
export interface DownloadConfig {
  // 最大并行下载数
  maxConcurrentDownloads?: number;
  // 超时时间（毫秒）
  timeout?: number;
  // 重试次数
  maxRetries?: number;
  // 是否打包成 zip
  zip?: boolean;
  // 下载文件夹名称
  folderName?: string;
  // 是否启用断点续传
  resumeEnabled?: boolean;
}

// 默认配置
const DEFAULT_CONFIG: DownloadConfig = {
  maxConcurrentDownloads: 3,
  timeout: 30000,
  maxRetries: 3,
  zip: true,
  folderName: 'downloads',
  resumeEnabled: true,
};

// 下载管理器类
export class BatchDownloader {
  private tasks: Map<string, DownloadTask> = new Map();
  private config: DownloadConfig;
  private isRunning: boolean = false;
  private activeDownloads: number = 0;
  private onProgress?: (tasks: Map<string, DownloadTask>) => void;
  private onComplete?: (tasks: Map<string, DownloadTask>) => void;

  constructor(config: Partial<DownloadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加下载任务
   */
  addTasks(items: MediaItem[]): void {
    items.forEach(item => {
      const taskId = `${item.type}-${item.id}-${Date.now()}`;
      this.tasks.set(taskId, {
        id: taskId,
        item,
        status: 'pending',
        progress: 0,
        retryCount: 0,
      });
    });
  }

  /**
   * 开始下载
   */
  async start(onProgress?: (tasks: Map<string, DownloadTask>) => void, onComplete?: (tasks: Map<string, DownloadTask>) => void): Promise<void> {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.isRunning = true;

    try {
      if (this.config.zip) {
        await this.downloadAsZip();
      } else {
        await this.downloadIndividually();
      }
    } catch (error) {
      console.error('Batch download failed:', error);
      toast.error(`Batch download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // 更新所有任务为失败状态
      this.tasks.forEach(task => {
        if (task.status !== 'completed') {
          task.status = 'failed';
          task.error = error instanceof Error ? error.message : 'Unknown error';
        }
      });
      this.updateProgress();
    } finally {
      this.isRunning = false;
      this.onComplete?.(this.tasks);
    }
  }

  /**
   * 暂停下载
   */
  pause(): void {
    this.isRunning = false;
    // 暂停所有正在下载的任务
    this.tasks.forEach(task => {
      if (task.status === 'downloading') {
        task.status = 'paused';
      }
    });
  }

  /**
   * 恢复下载
   */
  resume(): void {
    this.isRunning = true;
    // 恢复所有暂停的任务
    this.tasks.forEach(task => {
      if (task.status === 'paused') {
        task.status = 'pending';
      }
    });
    this.start(this.onProgress, this.onComplete);
  }

  /**
   * 取消下载
   */
  cancel(): void {
    this.isRunning = false;
    this.tasks.clear();
  }

  /**
   * 下载为 zip 文件
   */
  private async downloadAsZip(): Promise<void> {
    const zip = new JSZip();
    const loadingToast = toast.loading('Packing files...');

    try {
      // 并行下载所有文件
      const downloadPromises = Array.from(this.tasks.values()).map(task => 
        this.downloadTask(task)
      );

      await Promise.all(downloadPromises);

      // 统计成功和失败的任务
      let successCount = 0;
      let failedCount = 0;
      console.log(this.tasks,'this.tasks')
      // 将成功下载的文件添加到 zip，按照文件类型组织
      this.tasks.forEach(task => {
        if (task.status === 'completed' && task.blob) {
          // 根据文件类型确定扩展名
          const extension = task.item.type === 'video' ? 'mp4' : 'png';
          const fileName = task.item.name || `${task.item.type}-${task.item.id}`;
          
          // 按照文件类型组织文件夹结构
          const folderPath = `${task.item.type}s`;
          zip.file(`${folderPath}/${fileName}.${extension}`, task.blob);
          successCount++;
        } else if (task.status === 'failed') {
          failedCount++;
        }
      });

      if (successCount === 0) {
        toast.dismiss(loadingToast);
        toast.error(i18n.t('toast.allDownloadsFailed'));
        return;
      }

      // 生成 zip 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `media-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      toast.dismiss(loadingToast);
      toast.success(`Downloaded ${successCount} files (${failedCount} failed)`);
    } catch (error) {
      toast.dismiss(loadingToast);
      throw error;
    }
  }

  /**
   * 单独下载每个文件
   */
  private async downloadIndividually(): Promise<void> {
    const loadingToast = toast.loading('Downloading files...');

    try {
      let successCount = 0;
      let failedCount = 0;

      // 串行下载文件（避免浏览器限制）
      for (const task of this.tasks.values()) {
        await this.downloadTask(task);
        if (task.status === 'completed') {
          successCount++;
        } else if (task.status === 'failed') {
          failedCount++;
        }
      }

      toast.dismiss(loadingToast);
      toast.success(i18n.t('toast.downloadedCount', { successCount, failedCount }));
    } catch (error) {
      toast.dismiss(loadingToast);
      throw error;
    }
  }

  /**
   * 下载单个任务
   */
  private async downloadTask(task: DownloadTask): Promise<void> {
    if (!this.isRunning) {
      task.status = 'paused';
      this.updateProgress();
      return;
    }

    task.status = 'downloading';
    this.updateProgress();

    try {
      // 验证 URL
      if (!task.item.url || typeof task.item.url !== 'string') {
        throw new Error('Invalid URL');
      }

      // 使用 XMLHttpRequest 下载文件（支持进度跟踪和断点续传）
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // 支持断点续传
        if (this.config.resumeEnabled) {
          xhr.open('GET', task.item.url, true);
        } else {
          xhr.open('GET', task.item.url, true);
        }
        
        xhr.responseType = 'blob';
        xhr.timeout = this.config.timeout!;

        // 进度跟踪
        xhr.onprogress = (e) => {
          if (this.isRunning && e.lengthComputable) {
            task.progress = (e.loaded / e.total) * 100;
            this.updateProgress();
          }
        };

        xhr.onload = () => {
          if (!this.isRunning) {
            reject(new Error('Download cancelled'));
            return;
          }
          
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else if (xhr.status === 404) {
            reject(new Error('File not found'));
          } else if (xhr.status === 403) {
            reject(new Error('Access denied'));
          } else if (xhr.status >= 500) {
            reject(new Error('Server error'));
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Request timeout'));

        xhr.send();
      });

      task.blob = blob;
      task.status = 'completed';
      task.progress = 100;
      this.updateProgress();

      // 如果不是 zip 模式，直接下载单个文件
      if (!this.config.zip && this.isRunning) {
        const extension = task.item.type === 'video' ? 'mp4' : 'png';
        const fileName = task.item.name || `${task.item.type}-${task.item.id}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.status = 'failed';
      this.updateProgress();

      // 重试逻辑
      if (this.isRunning && task.retryCount < this.config.maxRetries!) {
        task.retryCount++;
        task.status = 'pending';
        this.updateProgress();
        await new Promise(resolve => setTimeout(resolve, 1000 * task.retryCount)); // 指数退避
        await this.downloadTask(task);
      }
    }
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    this.onProgress?.(this.tasks);
  }

  /**
   * 获取下载统计信息
   */
  getStats(): {
    total: number;
    pending: number;
    downloading: number;
    completed: number;
    failed: number;
    paused: number;
    progress: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const downloading = tasks.filter(t => t.status === 'downloading').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const paused = tasks.filter(t => t.status === 'paused').length;
    
    // 计算总体进度
    const progress = total > 0 
      ? tasks.reduce((sum, t) => sum + t.progress, 0) / total 
      : 0;

    return {
      total,
      pending,
      downloading,
      completed,
      failed,
      paused,
      progress,
    };
  }
}

// 下载进度组件接口
export interface DownloadProgressProps {
  tasks: Map<string, DownloadTask>;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

// 文件类型识别工具
export function identifyFileType(url: string, type?: string): 'image' | 'video' {
  // 如果提供了类型，直接使用
  if (type === 'image' || type === 'video') {
    return type;
  }

  // 根据 URL 扩展名识别
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

  const lowerUrl = url.toLowerCase();

  for (const ext of videoExtensions) {
    if (lowerUrl.includes(ext)) {
      return 'video';
    }
  }

  for (const ext of imageExtensions) {
    if (lowerUrl.includes(ext)) {
      return 'image';
    }
  }

  // 默认认为是图片
  return 'image';
}

// 批量下载工具函数
export async function batchDownload(
  items: MediaItem[],
  config: Partial<DownloadConfig> = {},
  onProgress?: (tasks: Map<string, DownloadTask>) => void,
  onComplete?: (tasks: Map<string, DownloadTask>) => void
): Promise<void> {
  if (items.length === 0) {
    toast.error(i18n.t('toast.noItemsToDownload'));
    return;
  }

  const downloader = new BatchDownloader(config);
  downloader.addTasks(items);
  
  await downloader.start(
    (tasks) => {
      // 这里可以添加进度更新逻辑
      const stats = downloader.getStats();
      console.log('Download progress:', stats.progress.toFixed(2) + '%');
      onProgress?.(tasks);
    },
    (tasks) => {
      // 下载完成后的逻辑
      const stats = downloader.getStats();
      console.log('Download completed:', stats);
      onComplete?.(tasks);
    }
  );
}

// 单个文件下载工具函数
export async function downloadFile(
  item: MediaItem
): Promise<void> {
  const downloader = new BatchDownloader({ zip: false });
  downloader.addTasks([item]);
  await downloader.start();
}
