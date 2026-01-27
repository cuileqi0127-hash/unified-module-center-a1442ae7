/**
 * Text-to-Video Business Logic Hook
 * 文生视频业务逻辑层
 * 
 * 将业务逻辑与视图层分离，便于维护和测试
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
  createVideoTask,
  pollTaskStatus,
  type VideoModel,
  type VideoTaskResponse
} from '@/services/videoGenerationApi';
import {
  getSessions,
  createSession,
  saveGenerationResult,
  updateSession,
  updateCanvasItem,
  batchDeleteCanvasItems,
  getSessionDetail,
  type Session,
  type SessionDetail,
} from '@/services/generationSessionApi';
import { debounce } from '@/utils/debounce';
import { findNonOverlappingPosition } from './canvasUtils';
import {
  getVideoModelList,
  getModelSeconds,
  getModelSizes,
  getModelDefaultSeconds,
  getModelDefaultSize,
  isValidSecondsForModel,
  isValidSizeForModel,
  DEFAULT_VIDEO_MODEL,
} from './textToVideoConfig';
import { type SelectedImage } from './ImageCapsule';

// 类型定义
export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  video?: string;
  timestamp: Date;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  designThoughts?: string[];
  resultSummary?: string;
}

// 使用统一的媒体项类型（支持图片和视频）
export interface CanvasVideo {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
  taskId?: string;
  type?: 'image' | 'video' | 'placeholder'; // 媒体类型
  progress?: number; // 占位符进度 0-100
  status?: 'queued' | 'processing' | 'completed' | 'failed'; // 占位符状态
}

// 任务队列项
interface VideoTaskQueueItem {
  taskId: string;
  messageId: string;
  prompt: string;
  model: VideoModel;
  seconds: string;
  size: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: number;
  referenceFile?: File | string;
}

// 缓存键
const TASK_QUEUE_CACHE_KEY = 'video_task_queue';

const mockHistory: ChatMessage[] = [];
const initialCanvasVideos: CanvasVideo[] = [];

// 任务队列缓存管理函数
function getTaskQueue(): VideoTaskQueueItem[] {
  try {
    const cached = localStorage.getItem(TASK_QUEUE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Failed to get task queue from cache:', error);
  }
  return [];
}

function saveTaskQueue(queue: VideoTaskQueueItem[]): void {
  try {
    localStorage.setItem(TASK_QUEUE_CACHE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save task queue to cache:', error);
  }
}

function addTaskToQueue(task: VideoTaskQueueItem): void {
  const queue = getTaskQueue();
  queue.push(task);
  saveTaskQueue(queue);
}

function removeTaskFromQueue(taskId: string): void {
  const queue = getTaskQueue();
  const filtered = queue.filter(t => t.taskId !== taskId);
  saveTaskQueue(filtered);
}

function updateTaskInQueue(taskId: string, updates: Partial<VideoTaskQueueItem>): void {
  const queue = getTaskQueue();
  const index = queue.findIndex(t => t.taskId === taskId);
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    saveTaskQueue(queue);
  }
}

export function useTextToVideo() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const isResizingRef = useRef<boolean>(false);
  const handleResizeMoveRef = useRef<(e: MouseEvent) => void>();
  const handleResizeEndRef = useRef<() => void>();

  // State
  const [prompt, setPrompt] = useState('');
  const [workMode, setWorkMode] = useState('text-to-video');
  const [showHistory, setShowHistory] = useState(false);
  const [model, setModel] = useState<VideoModel>(DEFAULT_VIDEO_MODEL);
  const [seconds, setSeconds] = useState<string>(getModelDefaultSeconds(DEFAULT_VIDEO_MODEL));
  const [size, setSize] = useState<string>(getModelDefaultSize(DEFAULT_VIDEO_MODEL));
  const [messages, setMessages] = useState<ChatMessage[]>(mockHistory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasVideos, setCanvasVideos] = useState<CanvasVideo[]>(initialCanvasVideos);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(new Set());
  const [addingVideoIds, setAddingVideoIds] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedVideo, setCopiedVideo] = useState<CanvasVideo | null>(null);
  const [highlightedVideoId, setHighlightedVideoId] = useState<string | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [taskPlaceholders, setTaskPlaceholders] = useState<CanvasVideo[]>([]);
  
  // 会话管理状态
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [historySessions, setHistorySessions] = useState<Array<{ id: string; title: string; timestamp: Date; messageCount: number }>>([]);
  const [canvasView, setCanvasView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  
  // 画布元素ID映射（用于更新数据库）
  const canvasItemIdMap = useRef<Map<string, number>>(new Map());

  // 任务队列相关 refs
  const activePollingTasksRef = useRef<Map<string, { cancel: () => void }>>(new Map());
  const isProcessingQueueRef = useRef(false);
  const updatePlaceholdersFromQueueRef = useRef<() => void>();
  const processTaskQueueRef = useRef<() => void>();

  // 配置数据
  const models = getVideoModelList();
  const secondsOptions = getModelSeconds(model);
  const sizesOptions = getModelSizes(model);

  // 判断URL是否为视频
  const isVideoUrl = useCallback((url: string): boolean => {
    return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(url) || url.includes('video');
  }, []);

  // 工具函数：获取图片尺寸（用于上传图片到画布）
  const getImageDimensions = useCallback(async (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxSize = 400;
        let displayWidth = img.naturalWidth;
        let displayHeight = img.naturalHeight;
        
        if (displayWidth > maxSize || displayHeight > maxSize) {
          const scale = Math.min(maxSize / displayWidth, maxSize / displayHeight);
          displayWidth = displayWidth * scale;
          displayHeight = displayHeight * scale;
        }
        
        resolve({ width: displayWidth, height: displayHeight });
      };
      img.onerror = () => {
        resolve({ width: 280, height: 280 });
      };
      img.src = url;
    });
  }, []);

  // 工具函数：获取视频尺寸（默认尺寸）
  const getVideoDimensions = useCallback(async (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = () => {
        const maxSize = 400;
        let displayWidth = video.videoWidth;
        let displayHeight = video.videoHeight;
        
        if (displayWidth > maxSize || displayHeight > maxSize) {
          const scale = Math.min(maxSize / displayWidth, maxSize / displayHeight);
          displayWidth = displayWidth * scale;
          displayHeight = displayHeight * scale;
        }
        
        resolve({ width: displayWidth, height: displayHeight });
      };
      video.onerror = () => {
        resolve({ width: 400, height: 300 });
      };
      video.src = url;
    });
  }, []);

  // 清理消息内容
  const cleanMessageContent = useCallback((content: string): string => {
    if (!content) return content;
    return content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
  }, []);

  // 当模型切换时，重置时长和尺寸为对应模型的默认值
  useEffect(() => {
    if (!isValidSecondsForModel(model, seconds)) {
      const defaultSeconds = getModelDefaultSeconds(model);
      setSeconds(defaultSeconds);
    }
    if (!isValidSizeForModel(model, size)) {
      const defaultSize = getModelDefaultSize(model);
      setSize(defaultSize);
    }
  }, [model, seconds, size]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 查询会话列表（历史记录列表）
  const loadSessions = useCallback(async () => {
    try {
      const response = await getSessions('video', 1, 20);
      if (response.success && response.data) {
        // 为每个会话获取消息数量
        const sessionsWithMessageCount = await Promise.all(
          response.data.list.map(async (session: Session) => {
            let messageCount = 0;
            try {
              // 获取会话详情以获取消息数量
              const detailResponse = await getSessionDetail(session.id.toString());
              if (detailResponse.success && detailResponse.data?.messages) {
                messageCount = detailResponse.data.messages.length;
              }
            } catch (error) {
              // 如果获取详情失败，消息数量保持为 0
              console.error(`Failed to get message count for session ${session.id}:`, error);
            }
            
            return {
              id: session.id.toString(),
              title: session.title || (isZh ? '未命名会话' : 'Untitled Session'),
              timestamp: new Date(session.createTime || Date.now()),
              messageCount,
            };
          })
        );
        
        setHistorySessions(sessionsWithMessageCount);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [isZh]);

  // 初始化时加载会话列表
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 防抖更新会话视图
  const debouncedUpdateSession = useRef(
    debounce(async (sessionId: number, zoom: number, pan: { x: number; y: number }) => {
      try {
        await updateSession(sessionId, {
          canvasView: { zoom, pan },
        });
      } catch (error) {
        console.error('Failed to update session view:', error);
      }
    }, 500)
  ).current;

  // 防抖更新画布元素
  const debouncedUpdateCanvasItem = useRef(
    debounce(async (canvasItemId: number, x: number, y: number, width?: number, height?: number) => {
      try {
        await updateCanvasItem(canvasItemId, {
          x,
          y,
          ...(width !== undefined && { width }),
          ...(height !== undefined && { height }),
        });
      } catch (error) {
        console.error('Failed to update canvas item:', error);
      }
    }, 500)
  ).current;

  // 处理画布视图变化
  const handleViewChange = useCallback((zoom: number, pan: { x: number; y: number }) => {
    setCanvasView({ zoom, pan });
    if (currentSessionId) {
      debouncedUpdateSession(currentSessionId, zoom, pan);
    }
  }, [currentSessionId, debouncedUpdateSession]);

  // 从sessionStorage读取转移的图片
  useEffect(() => {
    const transferredData = sessionStorage.getItem('transferredImages');
    if (transferredData) {
      try {
        const transferredImages = JSON.parse(transferredData) as CanvasVideo[];
        if (transferredImages.length > 0) {
          // 异步处理每个图片，获取其尺寸
          Promise.all(
            transferredImages.map(async (img) => {
              const dimensions = await getImageDimensions(img.url);
              return {
                ...img,
                id: `img-${Date.now()}-${Math.random()}`,
                type: 'image' as const,
                x: img.x || (300 + Math.random() * 100),
                y: img.y || (200 + Math.random() * 100),
                width: dimensions.width,
                height: dimensions.height,
              };
            })
          ).then((newVideos) => {
            setCanvasVideos(prev => [...prev, ...newVideos]);
            if (newVideos.length > 0) {
              setSelectedVideoId(newVideos[0].id);
              setSelectedVideoIds(newVideos.map(v => v.id));
            }
            // 清除sessionStorage
            sessionStorage.removeItem('transferredImages');
            toast.success(isZh ? `已接收 ${transferredImages.length} 张图片` : `Received ${transferredImages.length} images`);
          });
        }
      } catch (error) {
        console.error('Failed to parse transferred images:', error);
        sessionStorage.removeItem('transferredImages');
      }
    }
  }, [isZh, getImageDimensions]);

  // 处理新对话
  const handleNewConversation = useCallback(async () => {
    // 先清空聊天栏和画布数据
    setMessages([]);
    setSelectedImages([]);
    setPrompt('');
    setCanvasVideos([]);
    setTaskPlaceholders([]);
    setSelectedVideoId(null);
    setSelectedVideoIds([]);
    setCanvasView({ zoom: 1, pan: { x: 0, y: 0 } });
    canvasItemIdMap.current.clear();
    
    try {
      // 创建新会话
      const response = await createSession({
        title: isZh ? '新会话' : 'New Session',
        taskType: 'video',
        settings: {
          model,
          size,
          seconds,
        },
        canvasView: {
          zoom: 1,
          pan: { x: 0, y: 0 },
        },
      });

      if (response.success && response.data) {
        setCurrentSessionId(response.data.id);
        // 刷新历史记录
        await loadSessions();
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error(isZh ? '创建会话失败' : 'Failed to create session');
    }
  }, [model, size, seconds, isZh, loadSessions]);

  // 处理加载历史会话（获取指定会话的聊天内容和画布内容）
  const handleLoadSession = useCallback(async (sessionId: string) => {
    try {
      // 使用 getSessionDetail 获取指定会话的完整内容（聊天内容和画布内容）
      const response = await getSessionDetail(sessionId);
      
      if (response.success && response.data) {
        const session = response.data;
        setCurrentSessionId(session.id);
        
        // 恢复画布视图（缩放和平移）
        setCanvasView(session.canvasView || { zoom: 1, pan: { x: 0, y: 0 } });
        
        // 恢复画布元素（图片/视频）
        if (session.canvasItems && session.assets) {
          const assetsMap = new Map(session.assets.map(asset => [asset.id, asset]));
          
          const restoredVideos: CanvasVideo[] = session.canvasItems
            .map(item => {
              const asset = assetsMap.get(item.assetId);
              if (!asset) return null;
              
              // 保存画布元素ID映射，用于后续更新
              canvasItemIdMap.current.set(`item-${item.id}`, item.id);
              
              const videoItem: CanvasVideo = {
                id: `item-${item.id}`,
                url: asset.downloadUrl || asset.ossKey || '',
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                type: asset.type === 'video' ? 'video' : 'image',
              };
              
              return videoItem;
            })
            .filter((item): item is CanvasVideo => item !== null);
          
          setCanvasVideos(restoredVideos);
        }
        
        // 恢复聊天内容（用户消息和系统消息）
        if (session.messages) {
          const assetsMap = new Map(session.assets?.map(asset => [asset.id, asset]) || []);
          
          const restoredMessages: ChatMessage[] = session.messages.map(msg => {
            const message: ChatMessage = {
              id: msg.id.toString(),
              type: msg.type === 'user' ? 'user' : 'system',
              content: msg.content,
              timestamp: new Date(msg.createTime || Date.now()),
              status: msg.status === 'complete' ? 'completed' : msg.status === 'processing' ? 'processing' : 'queued',
              resultSummary: msg.resultSummary,
            };
            
            // 如果有关联的资产，恢复视频URL
            if (msg.assetId && assetsMap.has(msg.assetId)) {
              const asset = assetsMap.get(msg.assetId)!;
              if (asset.type === 'video') {
                message.video = asset.downloadUrl || asset.ossKey || '';
              }
            }
            
            return message;
          });
          
          setMessages(restoredMessages);
        }
        
        setShowHistory(false);
        toast.success(isZh ? '会话加载成功' : 'Session loaded');
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error(isZh ? '加载会话失败' : 'Failed to load session');
    }
  }, [isZh]);

  // 处理视频移动
  const handleVideoMove = useCallback((id: string, x: number, y: number) => {
    setCanvasVideos(prev =>
      prev.map(video => {
        if (video.id === id) {
          // 更新数据库
          const canvasItemId = canvasItemIdMap.current.get(id);
          if (canvasItemId) {
            debouncedUpdateCanvasItem(canvasItemId, x, y);
          }
          return { ...video, x, y };
        }
        return video;
      })
    );
  }, [debouncedUpdateCanvasItem]);
  
  // 处理视频尺寸变化
  const handleVideoResize = useCallback((id: string, width: number, height: number) => {
    setCanvasVideos(prev =>
      prev.map(video => {
        if (video.id === id) {
          // 更新数据库
          const canvasItemId = canvasItemIdMap.current.get(id);
          if (canvasItemId) {
            debouncedUpdateCanvasItem(canvasItemId, video.x, video.y, width, height);
          }
          return { ...video, width, height };
        }
        return video;
      })
    );
  }, [debouncedUpdateCanvasItem]);

  // 处理添加选中视频到输入框
  const handleAddSelectedVideo = useCallback((video: CanvasVideo) => {
    const selectedImage: SelectedImage = {
      id: video.id,
      url: video.url,
      prompt: video.prompt,
    };
    
    setSelectedImages(prev => {
      if (prev.some(img => img.id === video.id)) {
        toast.info(isZh ? '该视频已在输入框中' : 'Video already attached');
        return prev;
      }
      return [...prev, selectedImage];
    });
    
    setHighlightedVideoId(video.id);
    toast.success(isZh ? '已添加到输入框' : 'Added to input');
    
    setTimeout(() => {
      setHighlightedVideoId(null);
    }, 600);
  }, [isZh]);

  // 处理移除选中视频
  const handleRemoveSelectedVideo = useCallback((id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // 处理复制视频
  const handleCopyVideo = useCallback((video: CanvasVideo) => {
    setCopiedVideo(video);
    toast.success(isZh ? '已复制到剪贴板，可在新画布粘贴' : 'Copied to clipboard, can paste in new canvas');
  }, [isZh]);

  // 处理粘贴视频
  const handlePasteVideo = useCallback(async () => {
    if (copiedVideo) {
      const isVideo = copiedVideo.type === 'video' || isVideoUrl(copiedVideo.url);
      const dimensions = isVideo 
        ? await getVideoDimensions(copiedVideo.url)
        : await getImageDimensions(copiedVideo.url);
      const newVideo: CanvasVideo = {
        ...copiedVideo,
        id: isVideo ? `video-${Date.now()}` : `img-${Date.now()}`,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 100,
        width: dimensions.width,
        height: dimensions.height,
        type: copiedVideo.type || (isVideo ? 'video' : 'image'),
      };
      setCanvasVideos(prev => [...prev, newVideo]);
      setSelectedVideoId(newVideo.id);
      setCopiedVideo(null);
      toast.success(isZh ? '已粘贴到画布' : 'Pasted to canvas');
    }
  }, [copiedVideo, isZh, getVideoDimensions, getImageDimensions, isVideoUrl]);

  // 处理上传图片到画布
  const handleUploadImage = useCallback(async (file: File) => {
    try {
      // 创建本地URL用于预览
      const imageUrl = URL.createObjectURL(file);
      const dimensions = await getImageDimensions(imageUrl);
      
      // 将图片作为CanvasVideo添加到画布（虽然类型是Video，但可以显示图片）
      const newVideo: CanvasVideo = {
        id: `img-${Date.now()}`,
        url: imageUrl,
        x: 300 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        width: dimensions.width,
        height: dimensions.height,
        prompt: file.name,
        type: 'image',
      };
      
      setCanvasVideos(prev => [...prev, newVideo]);
      setSelectedVideoId(newVideo.id);
      toast.success(isZh ? '图片已添加到画布' : 'Image added to canvas');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(isZh ? '图片上传失败' : 'Image upload failed');
    }
  }, [isZh, getImageDimensions]);

  // 处理键盘快捷键（复制粘贴）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedVideoId) {
        const video = canvasVideos.find(v => v.id === selectedVideoId);
        if (video) handleCopyVideo(video);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedVideo) {
        handlePasteVideo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideoId, canvasVideos, copiedVideo, handleCopyVideo, handlePasteVideo]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const videoData = JSON.parse(data) as SelectedImage;
        handleAddSelectedVideo({
          id: videoData.id,
          url: videoData.url,
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          prompt: videoData.prompt,
        });
      }
    } catch (err) {
      console.error('Failed to parse dropped video data:', err);
    }
  }, [handleAddSelectedVideo]);

  // 处理生成视频
  const handleGenerate = useCallback(async () => {
    if (!currentSessionId || !prompt.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentPrompt = prompt;
    setPrompt('');
    setIsGenerating(true);

    const systemMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'system',
      content: '',
      timestamp: new Date(),
      status: 'queued',
      progress: 0,
    };
    
    setMessages(prev => [...prev, systemMessage]);

    try {
      // 获取参考图片（从画布选中的视频中提取，如果有图片的话）
      let referenceFile: File | string | undefined;
      const selectedCanvasVideoIds = selectedVideoIds.length > 0 
        ? selectedVideoIds 
        : selectedVideoId 
          ? [selectedVideoId] 
          : [];
      
      // 如果有选中的视频，尝试获取第一个作为参考（这里假设视频URL可以作为参考）
      // 实际可能需要根据业务需求调整
      if (selectedCanvasVideoIds.length > 0) {
        const selectedVideo = canvasVideos.find(v => v.id === selectedCanvasVideoIds[0]);
        if (selectedVideo) {
          // 如果URL是图片，可以作为参考
          if (selectedVideo.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            referenceFile = selectedVideo.url;
          }
        }
      }

      // 创建视频生成任务
      const taskResponse = await createVideoTask({
        model: model,
        prompt: currentPrompt,
        seconds: seconds as any,
        size: size as any,
        input_reference: referenceFile ? (typeof referenceFile === 'string' ? [referenceFile] : referenceFile) : undefined,
        watermark: false, // 默认不添加水印
      });

      // 将任务添加到队列
      const queueItem: VideoTaskQueueItem = {
        taskId: taskResponse.id,
        messageId: systemMessage.id,
        prompt: currentPrompt,
        model: model,
        seconds: seconds,
        size: size,
        status: 'queued',
        progress: taskResponse.progress,
        createdAt: Date.now(),
        referenceFile: referenceFile,
      };
      
      addTaskToQueue(queueItem);
      
      // 更新消息状态为排队中
      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id 
            ? { 
                ...msg, 
                status: 'queued',
                content: isZh ? '任务已加入队列...' : 'Task queued...',
                progress: taskResponse.progress,
              }
            : msg
        )
      );
      
      setIsGenerating(false);
      
      // 更新占位符
      updatePlaceholdersFromQueueRef.current?.();
      
      // 触发队列处理
      processTaskQueueRef.current?.();
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(isZh ? `生成失败：${errorMessage}` : `Generation failed: ${errorMessage}`);
      setIsGenerating(false);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id 
            ? { 
                ...msg, 
                status: 'failed',
                content: isZh ? `生成失败：${errorMessage}` : `Generation failed: ${errorMessage}`,
              }
            : msg
        )
      );
    }
  }, [prompt, isGenerating, model, seconds, size, selectedVideoIds, selectedVideoId, canvasVideos, isZh, getVideoDimensions, handleAddSelectedVideo, currentSessionId]);

  // 可取消的轮询函数
  const pollTaskWithCancel = useCallback((
    taskId: string,
    onProgress?: (status: VideoTaskResponse) => void,
    interval: number = 2000,
    maxAttempts: number = 300
  ): { promise: Promise<VideoTaskResponse>; cancel: () => void } => {
    let cancelled = false;
    let attempts = 0;
    
    const cancel = () => {
      cancelled = true;
    };
    
    const promise = (async (): Promise<VideoTaskResponse> => {
      while (attempts < maxAttempts && !cancelled) {
        try {
          const status = await pollTaskStatus(taskId);
          
          if (onProgress) {
            onProgress(status);
          }
          
          if (status.status === 'completed') {
            return status;
          }
          
          if (status.status === 'failed') {
            throw new Error('Video generation failed');
          }
          
          // 等待指定间隔后继续轮询
          await new Promise(resolve => setTimeout(resolve, interval));
          attempts++;
        } catch (error) {
          if (cancelled) {
            throw new Error('Task polling cancelled');
          }
          throw error;
        }
      }
      
      if (cancelled) {
        throw new Error('Task polling cancelled');
      }
      
      throw new Error('Task polling timeout');
    })();
    
    return { promise, cancel };
  }, []);

  // 将任务队列转换为画布占位符
  const updatePlaceholdersFromQueue = useCallback(() => {
    const queue = getTaskQueue();
    // 按照创建时间排序，确保先入先出（FIFO）
    const pendingTasks = queue
      .filter(t => t.status === 'queued' || t.status === 'processing')
      .sort((a, b) => a.createdAt - b.createdAt); // 按创建时间升序排序
    
    // 使用函数式更新获取最新的状态
    setCanvasVideos(currentVideos => {
      setTaskPlaceholders(currentPlaceholders => {
        // 获取现有项目的位置（包括视频和已存在的占位符）
        const existingRects = [
          ...currentVideos.map(v => ({
            x: v.x,
            y: v.y,
            width: v.width,
            height: v.height,
          })),
          // 包含所有已存在的占位符，避免新占位符与它们重叠
          ...currentPlaceholders.map(p => ({
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
          })),
        ];
        
        const placeholders: CanvasVideo[] = [];
        
        // 先处理已存在的占位符，保持其位置
        pendingTasks.forEach((task) => {
          const existingPlaceholder = currentPlaceholders.find(p => p.taskId === task.taskId);
          if (existingPlaceholder) {
            // 如果占位符已存在，保持原位置并更新进度和状态
            placeholders.push({
              ...existingPlaceholder,
              progress: task.progress || 0,
              status: task.status,
            });
          }
        });
        
        // 再处理新占位符，确保不与任何现有项目重叠
        pendingTasks.forEach((task) => {
          // 如果占位符已经处理过（已存在），跳过
          if (placeholders.some(p => p.taskId === task.taskId)) {
            return;
          }
          
          // 计算不重叠的位置（包括已处理的占位符）
          const allExistingRects = [
            ...existingRects,
            ...placeholders.map(p => ({
              x: p.x,
              y: p.y,
              width: p.width,
              height: p.height,
            })),
          ];
          
          const position = findNonOverlappingPosition(
            { width: 400, height: 300 },
            allExistingRects,
            300,
            200,
            50,
            50,
            100,
            30 // 占位符之间的间隔 30 像素
          );
          
          const newPlaceholder: CanvasVideo = {
            id: `placeholder-${task.taskId}`,
            url: '', // 占位符没有URL
            x: position.x,
            y: position.y,
            width: 400,
            height: 300,
            prompt: task.prompt,
            taskId: task.taskId,
            type: 'placeholder' as const,
            progress: task.progress || 0,
            status: task.status,
          };
          
          placeholders.push(newPlaceholder);
        });
        
        setTaskPlaceholders(placeholders);
        return currentPlaceholders; // 返回当前值，避免覆盖
      });
      return currentVideos; // 返回当前值，避免覆盖
    });
  }, []);
  
  // 将函数保存到 ref
  updatePlaceholdersFromQueueRef.current = updatePlaceholdersFromQueue;

  // 处理单个任务
  const processSingleTask = useCallback(async (task: VideoTaskQueueItem) => {
    // 更新任务状态为处理中
    updateTaskInQueue(task.taskId, { status: 'processing' });
    
    setMessages(prev => 
      prev.map(msg => 
        msg.id === task.messageId 
          ? { 
              ...msg, 
              status: 'processing',
              content: isZh ? '视频生成中...' : 'Generating video...',
              progress: task.progress,
            }
          : msg
      )
    );

    try {
      // 开始轮询
      const { promise, cancel } = pollTaskWithCancel(
        task.taskId,
        (status: VideoTaskResponse) => {
          // 更新进度
          updateTaskInQueue(task.taskId, { 
            status: status.status as 'queued' | 'processing' | 'completed' | 'failed',
            progress: status.progress 
          });
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === task.messageId 
                ? { 
                    ...msg, 
                    status: status.status,
                    progress: status.progress,
                    content: isZh 
                      ? `视频生成中... ${status.progress}%` 
                      : `Generating video... ${status.progress}%`,
                  }
                : msg
            )
          );
          
          // 更新占位符进度
          setTaskPlaceholders(prev => 
            prev.map(placeholder => 
              placeholder.taskId === task.taskId
                ? { ...placeholder, progress: status.progress }
                : placeholder
            )
          );
        }
      );
      
      // 保存取消函数
      activePollingTasksRef.current.set(task.taskId, { cancel });
      
      const finalStatus = await promise;
      
      if (!finalStatus.video_url) {
        throw new Error('No video URL in response');
      }

      const videoUrl = finalStatus.video_url;
      const dimensions = await getVideoDimensions(videoUrl);

      // 更新消息为完成状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === task.messageId 
            ? { 
                ...msg, 
                status: 'completed',
                video: videoUrl,
                progress: 100,
                designThoughts: [
                  isZh ? `视频理解：${task.prompt}` : `Video Understanding: ${task.prompt}`,
                  isZh ? `时长：${task.seconds}秒` : `Duration: ${task.seconds}s`,
                  isZh ? `尺寸：${task.size}` : `Size: ${task.size}`,
                ],
                resultSummary: isZh 
                  ? `已完成视频生成，时长为${task.seconds}秒，尺寸为${task.size}。`
                  : `Video generation complete, duration ${task.seconds}s, size ${task.size}.`,
              }
            : msg
        )
      );
      
      // 查找对应的占位符
      let placeholder: CanvasVideo | undefined;
      setTaskPlaceholders(prevPlaceholders => {
        placeholder = prevPlaceholders.find(p => p.taskId === task.taskId);
        // 如果找到占位符，从列表中移除
        if (placeholder) {
          return prevPlaceholders.filter(p => p.taskId !== task.taskId);
        }
        return prevPlaceholders;
      });
      
      if (placeholder) {
        // 如果找到占位符，使用占位符的位置和ID替换为实际视频
        const newVideo: CanvasVideo = {
          id: placeholder.id, // 使用占位符的ID，保持连续性
          url: videoUrl,
          x: placeholder.x, // 使用占位符的位置
          y: placeholder.y,
          width: dimensions.width,
          height: dimensions.height,
          prompt: task.prompt,
          taskId: finalStatus.id,
          type: 'video',
        };
        
        // 添加到视频列表
        setCanvasVideos(prevVideos => [...prevVideos, newVideo]);
        setSelectedVideoId(newVideo.id);
        handleAddSelectedVideo(newVideo);
        
        // 保存生成结果到数据库
        if (currentSessionId) {
          saveGenerationResult(currentSessionId, {
            generation: {
              model: task.model,
              size: task.size,
              prompt: task.prompt,
              status: 'success',
              seconds: task.seconds,
            },
            asset: {
              type: 'video',
              sourceUrl: videoUrl,
              seq: 1,
              width: dimensions.width,
              height: dimensions.height,
              duration: parseInt(task.seconds, 10),
            },
            message: {
              type: 'system',
              content: isZh ? '生成完成' : 'Generation complete',
              status: 'complete',
              resultSummary: isZh 
                ? `已完成视频生成，时长为${task.seconds}秒，尺寸为${task.size}。`
                : `Video generation complete, duration ${task.seconds}s, size ${task.size}.`,
            },
            canvasItem: {
              x: placeholder.x,
              y: placeholder.y,
              width: dimensions.width,
              height: dimensions.height,
              rotate: 0,
              visible: true,
              zindex: canvasVideos.length,
            },
          }).then(saveResponse => {
            if (saveResponse.success && saveResponse.data) {
              // 保存画布元素ID映射
              canvasItemIdMap.current.set(newVideo.id, saveResponse.data.canvasItemId);
            }
          }).catch(error => {
            console.error('Failed to save generation result:', error);
            // 不阻止用户继续使用，只记录错误
          });
        }
      } else {
        // 如果没有找到占位符，使用原来的逻辑（计算不重叠位置）
        setCanvasVideos(prevVideos => {
          const existingRects = [
            ...prevVideos.map(v => ({
              x: v.x,
              y: v.y,
              width: v.width,
              height: v.height,
            })),
            ...taskPlaceholders.map(p => ({
              x: p.x,
              y: p.y,
              width: p.width,
              height: p.height,
            })),
          ];
          const position = findNonOverlappingPosition(
            { width: dimensions.width, height: dimensions.height },
            existingRects,
            300,
            200,
            50,
            50,
            100,
            30 // 视频之间的间隔 30 像素
          );

          const newVideo: CanvasVideo = {
            id: `video-${Date.now()}`,
            url: videoUrl,
            x: position.x,
            y: position.y,
            width: dimensions.width,
            height: dimensions.height,
            prompt: task.prompt,
            taskId: finalStatus.id,
            type: 'video',
          };
          
          setSelectedVideoId(newVideo.id);
          handleAddSelectedVideo(newVideo);
          
          // 保存生成结果到数据库
          if (currentSessionId) {
            saveGenerationResult(currentSessionId, {
              generation: {
                model: task.model,
                size: task.size,
                prompt: task.prompt,
                status: 'success',
                seconds: task.seconds,
              },
              asset: {
                type: 'video',
                sourceUrl: videoUrl,
                seq: 1,
                width: dimensions.width,
                height: dimensions.height,
                duration: parseInt(task.seconds, 10),
              },
              message: {
                type: 'system',
                content: isZh ? '生成完成' : 'Generation complete',
                status: 'complete',
                resultSummary: isZh 
                  ? `已完成视频生成，时长为${task.seconds}秒，尺寸为${task.size}。`
                  : `Video generation complete, duration ${task.seconds}s, size ${task.size}.`,
              },
              canvasItem: {
                x: position.x,
                y: position.y,
                width: dimensions.width,
                height: dimensions.height,
                rotate: 0,
                visible: true,
                zindex: prevVideos.length,
              },
            }).then(async (saveResponse) => {
              if (saveResponse.success && saveResponse.data) {
                // 保存画布元素ID映射
                canvasItemIdMap.current.set(newVideo.id, saveResponse.data.canvasItemId);
                // 刷新历史记录
                await loadSessions();
              }
            }).catch(error => {
              console.error('Failed to save generation result:', error);
            });
          }
          
          return [...prevVideos, newVideo];
        });
      }
      
      // 从队列中移除已完成的任务
      removeTaskFromQueue(task.taskId);
      activePollingTasksRef.current.delete(task.taskId);
      
      // 继续处理下一个任务
      processTaskQueueRef.current?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 如果是取消错误（页面卸载时的正常清理），静默处理，不更新状态
      if (errorMessage === 'Task polling cancelled') {
        // 静默处理取消，不更新任务状态
        activePollingTasksRef.current.delete(task.taskId);
        return;
      }
      
      // 其他错误才需要处理
      console.error('Task processing error:', error);
      
      // 更新消息为失败状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === task.messageId 
            ? { 
                ...msg, 
                status: 'failed',
                content: isZh ? `生成失败：${errorMessage}` : `Generation failed: ${errorMessage}`,
              }
            : msg
        )
      );
      
      // 从队列中移除失败的任务
      removeTaskFromQueue(task.taskId);
      activePollingTasksRef.current.delete(task.taskId);
      
      // 更新占位符（移除失败的）
      updatePlaceholdersFromQueueRef.current?.();
      
      // 继续处理下一个任务
      processTaskQueueRef.current?.();
    }
  }, [isZh, getVideoDimensions, handleAddSelectedVideo, pollTaskWithCancel, loadSessions]);

  // 处理任务队列（最多同时处理3个任务）
  const processTaskQueue = useCallback(() => {
    if (isProcessingQueueRef.current) return;
    
    isProcessingQueueRef.current = true;
    
    const processNext = () => {
      const queue = getTaskQueue();
      const activeCount = activePollingTasksRef.current.size;
      const maxConcurrent = 3;
      
      // 获取待处理的任务（状态为 queued 或 processing）
      // 按照创建时间排序，确保先入先出（FIFO）
      const pendingTasks = queue
        .filter(
          t => t.status === 'queued' || (t.status === 'processing' && !activePollingTasksRef.current.has(t.taskId))
        )
        .sort((a, b) => a.createdAt - b.createdAt); // 按创建时间升序排序
      
      // 如果还有空位且有待处理任务，开始处理最早的任务
      if (activeCount < maxConcurrent && pendingTasks.length > 0) {
        const nextTask = pendingTasks[0];
        // 更新任务状态为 processing
        updateTaskInQueue(nextTask.taskId, { status: 'processing' });
        processSingleTask(nextTask).finally(() => {
          isProcessingQueueRef.current = false;
          // 延迟一点再检查，避免频繁调用
          setTimeout(() => {
            processTaskQueue();
          }, 100);
        });
      } else {
        isProcessingQueueRef.current = false;
      }
    };
    
    processNext();
  }, [processSingleTask]);
  
  // 将函数保存到 ref
  processTaskQueueRef.current = processTaskQueue;

  // 页面初始化时恢复任务队列处理
  useEffect(() => {
    const queue = getTaskQueue();
    if (queue.length > 0) {
      // 恢复队列中的任务到消息列表（如果消息不存在）
      queue.forEach(task => {
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === task.messageId);
          if (!exists) {
            return [...prev, {
              id: task.messageId,
              type: 'system' as const,
              content: task.status === 'completed' 
                ? (isZh ? '视频生成完成' : 'Video generation complete')
                : task.status === 'failed'
                ? (isZh ? '生成失败' : 'Generation failed')
                : task.status === 'processing'
                ? (isZh ? '视频生成中...' : 'Generating video...')
                : (isZh ? '任务已加入队列...' : 'Task queued...'),
              timestamp: new Date(task.createdAt),
              status: task.status,
              progress: task.progress,
            }];
          }
          return prev;
        });
      });
      
      // 更新占位符
      updatePlaceholdersFromQueueRef.current?.();
      
      // 开始处理队列
      processTaskQueueRef.current?.();
    }
    
    // 清理函数：页面卸载时停止所有轮询
    return () => {
      // 取消所有正在进行的轮询
      activePollingTasksRef.current.forEach(({ cancel }) => {
        cancel();
      });
      activePollingTasksRef.current.clear();
      isProcessingQueueRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 监听任务队列变化，更新占位符
  useEffect(() => {
    // 立即更新一次
    updatePlaceholdersFromQueue();
    
    const interval = setInterval(() => {
      updatePlaceholdersFromQueue();
    }, 1000); // 每秒更新一次占位符
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时设置定时器

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  // 处理视频双击
  const handleVideoDoubleClick = useCallback((video: CanvasVideo) => {
    handleAddSelectedVideo({
      id: video.id,
      url: video.url,
      x: 0,
      y: 0,
      width: video.width,
      height: video.height,
      prompt: video.prompt,
    });
  }, [handleAddSelectedVideo]);

  // 处理删除视频
  const handleDeleteVideo = useCallback(async () => {
    // 获取要删除的视频ID列表（包括图片和视频）
    const idsToDelete = selectedVideoIds.length > 0 
      ? selectedVideoIds 
      : selectedVideoId 
        ? [selectedVideoId] 
        : [];
    
    if (idsToDelete.length === 0) return;
    
    // 先标记为删除中，触发动画
    setDeletingVideoIds(new Set(idsToDelete));
    
    // 等待动画完成（300ms）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 获取对应的画布元素ID列表
    const canvasItemIds: number[] = idsToDelete
      .map(id => canvasItemIdMap.current.get(id))
      .filter((id): id is number => id !== undefined);
    
    // 如果有画布元素ID，调用批量删除接口
    if (canvasItemIds.length > 0) {
      try {
        await batchDeleteCanvasItems(canvasItemIds);
        // 刷新历史记录
        await loadSessions();
      } catch (error) {
        console.error('Failed to delete canvas items:', error);
        toast.error(isZh ? '删除失败' : 'Delete failed');
        // 删除失败时，取消删除状态
        setDeletingVideoIds(new Set());
        return;
      }
    }
    
    // 从本地状态中移除
    if (selectedVideoIds.length > 1) {
      setCanvasVideos(prev => prev.filter(v => !selectedVideoIds.includes(v.id)));
      // 清除ID映射
      selectedVideoIds.forEach(id => canvasItemIdMap.current.delete(id));
      setSelectedVideoIds([]);
      setSelectedVideoId(null);
    } else if (selectedVideoId) {
      setCanvasVideos(prev => prev.filter(v => v.id !== selectedVideoId));
      // 清除ID映射
      canvasItemIdMap.current.delete(selectedVideoId);
      setSelectedVideoId(null);
      setSelectedVideoIds([]);
    }
    
    // 清除删除状态
    setDeletingVideoIds(new Set());
    
    toast.success(isZh ? `已删除 ${idsToDelete.length} 个图层` : `Deleted ${idsToDelete.length} items`);
  }, [selectedVideoIds, selectedVideoId, isZh, loadSessions]);

  // 处理键盘删除快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框中，如果是则不处理删除
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // 处理删除键（Delete 或 Backspace）
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
        const hasSelection = selectedVideoIds.length > 0 || selectedVideoId;
        if (hasSelection) {
          e.preventDefault();
          handleDeleteVideo();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideoId, selectedVideoIds, handleDeleteVideo]);

  // 处理批量复制视频
  const handleBatchCopyVideos = useCallback(async () => {
    if (selectedVideoIds.length === 0) return;
    
    const videosToCopy = canvasVideos.filter(v => selectedVideoIds.includes(v.id));
    if (videosToCopy.length === 0) return;
    
    try {
      const videoUrls = videosToCopy.map(v => v.url);
      await navigator.clipboard.writeText(JSON.stringify(videoUrls));
      toast.success(isZh ? `已复制 ${videosToCopy.length} 个视频` : `Copied ${videosToCopy.length} videos`);
    } catch (err) {
      toast.error(isZh ? '复制失败' : 'Copy failed');
    }
  }, [selectedVideoIds, canvasVideos, isZh]);

  // 处理批量下载视频
  const handleBatchDownloadVideos = useCallback(async () => {
    const videosToDownload = selectedVideoIds.length > 1
      ? canvasVideos.filter(v => selectedVideoIds.includes(v.id))
      : selectedVideoId
        ? canvasVideos.filter(v => v.id === selectedVideoId)
        : [];
    
    if (videosToDownload.length === 0) return;
    
    for (const video of videosToDownload) {
      try {
        const response = await fetch(video.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${video.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download failed:', err);
      }
    }
    
    toast.success(isZh ? `已下载 ${videosToDownload.length} 个视频` : `Downloaded ${videosToDownload.length} videos`);
  }, [selectedVideoIds, selectedVideoId, canvasVideos, isZh]);

  // 处理调整聊天栏宽度
  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  handleResizeMoveRef.current = (e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - resizeStartX.current;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const newWidthPercent = resizeStartWidth.current + deltaPercent;
    const clampedWidth = Math.max(20, Math.min(60, newWidthPercent));
    setChatPanelWidth(clampedWidth);
  };

  handleResizeEndRef.current = () => {
    setIsResizing(false);
    const moveHandler = handleResizeMoveRef.current;
    const endHandler = handleResizeEndRef.current;
    if (moveHandler) {
      document.removeEventListener('mousemove', moveHandler);
    }
    if (endHandler) {
      document.removeEventListener('mouseup', endHandler);
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current || !handleResizeMoveRef.current || !handleResizeEndRef.current) return;
    
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = chatPanelWidth;
    setIsResizing(true);
    
    document.addEventListener('mousemove', handleResizeMoveRef.current);
    document.addEventListener('mouseup', handleResizeEndRef.current);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [chatPanelWidth]);

  // 切换聊天栏收起/展开
  const handleToggleChatPanel = useCallback(() => {
    setIsChatPanelCollapsed(prev => {
      if (prev) {
        // 展开：恢复到之前的宽度（如果之前没有宽度，使用默认30%）
        setChatPanelWidth(30);
      } else {
        // 收起：保存当前宽度并设置为0
        setChatPanelWidth(0);
      }
      return !prev;
    });
  }, []);

  return {
    // Refs
    chatEndRef,
    resizeRef,
    containerRef,
    
    // State
    prompt,
    setPrompt,
    workMode,
    setWorkMode,
    showHistory,
    setShowHistory,
    model,
    setModel,
    seconds,
    setSeconds,
    size,
    setSize,
    messages,
    isGenerating,
    canvasVideos,
    taskPlaceholders,
    selectedVideoId,
    setSelectedVideoId,
    selectedVideoIds,
    setSelectedVideoIds,
    selectedImages,
    isDragOver,
    copiedVideo,
    highlightedVideoId,
    chatPanelWidth,
    isResizing,
    isChatPanelCollapsed,
    handleToggleChatPanel,
    canvasView,
    currentSessionId,
    deletingVideoIds,
    addingVideoIds,
    
    // Config
    models,
    secondsOptions,
    sizesOptions,
    historySessions,
    
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleVideoMove,
    handleVideoResize,
    handleViewChange,
    handleAddSelectedVideo,
    handleRemoveSelectedVideo,
    handleCopyVideo,
    handlePasteVideo,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleGenerate,
    handleKeyDown,
    handleVideoDoubleClick,
    handleDeleteVideo,
    handleBatchCopyVideos,
    handleBatchDownloadVideos,
    handleResizeStart,
    handleUploadImage,
    
    // Utils
    cleanMessageContent,
    isZh,
  };
}
