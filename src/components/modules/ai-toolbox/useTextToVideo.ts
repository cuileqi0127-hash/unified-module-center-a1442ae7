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
  uploadMediaFile,
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
}

// 任务队列项
interface VideoTaskQueueItem {
  taskId: string;
  messageId: string;
  sessionId: number | null; // 保存会话ID，确保任务完成后能正确入库
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
  const [copiedVideos, setCopiedVideos] = useState<CanvasVideo[]>([]); // 批量复制的视频数组
  const [highlightedVideoId, setHighlightedVideoId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [chatPanelWidth, setChatPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [taskPlaceholders, setTaskPlaceholders] = useState<CanvasVideo[]>([]);
  
  // 会话管理状态
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [historySessions, setHistorySessions] = useState<Array<{ id: string; title: string; timestamp: Date; assetCount: number }>>([]);
  const [historyPage, setHistoryPage] = useState(1); // 当前页码
  const [hasMoreHistory, setHasMoreHistory] = useState(true); // 是否还有更多历史记录
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // 是否正在加载历史记录
  const [isInitializing, setIsInitializing] = useState(true); // 是否正在初始化（首次加载历史记录）
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
              title: session.title || (isZh ? '未命名会话' : 'Untitled Session'),
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
  }, [isZh, isLoadingHistory]);
  
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
                  status: msg.status === 'complete' ? 'completed' : msg.status === 'processing' ? 'processing' : 'queued',
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
                        isZh ? `图片理解：${generation.prompt}` : `Image Understanding: ${generation.prompt}`
                      );
                    }
                    
                    // 添加尺寸信息
                    if (generation.size) {
                      designThoughts.push(
                        isZh ? `尺寸：${generation.size}` : `Size: ${generation.size}`
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
              
              // 按时间戳排序
              restoredMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
              
              setMessages(restoredMessages);
            }
          }
        } catch (error) {
          console.error('Failed to load first session:', error);
        }
      } else {
        // 3. 如果历史记录列表数组长度 == 0，自动创建新会话
        try {
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
            await loadSessions(1, false);
          }
        } catch (error) {
          console.error('Failed to create session:', error);
          toast.error(isZh ? '创建会话失败' : 'Failed to create session');
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
        await loadSessions(1, false);
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
                  status: msg.status === 'complete' ? 'completed' : msg.status === 'processing' ? 'processing' : 'queued',
                  resultSummary: msg.resultSummary,
                };
                
                // 如果消息有 generationId，从 generations 中获取详细信息
                if (msg.generationId) {
                  const generation = generationsMap.get(msg.generationId.toString());
                  if (generation) {
                    // 构建 designThoughts 数组
                    const designThoughts: string[] = [];
                    
                    // 添加视频理解（使用 generation.prompt）
                    if (generation.prompt) {
                      designThoughts.push(
                        isZh ? `视频理解：${generation.prompt}` : `Video Understanding: ${generation.prompt}`
                      );
                    }
                    
                    // 添加时长信息（从 session.settings.seconds 获取）
                    const videoSeconds = session.settings?.seconds;
                    if (videoSeconds) {
                      designThoughts.push(
                        isZh ? `时长：${videoSeconds}秒` : `Duration: ${videoSeconds}s`
                      );
                    }
                    
                    // 添加尺寸信息
                    if (generation.size) {
                      designThoughts.push(
                        isZh ? `尺寸：${generation.size}` : `Size: ${generation.size}`
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
          
          // 按时间戳排序
          restoredMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
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
    toast.success(isZh ? '已复制到剪贴板，可在新画布粘贴' : 'Copied to clipboard, can paste in new canvas');
  }, [isZh, isVideoUrl]);

  // 处理粘贴视频
  const handlePasteVideo = useCallback(async () => {
    // 优先处理批量粘贴
    if (copiedVideos.length > 0) {
      const newVideos: CanvasVideo[] = [];
      const existingRects = canvasVideos.map(v => ({
        x: v.x,
        y: v.y,
        width: v.width,
        height: v.height,
      }));

      // 批量粘贴多个视频/图片
      for (let i = 0; i < copiedVideos.length; i++) {
        const copiedItem = copiedVideos[i];
        const isVideo = copiedItem.type === 'video' || isVideoUrl(copiedItem.url);
        const dimensions = isVideo 
          ? await getVideoDimensions(copiedItem.url)
          : await getImageDimensions(copiedItem.url);
        const position = findNonOverlappingPosition(
          { width: dimensions.width, height: dimensions.height },
          [...existingRects, ...newVideos.map(v => ({
            x: v.x,
            y: v.y,
            width: v.width,
            height: v.height,
          }))]
        );
        
        const newVideo: CanvasVideo = {
          ...copiedItem,
          id: isVideo ? `video-${Date.now()}-${i}` : `img-${Date.now()}-${i}`,
          x: position.x,
          y: position.y,
          width: dimensions.width,
          height: dimensions.height,
          type: copiedItem.type || (isVideo ? 'video' : 'image'),
        };
        newVideos.push(newVideo);
        existingRects.push({
          x: position.x,
          y: position.y,
          width: dimensions.width,
          height: dimensions.height,
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
                  prompt: newVideo.prompt || (isZh ? (isVideo ? '复制粘贴的视频' : '复制粘贴的图片') : (isVideo ? 'Pasted video' : 'Pasted image')),
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
                  content: isZh ? '生成完成' : 'Generation complete',
                  status: 'complete',
                  resultSummary: isZh 
                    ? `已粘贴${isVideo ? '视频' : '图片'}到画布`
                    : `${isVideo ? 'Video' : 'Image'} pasted to canvas`,
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
          // 刷新历史记录
          await loadSessions(1, false);
        } catch (error) {
          console.error('Failed to save pasted videos/images:', error);
        }
      }
      
      toast.success(isZh ? `已粘贴 ${newVideos.length} 个项目到画布` : `Pasted ${newVideos.length} items to canvas`);
      return;
    }

    // 单个粘贴
    if (copiedVideo) {
      const isVideo = copiedVideo.type === 'video' || isVideoUrl(copiedVideo.url);
      const dimensions = isVideo 
        ? await getVideoDimensions(copiedVideo.url)
        : await getImageDimensions(copiedVideo.url);
      const position = findNonOverlappingPosition(
        { width: dimensions.width, height: dimensions.height },
        canvasVideos.map(v => ({
          x: v.x,
          y: v.y,
          width: v.width,
          height: v.height,
        }))
      );
      const newVideo: CanvasVideo = {
        ...copiedVideo,
        id: isVideo ? `video-${Date.now()}` : `img-${Date.now()}`,
        x: position.x,
        y: position.y,
        width: dimensions.width,
        height: dimensions.height,
        type: copiedVideo.type || (isVideo ? 'video' : 'image'),
      };
      setCanvasVideos(prev => [...prev, newVideo]);
      setSelectedVideoId(newVideo.id);
      setCopiedVideo(null);
      
      // 保存生成结果到数据库
      if (currentSessionId) {
        try {
          const saveResponse = await saveGenerationResult(currentSessionId, {
            generation: {
              model: model,
              size: size,
              prompt: copiedVideo.prompt || (isZh ? (isVideo ? '复制粘贴的视频' : '复制粘贴的图片') : (isVideo ? 'Pasted video' : 'Pasted image')),
              status: 'success',
              ...(isVideo && seconds ? { seconds } : {}),
            },
            asset: {
              type: isVideo ? 'video' : 'image',
              sourceUrl: copiedVideo.url,
              seq: 1,
              width: dimensions.width,
              height: dimensions.height,
              ...(isVideo && seconds ? { duration: parseInt(seconds, 10) } : {}),
            },
            message: {
              type: 'system',
              content: isZh ? '生成完成' : 'Generation complete',
              status: 'complete',
              resultSummary: isZh 
                ? `已粘贴${isVideo ? '视频' : '图片'}到画布`
                : `${isVideo ? 'Video' : 'Image'} pasted to canvas`,
            },
            canvasItem: {
              x: position.x,
              y: position.y,
              width: dimensions.width,
              height: dimensions.height,
              rotate: 0,
              visible: true,
              zindex: canvasVideos.length,
            },
          });

          if (saveResponse.success && saveResponse.data) {
            // 保存画布元素ID映射
            canvasItemIdMap.current.set(newVideo.id, saveResponse.data.canvasItemId);
            // 刷新历史记录
            await loadSessions(1, false);
          }
        } catch (error) {
          console.error('Failed to save pasted video/image:', error);
        }
      }
      
      toast.success(isZh ? '已粘贴到画布' : 'Pasted to canvas');
    }
  }, [copiedVideo, copiedVideos, isZh, getVideoDimensions, getImageDimensions, isVideoUrl, currentSessionId, model, size, seconds, canvasVideos, loadSessions]);

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
      // 获取参考图片（从画布选中的图层中筛选出图片，只选择第一个）
      let fileId: string | undefined;
      const selectedCanvasVideoIds = selectedVideoIds.length > 0 
        ? selectedVideoIds 
        : selectedVideoId 
          ? [selectedVideoId] 
          : [];
      
      // 如果有选中的图层，筛选出图片类型，只选择第一个
      if (selectedCanvasVideoIds.length > 0) {
        // 找到第一个图片类型的图层
        const selectedImage = canvasVideos.find(v => 
          selectedCanvasVideoIds.includes(v.id) && 
          (v.type === 'image' || v.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        );
        
        if (selectedImage) {
          try {
            // 从 URL 获取图片文件
            const imageResponse = await fetch(selectedImage.url);
            const imageBlob = await imageResponse.blob();
            const imageFile = new File([imageBlob], 'image.jpg', { type: imageBlob.type });
            
            // 上传图片获取 fileId
            const uploadResponse = await uploadMediaFile(imageFile);
            fileId = uploadResponse.fileId;
          } catch (uploadError) {
            console.error('Failed to upload image:', uploadError);
            toast.error(isZh ? '图片上传失败，将使用无参考图模式' : 'Image upload failed, using no reference mode');
          }
        }
      }

      // 创建视频生成任务
      const taskResponse = await createVideoTask({
        model: model,
        prompt: currentPrompt,
        seconds: seconds as any,
        size: size as any,
        fileId: fileId,
        watermark: false, // 默认不添加水印
      });

      // 将任务添加到队列
      const queueItem: VideoTaskQueueItem = {
        taskId: taskResponse.task_id,
        messageId: systemMessage.id,
        sessionId: currentSessionId, // 保存会话ID，确保任务完成后能正确入库
        prompt: currentPrompt,
        model: model,
        seconds: seconds,
        size: size,
        status: 'queued',
        progress: taskResponse.progress,
        createdAt: Date.now(),
        referenceFile: fileId,
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
  }, [calculatePlaceholderDimensions]);
  
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
          // 更新进度和状态
          updateTaskInQueue(task.taskId, { 
            status: status.status as 'queued' | 'processing' | 'completed' | 'failed',
            progress: status.progress ?? 0
          });
          
          // 如果任务已完成（progress 100% 或 status completed），立即从队列中删除
          if (status.status === 'completed' || (status.progress !== undefined && status.progress >= 100)) {
            // 延迟删除，确保状态更新完成
            setTimeout(() => {
              removeTaskFromQueue(task.taskId);
            }, 1000);
          }
          
          // 根据状态生成不同的消息内容
          let content = '';
          if (status.status === 'processing') {
            const progressText = status.progress !== undefined ? ` ${status.progress}%` : '';
            content = isZh 
              ? `视频生成中...${progressText}` 
              : `Generating video...${progressText}`;
          } else if (status.status === 'queued') {
            content = isZh ? '任务排队中...' : 'Task queued...';
          } else if (status.status === 'failed') {
            content = status.error_message || (isZh ? '视频生成失败' : 'Video generation failed');
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
        const errorMsg = finalStatus.error_message || (isZh ? '视频生成失败' : 'Video generation failed');
        throw new Error(errorMsg);
      }
      
      // 检查是否有视频 URL
      if (!finalStatus.video_url) {
        // 如果状态是 completed 但没有 video_url，可能是 URL 还未生成，等待一下
        if (finalStatus.status === 'completed') {
          throw new Error(isZh ? '视频生成完成但未获取到视频链接，请稍后重试' : 'Video generation completed but video URL not available, please retry later');
        }
        throw new Error(isZh ? '未获取到视频链接' : 'No video URL in response');
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
        
        // 保存生成结果到数据库（使用任务中保存的 sessionId）
        const sessionIdToUse = task.sessionId || currentSessionId;
        if (sessionIdToUse) {
          saveGenerationResult(sessionIdToUse, {
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
            taskId: finalStatus.task_id,
            type: 'video',
          };
          
          setSelectedVideoId(newVideo.id);
          handleAddSelectedVideo(newVideo);
          
          // 保存生成结果到数据库（使用任务中保存的 sessionId）
          const sessionIdToUse = task.sessionId || currentSessionId;
          if (sessionIdToUse) {
            saveGenerationResult(sessionIdToUse, {
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
                await loadSessions(1, false);
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
      
      // 更新任务状态为失败
      updateTaskInQueue(task.taskId, { 
        status: 'failed',
        progress: 0,
      });
      
      // 生成友好的错误消息
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('AigcVideoTask not found')) {
        userFriendlyMessage = isZh ? '任务信息未找到，可能任务已过期' : 'Task information not found, task may have expired';
      } else if (errorMessage.includes('No video URL') || errorMessage.includes('video URL not available')) {
        userFriendlyMessage = isZh ? '视频生成完成但未获取到视频链接' : 'Video generation completed but video URL not available';
      } else if (errorMessage.includes('Task failed with error code')) {
        userFriendlyMessage = isZh ? '视频生成失败，请检查提示词或重试' : 'Video generation failed, please check prompt or retry';
      }
      
      // 更新消息为失败状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === task.messageId 
            ? { 
                ...msg, 
                status: 'failed',
                progress: 0,
                content: isZh ? `生成失败：${userFriendlyMessage}` : `Generation failed: ${userFriendlyMessage}`,
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
      
      // 从队列中移除失败的任务
      removeTaskFromQueue(task.taskId);
      activePollingTasksRef.current.delete(task.taskId);
      
      // 显示错误提示
      toast.error(isZh ? `任务失败：${userFriendlyMessage}` : `Task failed: ${userFriendlyMessage}`);
      
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

  // 页面初始化时恢复任务队列处理，离开页面时关闭轮询
  useEffect(() => {
    // 进入页面：检查缓存数组长度，如果大于0则开启队列轮询
    const queue = getTaskQueue();
    
    if (queue.length > 0) {
      // 分离已完成/失败的任务和待处理的任务
      const completedOrFailedTasks = queue.filter(t => t.status === 'completed' || t.status === 'failed');
      const pendingTasks = queue.filter(t => t.status === 'queued' || t.status === 'processing');
      
      // 清理已完成和失败的任务（从缓存中删除）
      completedOrFailedTasks.forEach(task => {
        removeTaskFromQueue(task.taskId);
      });
      
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
      
      // 更新占位符（只针对待处理的任务）
      updatePlaceholdersFromQueueRef.current?.();
    }
    
    // 清理函数：离开页面时自动关闭所有轮询
    return () => {
      // 取消所有正在进行的轮询任务
      activePollingTasksRef.current.forEach(({ cancel }) => {
        try {
          cancel();
        } catch (error) {
          console.error('Error cancelling polling task:', error);
        }
      });
      // 清空轮询任务映射
      activePollingTasksRef.current.clear();
      // 重置队列处理状态
      isProcessingQueueRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次，卸载时清理

  // 在 processTaskQueue 准备好后，检查并启动轮询
  useEffect(() => {
    // 确保 processTaskQueue 已经定义
    if (!processTaskQueueRef.current) return;
    
    // 检查缓存数组长度，如果大于0则开启队列轮询
    const queue = getTaskQueue();
    if (queue.length > 0) {
      // 延迟一下确保所有状态都已恢复
      const timer = setTimeout(() => {
        if (processTaskQueueRef.current) {
          processTaskQueueRef.current();
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processTaskQueue]); // 当 processTaskQueue 定义后执行

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
      toast.success(isZh ? `已复制 ${videosToCopy.length} 个视频` : `Copied ${videosToCopy.length} videos`);
    } catch (err) {
      toast.error(isZh ? '复制失败' : 'Copy failed');
    }
  }, [selectedVideoIds, canvasVideos, isZh, isVideoUrl]);

  // 处理批量下载视频
  const handleBatchDownloadVideos = useCallback(async () => {
    const videosToDownload = selectedVideoIds.length > 1
      ? canvasVideos.filter(v => selectedVideoIds.includes(v.id))
      : selectedVideoId
        ? canvasVideos.filter(v => v.id === selectedVideoId)
        : [];
    
    if (videosToDownload.length === 0) return;
    
    try {
      // 如果只有一个文件，直接下载
      if (videosToDownload.length === 1) {
        const video = videosToDownload[0];
        const a = document.createElement('a');
        a.href = video.url;
        a.download = `video-${video.id}.mp4`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(isZh ? '已开始下载视频' : 'Started downloading video');
        return;
      }
      
      // 多个文件，打包成 zip 下载
      // @ts-ignore - JSZip 类型定义
      let JSZip: any;
      try {
        // @ts-ignore - JSZip 动态导入
        JSZip = (await import('jszip')).default;
      } catch (err) {
        // 如果 jszip 未安装，提示用户并逐个下载
        toast.error(isZh ? '请先安装 jszip: npm install jszip，将逐个下载文件' : 'Please install jszip: npm install jszip, will download files one by one');
        // 逐个下载
        for (const video of videosToDownload) {
          const a = document.createElement('a');
          a.href = video.url;
          a.download = `video-${video.id}.mp4`;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return;
      }
      
      const zip = new JSZip();
      
      // 显示加载提示
      const loadingToast = toast.loading(isZh ? `正在打包 ${videosToDownload.length} 个视频...` : `Packing ${videosToDownload.length} videos...`);
      
      // 获取文件并添加到 zip
      let successCount = 0;
      for (let i = 0; i < videosToDownload.length; i++) {
        const video = videosToDownload[i];
        try {
          // 使用 XMLHttpRequest 获取文件（可以处理 CORS）
          const blob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', video.url, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
              if (xhr.status === 200) {
                resolve(xhr.response);
              } else {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));
            xhr.timeout = 30000; // 30秒超时
            xhr.send();
          });
          zip.file(`video-${video.id}.mp4`, blob);
          successCount++;
        } catch (err) {
          console.error(`Failed to fetch video ${video.id}:`, err);
          // 继续处理其他文件
        }
      }
      
      if (successCount === 0) {
        toast.dismiss(loadingToast);
        toast.error(isZh ? '所有文件下载失败，请检查网络连接' : 'All files failed to download, please check network connection');
        return;
      }
      
      // 生成 zip 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `videos-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
      
      toast.dismiss(loadingToast);
      toast.success(isZh ? `已下载 ${successCount}/${videosToDownload.length} 个视频（压缩包）` : `Downloaded ${successCount}/${videosToDownload.length} videos (zip)`);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error(isZh ? `下载失败: ${err instanceof Error ? err.message : '未知错误'}` : `Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
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
    copiedVideos,
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
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    isInitializing,
    
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
    
    // Viewer
    viewerOpen,
    setViewerOpen,
    viewerIndex,
  };
}
