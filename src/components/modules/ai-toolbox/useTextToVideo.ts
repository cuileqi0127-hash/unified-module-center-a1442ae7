/**
 * Text-to-Video Business Logic Hook
 * 文生视频业务逻辑层
 * 
 * 将业务逻辑与视图层分离，便于维护和测试
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ensureAspectRatioEnum, type VideoModel, type VideoTaskResponse } from '@/services/videoGenerationApi';
import {
  getSessions,
  createSession,
  saveGenerationResult,
  submitVideoTask,
  getTaskStatus,
  updateSession,
  updateCanvasItem,
  batchDeleteCanvasItems,
  getSessionDetail,
  type Session,
  type SessionDetail,
} from '@/services/generationSessionApi';
import { redirectToLogin } from '@/services/oauthApi';
import { debounce } from '@/utils/debounce';
import { findNonOverlappingPosition } from './canvasUtils';
import {
  getVideoModelList,
  getModelSeconds,
  getModelSizes,
  getModelDefaultSeconds,
  getModelDefaultSize,
  getModelResolutions,
  getModelDefaultResolution,
  getModelVersion,
  getModelMaxImages,
  modelSupportsEnhanceSwitch,
  isValidSecondsForModel,
  isValidSizeForModel,
  isValidResolutionForModel,
  DEFAULT_VIDEO_MODEL,
  VIDEO_MODEL_CONFIGS,
} from './textToVideoConfig';
import { type SelectedImage } from './ImageCapsule';
import { uploadFile, validateFileFormat, validateFileSize } from '@/services/fileUploadApi';
import { toolsDownloadByUrls } from '@/services/toolsDownloadApi';

// 类型定义
export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  image?: string;
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
  ossKey?: string; // OSS存储密钥
}

// 任务队列项（会话 id 与接口一致，支持字符串）
interface VideoTaskQueueItem {
  taskId: string;
  messageId: string;
  sessionId: string | number | null;
  prompt: string;
  model: VideoModel;
  seconds: string;
  size: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: number;
  referenceFile?: File | string;
}

const mockHistory: ChatMessage[] = [];
const initialCanvasVideos: CanvasVideo[] = [];

export function useTextToVideo() {
  const { t } = useTranslation();

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const isResizingRef = useRef<boolean>(false);
  /** 任务队列（仅内存，不落缓存） */
  const videoTaskQueueRef = useRef<VideoTaskQueueItem[]>([]);

  const getTaskQueue = useCallback((): VideoTaskQueueItem[] => videoTaskQueueRef.current, []);
  const addTaskToQueue = useCallback((task: VideoTaskQueueItem) => {
    videoTaskQueueRef.current = [...videoTaskQueueRef.current, task];
    updatePlaceholdersFromQueueRef.current?.();
  }, []);
  const removeTaskFromQueue = useCallback((taskId: string) => {
    videoTaskQueueRef.current = videoTaskQueueRef.current.filter(t => t.taskId !== taskId);
    updatePlaceholdersFromQueueRef.current?.();
  }, []);
  const updateTaskInQueue = useCallback((taskId: string, updates: Partial<VideoTaskQueueItem>) => {
    const q = videoTaskQueueRef.current;
    const index = q.findIndex(t => t.taskId === taskId);
    if (index !== -1) {
      videoTaskQueueRef.current = q.slice(0, index).concat([{ ...q[index], ...updates }], q.slice(index + 1));
    }
  }, []);
  const handleResizeMoveRef = useRef<(e: MouseEvent) => void>();
  const handleResizeEndRef = useRef<() => void>();

  const [searchParams] = useSearchParams();

  // State
  const [prompt, setPrompt] = useState('');
  const [workMode, setWorkMode] = useState('text-to-video');
  const [showHistory, setShowHistory] = useState(false);
  const [model, setModel] = useState<VideoModel>(DEFAULT_VIDEO_MODEL);
  const [seconds, setSeconds] = useState<string>(getModelDefaultSeconds(DEFAULT_VIDEO_MODEL));
  const [size, setSize] = useState<string>(getModelDefaultSize(DEFAULT_VIDEO_MODEL));
  const [resolution, setResolution] = useState<string>(getModelDefaultResolution(DEFAULT_VIDEO_MODEL));
  const [enhanceSwitch, setEnhanceSwitch] = useState<'Enabled' | 'Disabled'>('Disabled');
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
  const [copiedVideos, setCopiedVideos] = useState<CanvasVideo[]>([]); // 批量复制的视频数组
  const [highlightedVideoId, setHighlightedVideoId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [chatPanelWidth, setChatPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [taskPlaceholders, setTaskPlaceholders] = useState<CanvasVideo[]>([]);
  
  // 会话管理状态
  const [currentSessionId, setCurrentSessionId] = useState<string | number | null>(null);
  const [historySessions, setHistorySessions] = useState<Array<{ id: string; title: string; timestamp: Date; assetCount: number }>>([]);
  const [historyPage, setHistoryPage] = useState(1); // 当前页码
  const [hasMoreHistory, setHasMoreHistory] = useState(true); // 是否还有更多历史记录
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // 是否正在加载历史记录
  const [isInitializing, setIsInitializing] = useState(true); // 是否正在初始化（首次加载历史记录）
  const [isLoadingSession, setIsLoadingSession] = useState(false); // 点击历史记录切换会话时的 loading
  const [canvasView, setCanvasView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  
  // 画布元素ID映射（用于更新数据库；接口返回 id 可能为字符串）
  const canvasItemIdMap = useRef<Map<string, string | number>>(new Map());

  // 任务队列相关 refs
  const activePollingTasksRef = useRef<Map<string, { cancel: () => void }>>(new Map());
  const isProcessingQueueRef = useRef(false);
  const updatePlaceholdersFromQueueRef = useRef<() => void>();
  const processTaskQueueRef = useRef<() => void>();

  // 配置数据
  const models = getVideoModelList();
  const secondsOptions = getModelSeconds(model);
  const sizesOptions = getModelSizes(model);
  const resolutionOptions = getModelResolutions(model);
  const enhanceSwitchSupported = modelSupportsEnhanceSwitch(model);

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

  // 当模型切换时，重置时长、尺寸、分辨率为对应模型的默认值；增强开关仅部分模型支持
  useEffect(() => {
    if (!isValidSecondsForModel(model, seconds)) {
      setSeconds(getModelDefaultSeconds(model));
    }
    if (!isValidSizeForModel(model, size)) {
      setSize(getModelDefaultSize(model));
    }
    if (!isValidResolutionForModel(model, resolution)) {
      setResolution(getModelDefaultResolution(model));
    }
    if (!modelSupportsEnhanceSwitch(model)) {
      setEnhanceSwitch('Disabled');
    }
  }, [model, seconds, size, resolution]);

  // 页面初始化：若 URL 带 ?search=xxx，则填入聊天栏输入框
  useEffect(() => {
    const q = searchParams.get('search');
    if (q != null && q.trim()) setPrompt(q.trim());
  }, [searchParams]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 查询会话列表（历史记录列表）
  // @param page 页码，从1开始
  // @param append 是否追加到现有列表（用于分页加载）
  const loadSessions = useCallback(async (page: number = 1, append: boolean = false): Promise<Session[]> => {
    if (isLoadingHistory) return []; // 防止重复加载
    
    setIsLoadingHistory(true);
    try {
      const response = await getSessions('video', page, 10); // 每页10条
      if (response.success && response.data) {
        const sessions = response.data.list;
        const total = response.data.total || 0;
        
        // 为每个会话获取消息数量
        // 优化：如果后端已经返回 assetCount，直接使用；否则获取详情
        const sessionsWithMessageCount = await Promise.all(
          sessions.map(async (session: Session) => {
            let assetCount = session.assetCount ?? 0;
            
            return {
              id: session.id.toString(),
              title: session.title || t('common.untitledSession'),
              timestamp: new Date(session.createTime || Date.now()),
              assetCount,
            };
          })
        );
        
        if (append) {
          // 追加模式：追加到现有列表
          // 先计算新列表长度，用于判断是否还有更多数据
          setHistorySessions(prev => {
            const newList = [...prev, ...sessionsWithMessageCount];
            return newList;
          });
          // 使用函数式更新获取最新长度并判断
          setHistorySessions(prev => {
            setHasMoreHistory(prev.length < total);
            return prev;
          });
        } else {
          // 替换模式：替换整个列表
          setHistorySessions(sessionsWithMessageCount);
          // 判断是否还有更多数据
          setHasMoreHistory(sessions.length < total);
        }
        
        setHistoryPage(page);
        return sessions;
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingHistory(false);
    }
    return [];
  }, [t, isLoadingHistory]);
  
  // 加载更多历史记录
  const loadMoreHistory = useCallback(() => {
    if (!isLoadingHistory && hasMoreHistory) {
      loadSessions(historyPage + 1, true);
    }
  }, [isLoadingHistory, hasMoreHistory, historyPage, loadSessions]);

  // 初始化时加载会话列表，并根据情况加载第一个会话或创建新会话
  useEffect(() => {
    const initializeSession = async () => {
      setIsInitializing(true); // 开始初始化
      try {
        // 1. 查看历史记录列表
        const sessions = await loadSessions(1, false);
      
      // 2. 如果历史记录列表数组长度 > 0，获取数组第0个会话
      if (sessions && sessions.length > 0) {
        const firstSession = sessions[0];
        try {
          // 使用 getSessionDetail 获取指定会话的完整内容
          const response = await getSessionDetail(firstSession.id.toString());
          
          if (response.success && response.data) {
            const session = response.data;
            setCurrentSessionId(session.id);
            
            // 恢复画布视图（缩放和平移）
            setCanvasView(session.canvasView || { zoom: 1, pan: { x: 0, y: 0 } });
            
            // 恢复画布元素（图片/视频）
            if (session.canvasItems && session.assets && session.generations) {
              const assetsMap = new Map(session.assets.map(asset => [asset.id, asset]));
              const generationsMap = new Map(session.generations.map(gen => [gen.id.toString(), gen]));
              
              const restoredVideos: CanvasVideo[] = session.canvasItems
                .map(item => {
                  const asset = assetsMap.get(item.assetId);
                  if (!asset) return null;
                  
                  // 保存画布元素ID映射，用于后续更新
                  canvasItemIdMap.current.set(`item-${item.id}`, item.id);
                  
                  // 通过 asset.generationId 获取 prompt
                  let prompt: string | undefined;
                  if (asset.generationId) {
                    const generation = generationsMap.get(asset.generationId.toString());
                    if (generation && generation.prompt) {
                      prompt = generation.prompt;
                    }
                  }
                  
                  const videoItem: CanvasVideo = {
                    id: `item-${item.id}`,
                    url: asset.downloadUrl || asset.ossKey || '',
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    type: asset.type === 'video' ? 'video' : 'image',
                    prompt,
                  };
                  
                  return videoItem;
                })
                .filter((item): item is CanvasVideo => item !== null);
              
              setCanvasVideos(restoredVideos);
            }
            
            // 恢复聊天内容（用户消息和系统消息）
            if (session.messages && session.generations) {
              const assetsMap = new Map(session.assets?.map(asset => [asset.id, asset]) || []);
              const generationsMap = new Map(session.generations.map(gen => [gen.id.toString(), gen]));
              
              const restoredMessages: ChatMessage[] = [];
              
              session.messages.forEach(msg => {
                // 如果消息有 generationId，说明这是系统消息，需要先创建用户消息（包含 prompt）
                if (msg.generationId) {
                  const generation = generationsMap.get(msg.generationId.toString());
                  if (generation && generation.prompt) {
                    // 创建用户消息（包含 prompt）
                    const userMessage: ChatMessage = {
                      id: `user-${msg.id}`,
                      type: 'user',
                      content: generation.prompt,
                      timestamp: new Date(generation.createTime || msg.createTime || Date.now()),
                    };
                    restoredMessages.push(userMessage);
                  }
                }
                
                // 创建系统消息
                const systemMessage: ChatMessage = {
                  id: msg.id.toString(),
                  type: msg.type === 'user' ? 'user' : 'system',
                  content: msg.content,
                  timestamp: new Date(msg.createTime || Date.now()),
                  status: msg.status === 'complete' || msg.status === 'completed' ? 'completed' : msg.status === 'processing' ? 'processing' : msg.status === 'failed' ? 'failed' : 'queued',
                  resultSummary: msg.resultSummary,
                };
                
                // 如果消息有 generationId，从 generations 中获取详细信息
                if (msg.generationId) {
                  const generation = generationsMap.get(msg.generationId.toString());
                  if (generation) {
                    // 构建 designThoughts 数组
                    const designThoughts: string[] = [];
                    
                    // 添加图片理解（使用 generation.prompt）
                    if (generation.prompt) {
                      designThoughts.push(
                        t('toast.imageUnderstanding', { prompt: generation.prompt })
                      );
                    }
                    
                    // 添加尺寸信息
                    if (generation.size) {
                      designThoughts.push(
                        t('toast.sizeLabel', { size: generation.size })
                      );
                    }
                    
                    if (designThoughts.length > 0) {
                      systemMessage.designThoughts = designThoughts;
                    }
                  }
                }
                
                // 如果有关联的资产，恢复视频URL
                if (msg.assetId && assetsMap.has(msg.assetId)) {
                  const asset = assetsMap.get(msg.assetId)!;
                  if (asset.type === 'video') {
                    systemMessage.video = asset.downloadUrl || asset.ossKey || '';
                  }
                }
                
                restoredMessages.push(systemMessage);
              });
              const pendingGenerations = session.generations.filter(
                (g): g is typeof g & { status: 'queued' | 'processing' } =>
                  g.status === 'queued' || g.status === 'processing'
              );
              const pendingWithoutMessage = pendingGenerations.filter(
                gen => !session.messages?.some(msg => String(msg.generationId) === String(gen.id))
              );
              pendingWithoutMessage.forEach(gen => {
                restoredMessages.push({
                  id: `gen-${gen.id}`,
                  type: 'system',
                  content: gen.status === 'processing' ? t('toast.generatingVideo') : t('toast.taskQueued'),
                  timestamp: new Date(gen.createTime || Date.now()),
                  status: gen.status === 'processing' ? 'processing' : 'queued',
                });
              });
              restoredMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
              setMessages(restoredMessages);
              const existingQueue = getTaskQueue();
              const toAdd = pendingGenerations.filter(
                gen => !existingQueue.some(t => t.taskId === String(gen.id) && String(t.sessionId) === String(session.id))
              );
              if (toAdd.length > 0) {
                toAdd.forEach(gen => {
                  addTaskToQueue({
                    taskId: String(gen.id),
                    messageId: `gen-${gen.id}`,
                    sessionId: session.id,
                    prompt: gen.prompt,
                    model: (gen.model as VideoModel) || (session.settings?.model as VideoModel) || DEFAULT_VIDEO_MODEL,
                    seconds: (session.settings as { seconds?: string })?.seconds ?? getModelDefaultSeconds(DEFAULT_VIDEO_MODEL),
                    size: gen.size || session.settings?.size || getModelDefaultSize(DEFAULT_VIDEO_MODEL),
                    status: gen.status as 'queued' | 'processing',
                    progress: gen.progress ?? 0,
                    createdAt: gen.createTime ? new Date(gen.createTime).getTime() : Date.now(),
                  });
                });
                setTimeout(() => {
                  updatePlaceholdersFromQueueRef.current?.();
                  processTaskQueueRef.current?.();
                }, 0);
              } else if (pendingGenerations.length > 0) {
                setTimeout(() => updatePlaceholdersFromQueueRef.current?.(), 0);
              }
            }
          }
        } catch (error) {
          console.error('Failed to load first session:', error);
        }
      } else {
        // 3. 如果历史记录列表数组长度 == 0，自动创建新会话
        try {
          const response = await createSession({
            title: t('toast.newSession'),
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
            await loadSessions(1, false);
          }
        } catch (error) {
          console.error('Failed to create session:', error);
          toast.error(t('toast.createSessionFailed'));
        }
      }
      } finally {
        // 无论成功或失败，都要关闭初始化 loading
        setIsInitializing(false);
      }
    };
    
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 防抖更新会话视图（会话 id 支持字符串，与接口一致）
  const debouncedUpdateSession = useRef(
    debounce(async (sessionId: string | number, zoom: number, pan: { x: number; y: number }) => {
      try {
        await updateSession(sessionId, {
          canvasView: { zoom, pan },
        });
      } catch (error) {
        console.error('Failed to update session view:', error);
      }
    }, 500)
  ).current;

  // 防抖更新画布元素（画布元素 id 支持字符串，与接口一致）
  const debouncedUpdateCanvasItem = useRef(
    debounce(async (canvasItemId: string | number, x: number, y: number, width?: number, height?: number) => {
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


  // 从 sessionStorage 读取跨页面复制的数据
  useEffect(() => {
    const checkCopiedItems = () => {
      try {
        const stored = sessionStorage.getItem('canvasCopiedItems');
        if (stored) {
          const items = JSON.parse(stored);
          if (Array.isArray(items) && items.length > 0) {
            if (items.length === 1) {
              const item = items[0];
              setCopiedVideo({
                id: item.id,
                url: item.url,
                type: (item.type === 'video' || isVideoUrl(item.url)) ? 'video' : 'image',
                prompt: item.prompt,
                x: 0,
                y: 0,
                width: item.width || 400,
                height: item.height || 300,
              });
              setCopiedVideos([]);
            } else {
              setCopiedVideos(items.map(item => ({
                id: item.id,
                url: item.url,
                type: (item.type === 'video' || isVideoUrl(item.url)) ? 'video' as const : 'image' as const,
                prompt: item.prompt,
                x: 0,
                y: 0,
                width: item.width || 400,
                height: item.height || 300,
              })));
              setCopiedVideo(null);
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse copied items:', error);
      }
    };

    checkCopiedItems();
    // 监听 storage 事件，实现跨标签页同步
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'canvasCopiedItems') {
        checkCopiedItems();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // 也监听同页面内的变化（通过自定义事件）
    const handleCustomStorageChange = () => {
      checkCopiedItems();
    };
    window.addEventListener('canvasCopiedItemsChanged', handleCustomStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('canvasCopiedItemsChanged', handleCustomStorageChange);
    };
  }, [isVideoUrl]);

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
        title: t('toast.newSession'),
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
        await loadSessions(1, false);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error(t('toast.createSessionFailed'));
    }
  }, [model, size, seconds, t, loadSessions]);

  // 将会话详情应用到本地状态（画布 + 聊天栏），用于加载会话或落库后刷新
  const applySessionDetailToState = useCallback((session: SessionDetail) => {
    setCanvasView(session.canvasView || { zoom: 1, pan: { x: 0, y: 0 } });

    if (session.canvasItems && session.assets && session.generations) {
      const assetsMap = new Map(session.assets.map(asset => [asset.id, asset]));
      const generationsMap = new Map(session.generations.map(gen => [gen.id.toString(), gen]));
      const restoredVideos: CanvasVideo[] = session.canvasItems
        .map(item => {
          const asset = assetsMap.get(item.assetId);
          if (!asset) return null;
          canvasItemIdMap.current.set(`item-${item.id}`, item.id);
          let prompt: string | undefined;
          if (asset.generationId) {
            const generation = generationsMap.get(asset.generationId.toString());
            if (generation?.prompt) prompt = generation.prompt;
          }
          return {
            id: `item-${item.id}`,
            url: asset.downloadUrl || asset.ossKey || '',
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            type: asset.type === 'video' ? 'video' : 'image',
            prompt,
          } as CanvasVideo;
        })
        .filter((item): item is CanvasVideo => item !== null);
      setCanvasVideos(restoredVideos);
    }

    if (session.messages && session.generations) {
      const assetsMap = new Map(session.assets?.map(asset => [asset.id, asset]) || []);
      const generationsMap = new Map(session.generations.map(gen => [gen.id.toString(), gen]));
      const restoredMessages: ChatMessage[] = [];
      session.messages.forEach(msg => {
        if (msg.generationId) {
          const generation = generationsMap.get(msg.generationId.toString());
          if (generation?.prompt) {
            restoredMessages.push({
              id: `user-${msg.id}`,
              type: 'user',
              content: generation.prompt,
              timestamp: new Date(generation.createTime || msg.createTime || Date.now()),
            });
          }
        }
        const systemMessage: ChatMessage = {
          id: msg.id.toString(),
          type: msg.type === 'user' ? 'user' : 'system',
          content: msg.content,
          timestamp: new Date(msg.createTime || Date.now()),
          status: msg.status === 'complete' || msg.status === 'completed' ? 'completed' : msg.status === 'processing' ? 'processing' : msg.status === 'failed' ? 'failed' : 'queued',
          resultSummary: msg.resultSummary,
        };
        if (msg.generationId) {
          const generation = generationsMap.get(msg.generationId.toString());
          if (generation) {
            const designThoughts: string[] = [];
            if (generation.prompt) designThoughts.push(t('toast.videoUnderstanding', { prompt: generation.prompt }));
            const videoSeconds = session.settings?.seconds;
            if (videoSeconds) designThoughts.push(t('toast.durationLabel', { seconds: videoSeconds }));
            if (generation.size) designThoughts.push(t('toast.sizeLabel', { size: generation.size }));
            if (designThoughts.length > 0) systemMessage.designThoughts = designThoughts;
          }
        }
        if (msg.assetId && assetsMap.has(msg.assetId)) {
          const asset = assetsMap.get(msg.assetId)!;
          if (asset.type === 'video') systemMessage.video = asset.downloadUrl || asset.ossKey || '';
        }
        restoredMessages.push(systemMessage);
      });
      const pendingGenerations = session.generations.filter(
        (g): g is typeof g & { status: 'queued' | 'processing' } =>
          g.status === 'queued' || g.status === 'processing'
      );
      const pendingWithoutMessage = pendingGenerations.filter(
        gen => !session.messages?.some(msg => String(msg.generationId) === String(gen.id))
      );
      pendingWithoutMessage.forEach(gen => {
        restoredMessages.push({
          id: `gen-${gen.id}`,
          type: 'system',
          content: gen.status === 'processing' ? t('toast.generatingVideo') : t('toast.taskQueued'),
          timestamp: new Date(gen.createTime || Date.now()),
          status: gen.status === 'processing' ? 'processing' : 'queued',
        });
      });
      restoredMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(restoredMessages);
    }
  }, [t]);

  // 仅用会话详情更新本地 messages（落库后刷新聊天栏，不更新画布）
  const applySessionMessagesToState = useCallback((session: SessionDetail) => {
    if (!session.messages || !session.generations) return;
    const assetsMap = new Map(session.assets?.map(asset => [asset.id, asset]) || []);
    const generationsMap = new Map(session.generations.map(gen => [gen.id.toString(), gen]));
    const restoredMessages: ChatMessage[] = [];
    session.messages.forEach(msg => {
      if (msg.generationId) {
        const generation = generationsMap.get(msg.generationId.toString());
        if (generation?.prompt) {
          restoredMessages.push({
            id: `user-${msg.id}`,
            type: 'user',
            content: generation.prompt,
            timestamp: new Date(generation.createTime || msg.createTime || Date.now()),
          });
        }
      }
      const systemMessage: ChatMessage = {
        id: msg.id.toString(),
        type: msg.type === 'user' ? 'user' : 'system',
        content: msg.content,
        timestamp: new Date(msg.createTime || Date.now()),
        status: msg.status === 'complete' || msg.status === 'completed' ? 'completed' : msg.status === 'processing' ? 'processing' : msg.status === 'failed' ? 'failed' : 'queued',
        resultSummary: msg.resultSummary,
      };
      if (msg.generationId) {
        const generation = generationsMap.get(msg.generationId.toString());
        if (generation) {
          const designThoughts: string[] = [];
          if (generation.prompt) designThoughts.push(t('toast.videoUnderstanding', { prompt: generation.prompt }));
          const videoSeconds = session.settings?.seconds;
          if (videoSeconds) designThoughts.push(t('toast.durationLabel', { seconds: videoSeconds }));
          if (generation.size) designThoughts.push(t('toast.sizeLabel', { size: generation.size }));
          if (designThoughts.length > 0) systemMessage.designThoughts = designThoughts;
        }
      }
      if (msg.assetId && assetsMap.has(msg.assetId)) {
        const asset = assetsMap.get(msg.assetId)!;
        if (asset.type === 'video') systemMessage.video = asset.downloadUrl || asset.ossKey || '';
      }
      restoredMessages.push(systemMessage);
    });
    const pendingGenerations = session.generations.filter(
      (g): g is typeof g & { status: 'queued' | 'processing' } =>
        g.status === 'queued' || g.status === 'processing'
    );
    const pendingWithoutMessage = pendingGenerations.filter(
      gen => !session.messages?.some(msg => String(msg.generationId) === String(gen.id))
    );
    pendingWithoutMessage.forEach(gen => {
      restoredMessages.push({
        id: `gen-${gen.id}`,
        type: 'system',
        content: gen.status === 'processing' ? t('toast.generatingVideo') : t('toast.taskQueued'),
        timestamp: new Date(gen.createTime || Date.now()),
        status: gen.status === 'processing' ? 'processing' : 'queued',
      });
    });
    restoredMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setMessages(restoredMessages);
  }, [t]);

  // 处理加载历史会话（获取指定会话的聊天内容和画布内容）
  const handleLoadSession = useCallback(async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      setTaskPlaceholders([]);
      const response = await getSessionDetail(sessionId);
      if (response.success && response.data) {
        const session = response.data;
        setCurrentSessionId(session.id);
        applySessionDetailToState(session);
        setShowHistory(false);
        
        // 会话详情中 generations[].status 为 processing（或 queued）时加入任务队列并轮询（切换页面再切回时避免重复入队）
        if (session.generations && session.generations.length > 0) {
          const pending = session.generations.filter(
            (g): g is typeof g & { status: 'queued' | 'processing' } =>
              g.status === 'queued' || g.status === 'processing'
          );
          const existingQueue = getTaskQueue();
          const toAdd = pending.filter(
            gen => !existingQueue.some(t => t.taskId === String(gen.id) && String(t.sessionId) === String(session.id))
          );
          toAdd.forEach(gen => {
            addTaskToQueue({
              taskId: String(gen.id),
              messageId: `gen-${gen.id}`,
              sessionId: session.id,
              prompt: gen.prompt,
              model: (gen.model as VideoModel) || (session.settings?.model as VideoModel) || DEFAULT_VIDEO_MODEL,
              seconds: (session.settings as { seconds?: string })?.seconds ?? getModelDefaultSeconds(DEFAULT_VIDEO_MODEL),
              size: gen.size || session.settings?.size || getModelDefaultSize(DEFAULT_VIDEO_MODEL),
              status: gen.status as 'queued' | 'processing',
              progress: gen.progress ?? 0,
              createdAt: gen.createTime ? new Date(gen.createTime).getTime() : Date.now(),
            });
          });
          if (toAdd.length > 0) {
            setTimeout(() => {
              updatePlaceholdersFromQueueRef.current?.();
              processTaskQueueRef.current?.();
            }, 0);
          } else if (pending.length > 0) {
            setTimeout(() => updatePlaceholdersFromQueueRef.current?.(), 0);
          }
        }
        
        toast.success(t('toast.sessionLoaded'));
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error(t('toast.loadSessionFailed'));
    } finally {
      setIsLoadingSession(false);
    }
  }, [t, applySessionDetailToState]);

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
        toast.info(t('toast.videoAlreadyAttached'));
        return prev;
      }
      return [...prev, selectedImage];
    });
    
    setHighlightedVideoId(video.id);
    toast.success(t('toast.addedToInput'));
    
    setTimeout(() => {
      setHighlightedVideoId(null);
    }, 600);
  }, [t]);

  // 处理移除选中视频
  const handleRemoveSelectedVideo = useCallback((id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // 处理复制视频
  const handleCopyVideo = useCallback((video: CanvasVideo) => {
    setCopiedVideo(video);
    // 存储到 sessionStorage，供其他页面使用
    const isVideo = video.type === 'video' || isVideoUrl(video.url);
    const item = {
      id: video.id,
      url: video.url,
      type: isVideo ? 'video' as const : 'image' as const,
      prompt: video.prompt,
      width: video.width,
      height: video.height,
    };
    sessionStorage.setItem('canvasCopiedItems', JSON.stringify([item]));
    // 触发自定义事件，通知同页面内的其他组件
    window.dispatchEvent(new Event('canvasCopiedItemsChanged'));
    toast.success(t('toast.copiedToClipboard'));
  }, [t, isVideoUrl]);

  // 处理粘贴视频（可选 pasteX, pasteY：右键粘贴时传入，使粘贴位置与右键坐标一致）
  const handlePasteVideo = useCallback(async (pasteX?: number, pasteY?: number) => {
    const startX = pasteX ?? 300;
    const startY = pasteY ?? 200;
    // 优先处理批量粘贴
    if (copiedVideos.length > 0) {
      const newVideos: CanvasVideo[] = [];
      const existingRects = canvasVideos.map(v => ({
        x: v.x,
        y: v.y,
        width: v.width,
        height: v.height,
      }));

      // 批量粘贴：使用拷贝源在画布上的宽高，落库也用该尺寸
      for (let i = 0; i < copiedVideos.length; i++) {
        const copiedItem = copiedVideos[i];
        const isVideo = copiedItem.type === 'video' || isVideoUrl(copiedItem.url);
        const w = copiedItem.width;
        const h = copiedItem.height;
        const baseX = i === 0 ? startX : newVideos[0].x;
        const baseY = i === 0 ? startY : newVideos[0].y;
        const position = findNonOverlappingPosition(
          { width: w, height: h },
          [...existingRects, ...newVideos.map(v => ({
            x: v.x,
            y: v.y,
            width: v.width,
            height: v.height,
          }))],
          baseX,
          baseY
        );
        
        const newVideo: CanvasVideo = {
          ...copiedItem,
          id: isVideo ? `video-${Date.now()}-${i}` : `img-${Date.now()}-${i}`,
          x: position.x,
          y: position.y,
          width: w,
          height: h,
          type: copiedItem.type || (isVideo ? 'video' : 'image'),
        };
        newVideos.push(newVideo);
        existingRects.push({
          x: position.x,
          y: position.y,
          width: w,
          height: h,
        });
      }

      // 添加到画布
      const newIds = newVideos.map(v => v.id);
      setCanvasVideos(prev => [...prev, ...newVideos]);
      setSelectedVideoId(newVideos[0]?.id || null);
      setSelectedVideoIds(newIds);
      setCopiedVideos([]);

      // 批量保存生成结果到数据库
      if (currentSessionId) {
        try {
          await Promise.all(newVideos.map(async (newVideo, index) => {
            const isVideo = newVideo.type === 'video' || isVideoUrl(newVideo.url);
            try {
              const saveResponse = await saveGenerationResult(currentSessionId, {
                generation: {
                  model: model,
                  size: size,
                  prompt: newVideo.prompt || (isVideo ? t('toast.pastedVideo') : t('toast.pastedImage')),
                  status: 'success',
                  ...(isVideo && seconds ? { seconds } : {}),
                },
                asset: {
                  type: isVideo ? 'video' : 'image',
                  sourceUrl: newVideo.url,
                  seq: index + 1,
                  width: newVideo.width,
                  height: newVideo.height,
                  ...(isVideo && seconds ? { duration: parseInt(seconds, 10) } : {}),
                },
                message: {
                  type: 'system',
                  content: t('toast.generationComplete'),
                  status: 'complete',
                  resultSummary: isVideo ? t('toast.videoPastedToCanvas') : t('toast.imagePastedToCanvas'),
                },
                canvasItem: {
                  x: newVideo.x,
                  y: newVideo.y,
                  width: newVideo.width,
                  height: newVideo.height,
                  rotate: 0,
                  visible: true,
                  zindex: canvasVideos.length + index,
                },
              });

              if (saveResponse.success && saveResponse.data) {
                canvasItemIdMap.current.set(newVideo.id, saveResponse.data.canvasItemId);
              }
            } catch (error) {
              console.error(`Failed to save pasted item ${index}:`, error);
            }
          }));
          // 刷新历史记录并拉取当前会话详情，仅刷新聊天栏
          await loadSessions(1, false);
          const detailRes = await getSessionDetail(String(currentSessionId));
          if (detailRes.success && detailRes.data) applySessionMessagesToState(detailRes.data);
        } catch (error) {
          console.error('Failed to save pasted videos/images:', error);
        }
      }
      
      toast.success(`${t('toast.pastedItemsToCanvas')} ${newVideos.length} ${t('toast.items')} ${t('toast.toCanvas')}`);
      return;
    }

    // 单个粘贴：使用拷贝源在画布上的宽高，落库也用该尺寸
    if (copiedVideo) {
      const isVideo = copiedVideo.type === 'video' || isVideoUrl(copiedVideo.url);
      const w = copiedVideo.width;
      const h = copiedVideo.height;
      const position = findNonOverlappingPosition(
        { width: w, height: h },
        canvasVideos.map(v => ({
          x: v.x,
          y: v.y,
          width: v.width,
          height: v.height,
        })),
        startX,
        startY
      );
      const newVideo: CanvasVideo = {
        ...copiedVideo,
        id: isVideo ? `video-${Date.now()}` : `img-${Date.now()}`,
        x: position.x,
        y: position.y,
        width: w,
        height: h,
        type: copiedVideo.type || (isVideo ? 'video' : 'image'),
      };
      setCanvasVideos(prev => [...prev, newVideo]);
      setSelectedVideoId(newVideo.id);
      setCopiedVideo(null);
      
      // 保存生成结果到数据库（画布元素尺寸与拷贝源一致）
      if (currentSessionId) {
        try {
          const saveResponse = await saveGenerationResult(currentSessionId, {
            generation: {
              model: model,
              size: size,
              prompt: copiedVideo.prompt || (isVideo ? t('toast.pastedVideo') : t('toast.pastedImage')),
              status: 'success',
              ...(isVideo && seconds ? { seconds } : {}),
            },
            asset: {
              type: isVideo ? 'video' : 'image',
              sourceUrl: copiedVideo.url,
              seq: 1,
              width: w,
              height: h,
              ...(isVideo && seconds ? { duration: parseInt(seconds, 10) } : {}),
            },
            message: {
              type: 'system',
              content: t('toast.generationComplete'),
              status: 'complete',
              resultSummary: isVideo ? t('toast.videoPastedToCanvas') : t('toast.imagePastedToCanvas'),
            },
            canvasItem: {
              x: position.x,
              y: position.y,
              width: w,
              height: h,
              rotate: 0,
              visible: true,
              zindex: canvasVideos.length,
            },
          });

          if (saveResponse.success && saveResponse.data) {
            // 保存画布元素ID映射
            canvasItemIdMap.current.set(newVideo.id, saveResponse.data.canvasItemId);
            // 刷新历史记录并拉取当前会话详情，仅刷新聊天栏
            await loadSessions(1, false);
            const detailRes = await getSessionDetail(String(currentSessionId));
            if (detailRes.success && detailRes.data) applySessionMessagesToState(detailRes.data);
          }
        } catch (error) {
          console.error('Failed to save pasted video/image:', error);
        }
      }
      
      toast.success(t('toast.pastedToCanvas'));
    }
  }, [copiedVideo, copiedVideos, t, isVideoUrl, currentSessionId, model, size, seconds, canvasVideos, loadSessions, getSessionDetail, applySessionMessagesToState]);

  // 上传状态管理
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { progress: number; id: string }>>(new Map());

  // 处理上传图片到画布
  const handleUploadImage = useCallback(async (file: File) => {
    try {
      // 文件验证
      const allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      // 验证文件格式
      if (!validateFileFormat(file, allowedFormats)) {
        toast.error(t('toast.invalidFileFormat'));
        return;
      }
      
      // 验证文件大小
      if (!validateFileSize(file, maxSize)) {
        toast.error(t('toast.fileTooLarge'));
        return;
      }

      // 按模型限制参考图数量
      const modelMaxImages = getModelMaxImages(model);
      const selectedIds = selectedVideoIds.length > 0 ? selectedVideoIds : (selectedVideoId ? [selectedVideoId] : []);
      const isVideoItem = (v: CanvasVideo) => v.type === 'video' || v.type === 'placeholder' || /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(v.url);
      const currentImageCount = selectedIds.filter((id) => {
        const v = canvasVideos.find((item) => item.id === id);
        return v && !isVideoItem(v);
      }).length;
      if (modelMaxImages === 0 || currentImageCount >= modelMaxImages) {
        const modelLabel = VIDEO_MODEL_CONFIGS[model]?.label ?? model;
        toast.error(t('textToVideo.maxImagesExceeded', { modelName: modelLabel, count: modelMaxImages }));
        return;
      }
      
      // 生成临时ID
      const tempId = `img-${Date.now()}`;
      
      // 创建本地URL用于预览
      const previewUrl = URL.createObjectURL(file);
      const dimensions = await getImageDimensions(previewUrl);
      
      // 将图片作为CanvasVideo添加到画布
      const tempVideo: CanvasVideo = {
        id: tempId,
        url: previewUrl,
        x: 300 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        width: dimensions.width,
        height: dimensions.height,
        prompt: file.name,
        type: 'image',
      };
      
      // 添加到画布
      setCanvasVideos(prev => [...prev, tempVideo]);
      setSelectedVideoId(tempId);
      
      // 标记为上传中
      setUploadingFiles(prev => new Map(prev.set(tempId, { progress: 0, id: tempId })));
      
      // 上传文件到OSS
      const uploadResult = await uploadFile(file, (progress) => {
        // 更新上传进度
        setUploadingFiles(prev => new Map(prev.set(tempId, { progress, id: tempId })));
      });
      
      // 上传成功，更新图片URL为OSS返回的URL
      setCanvasVideos(prev =>
        prev.map(video => {
          if (video.id === tempId) {
            // 释放本地URL
            URL.revokeObjectURL(video.url);
            return {
              ...video,
              url: uploadResult.url,
              // 存储ossKey，便于后续使用
              ossKey: uploadResult.ossKey,
            };
          }
          return video;
        })
      );
      
      // 清除上传状态
      setUploadingFiles(prev => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
      
      // 保存生成结果到数据库
      if (currentSessionId) {
        try {
          const saveResponse = await saveGenerationResult(currentSessionId, {
            generation: {
              model: model,
              size: size,
              prompt: file.name,
              status: 'success',
            },
            asset: {
              type: 'image',
              sourceUrl: uploadResult.url,
              seq: 1,
              width: dimensions.width,
              height: dimensions.height,
            },
            message: {
              type: 'system',
              content: t('toast.generationComplete'),
              status: 'complete',
              resultSummary: t('toast.imageAddedToCanvas'),
            },
            canvasItem: {
              x: tempVideo.x,
              y: tempVideo.y,
              width: dimensions.width,
              height: dimensions.height,
              rotate: 0,
              visible: true,
              zindex: canvasVideos.length + 1,
            },
          });
          
          // 存储canvasItemId，便于后续更新
          if (saveResponse.success && saveResponse.data) {
            canvasItemIdMap.current.set(tempId, saveResponse.data.canvasItemId);
          }
          
          // 刷新历史记录并拉取当前会话详情，仅刷新聊天栏
          await loadSessions(1, false);
          const detailRes = await getSessionDetail(String(currentSessionId));
          if (detailRes.success && detailRes.data) applySessionMessagesToState(detailRes.data);
        } catch (error) {
          console.error('Failed to save uploaded image:', error);
        }
      }
      
      toast.success(t('toast.imageAddedToCanvas'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : t('toast.imageUploadFailed'));
      
      // 清除上传状态
      setUploadingFiles(prev => new Map());
    }
  }, [t, getImageDimensions, currentSessionId, model, size, canvasVideos, selectedVideoIds, selectedVideoId, saveGenerationResult, loadSessions, getSessionDetail, applySessionMessagesToState]);

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
    
    // 检查是否有文件
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // 处理所有拖放的文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 只处理图片文件
        if (file.type.startsWith('image/')) {
          handleUploadImage(file);
        }
      }
      return;
    }
    
    // 处理从画布拖拽的元素
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
  }, [handleAddSelectedVideo, handleUploadImage]);

  // 参考图数量是否超过当前模型限制（超过则不允许提交）
  const isOverImageLimit = (() => {
    const maxImages = getModelMaxImages(model);
    const ids = selectedVideoIds.length > 0 ? selectedVideoIds : (selectedVideoId ? [selectedVideoId] : []);
    const isVideo = (v: CanvasVideo) => v.type === 'video' || v.type === 'placeholder' || /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(v.url);
    const count = ids.filter((id) => {
      const v = canvasVideos.find((item) => item.id === id);
      return v && !isVideo(v);
    }).length;
    return count > maxImages;
  })();

  // 处理生成视频
  const handleGenerate = useCallback(async () => {
    if (!currentSessionId || !prompt.trim() || isGenerating) return;

    const modelMaxImages = getModelMaxImages(model);
    const selectedIds = selectedVideoIds.length > 0 ? selectedVideoIds : (selectedVideoId ? [selectedVideoId] : []);
    const isVideoItem = (v: CanvasVideo) => v.type === 'video' || v.type === 'placeholder' || /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(v.url);
    const currentImageCount = selectedIds.filter((id) => {
      const v = canvasVideos.find((item) => item.id === id);
      return v && !isVideoItem(v);
    }).length;
    if (currentImageCount > modelMaxImages) {
      const modelLabel = VIDEO_MODEL_CONFIGS[model]?.label ?? model;
      toast.error(t('textToVideo.maxImagesExceeded', { modelName: modelLabel, count: modelMaxImages }));
      return;
    }

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
      // 参考图：画布选中的图片 URL 列表（图生视频，最多 1 个）
      const sourceImages: string[] = [];
      const selectedCanvasVideoIds = selectedVideoIds.length > 0
        ? selectedVideoIds
        : selectedVideoId
          ? [selectedVideoId]
          : [];
      if (selectedCanvasVideoIds.length > 0) {
        const selectedImage = canvasVideos.find(
          v =>
            selectedCanvasVideoIds.includes(v.id) &&
            (v.type === 'image' || v.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        );
        if (selectedImage && !sourceImages.includes(selectedImage.url)) {
          sourceImages.push(selectedImage.url);
        }
      }

      const [ratioW, ratioH] = size.includes(':') ? size.split(':').map(Number) : size.split('x').map(Number);
      const rW = ratioW || 16;
      const rH = ratioH || 9;
      const maxSize = 400;
      const placeholderSize = rW >= rH
        ? { width: maxSize, height: Math.round(maxSize * rH / rW) }
        : { width: Math.round(maxSize * rW / rH), height: maxSize };
      const existingRects = [
        ...canvasVideos.map(v => ({ x: v.x, y: v.y, width: v.width, height: v.height })),
        ...taskPlaceholders.map(p => ({ x: p.x, y: p.y, width: p.width, height: p.height })),
      ];
      const position = findNonOverlappingPosition(
        { width: placeholderSize.width, height: placeholderSize.height },
        existingRects,
        300,
        200,
        10,
        10,
        100,
        12
      );

      const response = await submitVideoTask(currentSessionId, {
        modelName: model,
        modelVersion: getModelVersion(model),
        prompt: currentPrompt,
        duration: parseInt(seconds, 10),
        aspectRatio: ensureAspectRatioEnum(size),
        resolution: resolutionOptions.length > 0 ? resolution : undefined,
        ...(modelSupportsEnhanceSwitch(model) && { enhanceSwitch: enhanceSwitch }), // 字符串：Enabled | Disabled
        sourceImages: sourceImages.length > 0 ? sourceImages : undefined,
        canvasItem: {
          x: position.x,
          y: position.y,
          width: placeholderSize.width,
          height: placeholderSize.height,
          rotate: 0,
          visible: true,
          zindex: canvasVideos.length,
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.msg || 'Submit video task failed');
      }

      const data = response.data;
      // 任务 id 使用 video-tasks 返回的 generationId，轮询时请求 /api/tools/gen/sessions/{会话id}/tasks/{generationId}
      const queueItem: VideoTaskQueueItem = {
        taskId: String(data.generationId),
        messageId: systemMessage.id,
        sessionId: currentSessionId,
        prompt: currentPrompt,
        model: model,
        seconds: seconds,
        size: size,
        status: 'queued',
        progress: 0,
        createdAt: Date.now(),
      };
      addTaskToQueue(queueItem);
      
      // 更新消息状态为排队中
      setMessages(prev =>
        prev.map(msg =>
          msg.id === systemMessage.id
            ? {
                ...msg,
                status: 'queued',
                content: t('toast.taskQueued'),
                progress: 0,
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
      toast.error(`${t('toast.generationFailed')}: ${errorMessage}`);
      setIsGenerating(false);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id 
            ? { 
                ...msg, 
                status: 'failed',
                content: t('toast.generationFailedWithMessage', { message: errorMessage }),
              }
            : msg
        )
      );
    }
  }, [prompt, isGenerating, model, seconds, size, resolution, resolutionOptions, enhanceSwitch, modelSupportsEnhanceSwitch, selectedVideoIds, selectedVideoId, canvasVideos, taskPlaceholders, t, getVideoDimensions, handleAddSelectedVideo, currentSessionId, getModelMaxImages, VIDEO_MODEL_CONFIGS]);

  // 轮询会话任务状态（/api/tools/gen/sessions/{id}/tasks/{任务id}），会话 id、任务 id 均为字符串原样传递
  const pollSessionTaskWithCancel = useCallback(
    (
      sessionId: string | number,
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
            const res = await getTaskStatus(sessionId, taskId);
            if (!res.success || !res.data) throw new Error(res.msg || 'Get task status failed');
            const d = res.data;
            const status: VideoTaskResponse = {
              task_id: taskId,
              status: d.status as 'queued' | 'processing' | 'completed' | 'failed',
              progress: d.progress ?? 0,
              video_url: d.downloadUrl,
              error_message: d.failMessage,
              error_code: d.failCode,
            };
            if (onProgress) onProgress(status);
            if (d.status === 'completed') return status;
            if (d.status === 'failed') {
              throw new Error(d.failMessage || 'Video generation failed');
            }
            await new Promise(r => setTimeout(r, interval));
            attempts++;
          } catch (err) {
            if (cancelled) throw new Error('Task polling cancelled');
            throw err;
          }
        }
        if (cancelled) throw new Error('Task polling cancelled');
        throw new Error('Task polling timeout');
      })();

      return { promise, cancel };
    },
    []
  );

  // 根据视频尺寸计算占位符尺寸
  const calculatePlaceholderDimensions = useCallback((size: string): { width: number; height: number } => {
    // 解析尺寸比例，如 "16:9" 或 "9:16"
    const [widthRatio, heightRatio] = size.split(':').map(Number);
    if (!widthRatio || !heightRatio) {
      // 如果解析失败，使用默认尺寸
      return { width: 400, height: 300 };
    }
    
    const aspectRatio = widthRatio / heightRatio;
    const maxSize = 400; // 最大尺寸限制
    
    let width: number;
    let height: number;
    
    if (aspectRatio >= 1) {
      // 横向或方形（16:9, 1:1等）
      width = maxSize;
      height = maxSize / aspectRatio;
    } else {
      // 纵向（9:16等）
      height = maxSize;
      width = maxSize * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }, []);

  // 将任务队列转换为画布占位符（仅展示当前会话的进行中任务）
  const updatePlaceholdersFromQueue = useCallback(() => {
    const queue = getTaskQueue();
    const pendingTasks = queue
      .filter(
        t =>
          (t.status === 'queued' || t.status === 'processing') &&
          t.sessionId != null &&
          String(t.sessionId) === String(currentSessionId)
      )
      .sort((a, b) => a.createdAt - b.createdAt);
    
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
          
          // 根据视频尺寸计算占位符尺寸
          const placeholderDimensions = calculatePlaceholderDimensions(task.size);
          
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
            placeholderDimensions,
            allExistingRects,
            300,
            200,
            10,
            10,
            100,
            12
          );
          
          const newPlaceholder: CanvasVideo = {
            id: `placeholder-${task.taskId}`,
            url: '', // 占位符没有URL
            x: position.x,
            y: position.y,
            width: placeholderDimensions.width,
            height: placeholderDimensions.height,
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
  }, [calculatePlaceholderDimensions, currentSessionId]);
  
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
              content: t('toast.generatingVideo'),
              progress: task.progress,
            }
          : msg
      )
    );

    if (!task.sessionId) {
      throw new Error('Session ID is required for task polling');
    }

    try {
      // 轮询 /api/tools/gen/sessions/{id}/tasks/{任务id}，任务 id 为字符串原样传递
      const { promise, cancel } = pollSessionTaskWithCancel(
        task.sessionId,
        task.taskId,
        (status: VideoTaskResponse) => {
          // 更新进度和状态
          updateTaskInQueue(task.taskId, { 
            status: status.status as 'queued' | 'processing' | 'completed' | 'failed',
            progress: status.progress ?? 0
          });
          
          // 与文生图一致：已完成或失败时延迟从队列移除
          if (status.status === 'completed' || status.status === 'failed') {
            setTimeout(() => removeTaskFromQueue(task.taskId), 1000);
          }
          
          // 根据状态生成不同的消息内容
          let content = '';
          if (status.status === 'processing') {
            const progressText = status.progress !== undefined ? ` ${status.progress}%` : '';
            content = t('toast.generatingVideo') + progressText;
          } else if (status.status === 'queued') {
            content = t('toast.taskQueued');
          } else if (status.status === 'failed') {
            content = status.error_message || t('toast.videoGenerationFailed');
          }
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === task.messageId 
                ? { 
                    ...msg, 
                    status: status.status,
                    progress: status.progress ?? 0,
                    content: content || msg.content,
                  }
                : msg
            )
          );
          
          // 更新占位符进度和状态
          setTaskPlaceholders(prev => 
            prev.map(placeholder => 
              placeholder.taskId === task.taskId
                ? { 
                    ...placeholder, 
                    progress: status.progress ?? 0,
                    status: status.status,
                  }
                : placeholder
            )
          );
        }
      );
      
      // 保存取消函数
      activePollingTasksRef.current.set(task.taskId, { cancel });

      const finalStatus = await promise;

      // 检查任务是否失败
      if (finalStatus.status === 'failed') {
        const errorMsg = finalStatus.error_message || t('toast.videoGenerationFailed');
        throw new Error(errorMsg);
      }

      // 检查是否有视频 URL
      if (!finalStatus.video_url) {
        if (finalStatus.status === 'completed') {
          throw new Error(t('toast.videoCompleteNoUrlRetry'));
        }
        throw new Error(t('toast.noVideoUrl'));
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
                  t('toast.videoUnderstanding', { prompt: task.prompt }),
                  t('toast.durationLabel', { seconds: task.seconds }),
                  t('toast.sizeLabel', { size: task.size }),
                ],
                resultSummary: t('toast.videoGenerationComplete'),
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
          taskId: finalStatus.task_id,
          type: 'video',
        };
        
        // 添加到视频列表（使用函数式更新确保不覆盖其他更新）
        setCanvasVideos(prevVideos => {
          // 检查是否已存在相同ID的视频，避免重复添加
          const exists = prevVideos.find(v => v.id === newVideo.id);
          if (exists) {
            return prevVideos;
          }
          return [...prevVideos, newVideo];
        });
        setSelectedVideoId(newVideo.id);
        handleAddSelectedVideo(newVideo);

        // 任务完成后拉会话详情与会话历史
        const sessionIdToUse = task.sessionId || currentSessionId;
        if (sessionIdToUse) {
          try {
            await getSessionDetail(sessionIdToUse.toString());
            await loadSessions(1, false);
          } catch (e) {
            console.error('Failed to refresh session after video task:', e);
          }
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
          10,
          10,
          100,
          12
          );

          const newVideo: CanvasVideo = {
            id: `video-${Date.now()}`,
            url: videoUrl,
            x: position.x,
            y: position.y,
            width: dimensions.width,
            height: dimensions.height,
            prompt: task.prompt,
            taskId: finalStatus.task_id,
            type: 'video',
          };
          
          setSelectedVideoId(newVideo.id);
          handleAddSelectedVideo(newVideo);

          const sessionIdToUse = task.sessionId || currentSessionId;
          if (sessionIdToUse) {
            getSessionDetail(sessionIdToUse.toString()).catch(e => console.error('Failed to get session detail:', e));
            loadSessions(1, false).catch(e => console.error('Failed to load sessions:', e));
          }

          return [...prevVideos, newVideo];
        });
      }
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
      
      // 更新任务状态为失败
      updateTaskInQueue(task.taskId, { 
        status: 'failed',
        progress: 0,
      });
      
      // 生成友好的错误消息
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('AigcVideoTask not found')) {
        userFriendlyMessage = t('toast.taskNotFound');
      } else if (errorMessage.includes('No video URL') || errorMessage.includes('video URL not available')) {
        userFriendlyMessage = t('toast.videoCompleteNoUrl');
      } else if (errorMessage.includes('Task failed with error code')) {
        userFriendlyMessage = t('toast.videoFailedCheckPrompt');
      }
      
      // 更新消息为失败状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === task.messageId 
            ? { 
                ...msg, 
                status: 'failed',
                progress: 0,
                content: t('toast.generationFailedWithMessage', { message: userFriendlyMessage }),
              }
            : msg
        )
      );
      
      // 更新占位符状态为失败
      setTaskPlaceholders(prev => 
        prev.map(placeholder => 
          placeholder.taskId === task.taskId
            ? { 
                ...placeholder, 
                status: 'failed' as const,
                progress: 0,
              }
            : placeholder
        )
      );
      
      removeTaskFromQueue(task.taskId);
      toast.error(`${t('toast.taskFailed')}: ${userFriendlyMessage}`);
    } finally {
      activePollingTasksRef.current.delete(task.taskId);
      isProcessingQueueRef.current = false;
      setTimeout(() => processTaskQueueRef.current?.(), 100);
    }
  }, [t, getVideoDimensions, handleAddSelectedVideo, pollSessionTaskWithCancel, loadSessions, getSessionDetail]);

  // 处理任务队列（与文生图一致：最多同时 3 个、FIFO、用 ref 续跑）
  const processTaskQueue = useCallback(() => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    const queue = getTaskQueue();
    const activeCount = activePollingTasksRef.current.size;
    const maxConcurrent = 3;
    const pending = queue
      .filter(
        t => t.status === 'queued' || (t.status === 'processing' && !activePollingTasksRef.current.has(t.taskId))
      )
      .sort((a, b) => a.createdAt - b.createdAt);
    if (activeCount < maxConcurrent && pending.length > 0) {
      const next = pending[0];
      updateTaskInQueue(next.taskId, { status: 'processing' });
      processSingleTask(next).finally(() => {
        isProcessingQueueRef.current = false;
        setTimeout(() => processTaskQueueRef.current?.(), 100);
      });
    } else {
      isProcessingQueueRef.current = false;
    }
  }, [processSingleTask]);
  processTaskQueueRef.current = processTaskQueue;

  // 页面初始化：仅清理已完成/失败任务；聊天与占位符由「加载会话」时按当前会话恢复（与文生图一致）
  useEffect(() => {
    const queue = getTaskQueue();
    if (queue.length > 0) {
      const completedOrFailedTasks = queue.filter(t => t.status === 'completed' || t.status === 'failed');
      completedOrFailedTasks.forEach(task => removeTaskFromQueue(task.taskId));
    }
    
    // 清理函数：文生视频页面离开时关闭所有轮询定时器，取消正在进行的轮询
    return () => {
      activePollingTasksRef.current.forEach(({ cancel }) => {
        try {
          cancel();
        } catch (error) {
          console.error('Error cancelling polling task:', error);
        }
      });
      activePollingTasksRef.current.clear();
      isProcessingQueueRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅挂载时执行，卸载时执行 cleanup 关闭轮询

  // processTaskQueue 就绪后延迟启动队列消费（与文生图一致）
  useEffect(() => {
    if (!processTaskQueueRef.current) return;
    const queue = getTaskQueue();
    if (queue.length > 0) {
      const timer = setTimeout(() => {
        if (processTaskQueueRef.current) processTaskQueueRef.current();
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processTaskQueue]);

  // 监听任务队列变化，定时更新占位符（与文生图一致：用 ref 保证取到最新 currentSessionId）
  useEffect(() => {
    updatePlaceholdersFromQueueRef.current?.();
    const interval = setInterval(() => {
      updatePlaceholdersFromQueueRef.current?.();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  // 处理视频双击
  const handleVideoDoubleClick = useCallback((video: CanvasVideo) => {
    // 占位符不应该打开查看器
    if (video.type === 'placeholder' || !video.url) {
      return;
    }
    // 找到当前视频/图片在画布中的索引（只计算 canvasVideos，不包括 taskPlaceholders）
    const index = canvasVideos.findIndex(v => v.id === video.id);
    if (index !== -1) {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  }, [canvasVideos]);

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
        await loadSessions(1, false);
      } catch (error) {
        console.error('Failed to delete canvas items:', error);
        toast.error(t('toast.deleteFailed'));
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
    
    toast.success(`${t('toast.deletedItems')} ${idsToDelete.length} ${t('toast.items')}`);
  }, [selectedVideoIds, selectedVideoId, t, loadSessions]);

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
    
    if (videosToCopy.length === 1) {
      // 单个复制，保持向后兼容
      setCopiedVideo(videosToCopy[0]);
      setCopiedVideos([]);
      // 存储到 sessionStorage
      const isVideo = videosToCopy[0].type === 'video' || isVideoUrl(videosToCopy[0].url);
      const item = {
        id: videosToCopy[0].id,
        url: videosToCopy[0].url,
        type: isVideo ? 'video' as const : 'image' as const,
        prompt: videosToCopy[0].prompt,
        width: videosToCopy[0].width,
        height: videosToCopy[0].height,
      };
      sessionStorage.setItem('canvasCopiedItems', JSON.stringify([item]));
      window.dispatchEvent(new Event('canvasCopiedItemsChanged'));
    } else {
      // 批量复制
      setCopiedVideos(videosToCopy);
      setCopiedVideo(null);
      // 存储到 sessionStorage
      const items = videosToCopy.map(v => {
        const isVideo = v.type === 'video' || isVideoUrl(v.url);
        return {
          id: v.id,
          url: v.url,
          type: isVideo ? 'video' as const : 'image' as const,
          prompt: v.prompt,
          width: v.width,
          height: v.height,
        };
      });
      sessionStorage.setItem('canvasCopiedItems', JSON.stringify(items));
      window.dispatchEvent(new Event('canvasCopiedItemsChanged'));
    }
    
    try {
      const videoUrls = videosToCopy.map(v => v.url);
      await navigator.clipboard.writeText(JSON.stringify(videoUrls));
      toast.success(`${t('toast.copiedVideos')} ${videosToCopy.length} ${t('toast.videos')}`);
    } catch (err) {
      toast.error(t('toast.copyFailed'));
    }
  }, [selectedVideoIds, canvasVideos, t, isVideoUrl]);

  // 处理键盘快捷键（复制粘贴），与操作栏、右键拷贝逻辑一致：多选走批量拷贝，单选走单视频画布内拷贝
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const hasMulti = selectedVideoIds.length > 1;
        const hasSingle = selectedVideoIds.length === 1 || selectedVideoId;
        if (hasMulti) {
          handleBatchCopyVideos();
        } else if (hasSingle) {
          if (selectedVideoIds.length === 1) {
            handleBatchCopyVideos();
          } else {
            const video = canvasVideos.find(v => v.id === selectedVideoId);
            if (video) handleCopyVideo(video);
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && (copiedVideo || copiedVideos.length > 0)) {
        handlePasteVideo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideoId, selectedVideoIds, canvasVideos, copiedVideo, copiedVideos.length, handleCopyVideo, handlePasteVideo, handleBatchCopyVideos]);

  // 画布剪切：先拷贝再删除，与右键菜单一致
  const handleCutVideo = useCallback(async () => {
    const hasMulti = selectedVideoIds.length > 1;
    const hasSingle = selectedVideoIds.length === 1 || selectedVideoId;
    if (hasMulti) {
      await handleBatchCopyVideos();
    } else if (hasSingle) {
      if (selectedVideoIds.length === 1) {
        await handleBatchCopyVideos();
      } else {
        const video = canvasVideos.find(v => v.id === selectedVideoId);
        if (video) handleCopyVideo(video);
      }
    }
    await handleDeleteVideo();
  }, [selectedVideoId, selectedVideoIds, canvasVideos, handleCopyVideo, handleBatchCopyVideos, handleDeleteVideo]);

  // 处理批量下载视频（走后端 /tools/download，避免前端直连 OSS 导致 CORS/net::ERR_FAILED）
  const handleBatchDownloadVideos = useCallback(async () => {
    const videosToDownload = selectedVideoIds.length > 1
      ? canvasVideos.filter(v => selectedVideoIds.includes(v.id))
      : selectedVideoId
        ? canvasVideos.filter(v => v.id === selectedVideoId)
        : [];
    const withUrl = videosToDownload.filter(v => !!v.url);
    if (withUrl.length === 0) return;
    if (withUrl.length > 6) {
      toast.error(t('toast.downloadMaxSix'));
      return;
    }
    const urls = withUrl.slice(0, 6).map(v => v.url);
    setIsDownloading(true);
    try {
      const blob = await toolsDownloadByUrls(urls);
      const ext = urls.length === 1 && /\.(mp4|webm|mov|avi|gif|png|jpg|jpeg|webp)(\?|$)/i.test(urls[0])
        ? (urls[0].match(/\.(mp4|webm|mov|avi|gif|png|jpg|jpeg|webp)/i)?.[1] ?? 'bin')
        : 'zip';
      const filename = urls.length === 1 ? `download.${ext}` : `videos-${Date.now()}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('toast.downloadVideoStarted'));
    } catch (err) {
      console.error('Download failed:', err);
      toast.error(`${t('toast.downloadFailed')}: ${err instanceof Error ? err.message : t('toast.unknownError')}`);
    } finally {
      setIsDownloading(false);
    }
  }, [selectedVideoIds, selectedVideoId, canvasVideos, t]);

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
    resolution,
    setResolution,
    enhanceSwitch,
    setEnhanceSwitch,
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
    copiedVideos,
    highlightedVideoId,
    chatPanelWidth,
    isResizing,
    isDownloading,
    isChatPanelCollapsed,
    handleToggleChatPanel,
    canvasView,
    currentSessionId,
    deletingVideoIds,
    addingVideoIds,
    isOverImageLimit,
    
    // Config
    models,
    secondsOptions,
    sizesOptions,
    resolutionOptions,
    enhanceSwitchSupported,
    historySessions,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    isInitializing,
    isLoadingSession,
    
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
    handleCutVideo,
    handleBatchCopyVideos,
    handleBatchDownloadVideos,
    handleResizeStart,
    handleUploadImage,
    
    // Utils
    cleanMessageContent,
    
    // Viewer
    viewerOpen,
    setViewerOpen,
    viewerIndex,
  };
}
