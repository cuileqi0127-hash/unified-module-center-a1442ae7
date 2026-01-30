/**
 * Text-to-Image Business Logic Hook
 * 文生图业务逻辑层
 * 
 * 将业务逻辑与视图层分离，便于维护和测试
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
  generateImage, 
  extractImageUrls, 
  extractRevisedPrompt,
  type ImageModel 
} from '@/services/imageGenerationApi';
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
  getModelList,
  getModelSizes,
  getModelDefaultSize,
  isValidSizeForModel,
  getWorkModes,
  DEFAULT_MODEL,
} from './textToImageConfig';
import { type SelectedImage } from './ImageCapsule';

// 类型定义
export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  content: string;
  image?: string;
  video?: string;
  timestamp: Date;
  status?: 'thinking' | 'analyzing' | 'designing' | 'optimizing' | 'complete';
  designThoughts?: string[];
  resultSummary?: string;
}

// 使用统一的媒体项类型（支持图片和视频）
export interface CanvasImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
  type?: 'image' | 'video'; // 媒体类型
}

const mockHistory: ChatMessage[] = [];
const initialCanvasImages: CanvasImage[] = [];

export function useTextToImage() {
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
  const [workMode, setWorkMode] = useState('text-to-image');
  const [showHistory, setShowHistory] = useState(false);
  const [model, setModel] = useState<ImageModel>(DEFAULT_MODEL);
  const [aspectRatio, setAspectRatio] = useState<string>(getModelDefaultSize(DEFAULT_MODEL));
  const [messages, setMessages] = useState<ChatMessage[]>(mockHistory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>(initialCanvasImages);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(new Set());
  const [addingImageIds, setAddingImageIds] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedImage, setCopiedImage] = useState<CanvasImage | null>(null);
  const [copiedImages, setCopiedImages] = useState<CanvasImage[]>([]); // 批量复制的图片数组
  const [highlightedImageId, setHighlightedImageId] = useState<string | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  
  // 会话管理状态
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [historySessions, setHistorySessions] = useState<Array<{ id: string; title: string; timestamp: Date; messageCount: number }>>([]);
  const [historyPage, setHistoryPage] = useState(1); // 当前页码
  const [hasMoreHistory, setHasMoreHistory] = useState(true); // 是否还有更多历史记录
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // 是否正在加载历史记录
  const [isInitializing, setIsInitializing] = useState(true); // 是否正在初始化（首次加载历史记录）
  const [canvasView, setCanvasView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  
  // 画布元素ID映射（用于更新数据库）
  const canvasItemIdMap = useRef<Map<string, number>>(new Map());

  // 配置数据
  const workModes = getWorkModes(isZh);
  const models = getModelList();
  const aspectRatios = getModelSizes(model);

  // 工具函数：获取图片尺寸
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

  // 工具函数：获取视频尺寸
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

  // 清理消息内容，移除 markdown 图片链接
  const cleanMessageContent = useCallback((content: string): string => {
    if (!content) return content;
    return content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
  }, []);

  // 当模型切换时，重置尺寸为对应模型的默认值
  useEffect(() => {
    if (!isValidSizeForModel(model, aspectRatio)) {
      const defaultSize = getModelDefaultSize(model);
      setAspectRatio(defaultSize);
    }
  }, [model, aspectRatio]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 查询会话列表（历史记录列表）
  // @param page 页码，从1开始，默认1
  // @param append 是否追加到现有列表（用于分页加载），默认false
  const loadSessions = useCallback(async (page: number = 1, append: boolean = false): Promise<Session[]> => {
    if (isLoadingHistory) return []; // 防止重复加载
    
    setIsLoadingHistory(true);
    try {
      const response = await getSessions('image', page, 10); // 每页10条
      if (response.success && response.data) {
        const sessions = response.data.list;
        const total = response.data.total || 0;
        
        // 为每个会话获取消息数量
        // 优化：如果后端已经返回 messageCount，直接使用；否则获取详情
        const sessionsWithMessageCount = await Promise.all(
          sessions.map(async (session: Session) => {
            let messageCount = session.messageCount ?? 0;
            
            // 如果后端没有返回 messageCount，则获取详情
            // if (messageCount === 0 && session.messageCount === undefined) {
            //   try {
            //     const detailResponse = await getSessionDetail(session.id.toString());
            //     if (detailResponse.success && detailResponse.data?.messages) {
            //       messageCount = detailResponse.data.messages.length;
            //     }
            //   } catch (error) {
            //     // 如果获取详情失败，消息数量保持为 0
            //     console.error(`Failed to get message count for session ${session.id}:`, error);
            //   }
            // }
            
            return {
              id: session.id.toString(),
              title: session.title || (isZh ? '未命名会话' : 'Untitled Session'),
              timestamp: new Date(session.createTime || Date.now()),
              messageCount,
            };
          })
        );
        
        if (append) {
          // 追加模式：追加到现有列表
          setHistorySessions(prev => {
            const newList = [...prev, ...sessionsWithMessageCount];
            // 判断是否还有更多数据
            setHasMoreHistory(newList.length < total);
            return newList;
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
            
            // 恢复画布元素（图片）
            if (session.canvasItems && session.assets && session.generations) {
              const assetsMap = new Map(session.assets.map(asset => [asset.id, asset]));
              const generationsMap = new Map(session.generations.map(gen => [gen.id.toString(), gen]));
              
              const restoredImages: CanvasImage[] = session.canvasItems
                .map(item => {
                  const asset = assetsMap.get(item.assetId);
                  if (!asset || asset.type !== 'image') return null;
                  
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
                  
                  const imageItem: CanvasImage = {
                    id: `item-${item.id}`,
                    url: asset.downloadUrl || asset.ossKey || '',
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    type: 'image',
                    prompt,
                  };
                  
                  return imageItem;
                })
                .filter((item): item is CanvasImage => item !== null);
              
              setCanvasImages(restoredImages);
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
                  status: msg.status === 'complete' ? 'complete' : undefined,
                  resultSummary: msg.resultSummary,
                };
                
                // 如果消息有 generationId，从 generations 中获取详细信息
                if (msg.generationId) {
                  const generation = generationsMap.get(msg.generationId.toString());
                  if (generation) {
                    // 构建 designThoughts 数组
                    const designThoughts: string[] = [];
                    
                    // 添加图片理解（使用 generation.prompt，这是 revised prompt）
                    if (generation.prompt) {
                      designThoughts.push(
                        isZh ? `图片理解：${generation.prompt}` : `Image Understanding: ${generation.prompt}`
                      );
                    }
                    
                    // 添加尺寸信息
                    if (generation.size) {
                      const model = session.settings?.model || 'gpt-image-1.5';
                      const isSeedreamModel = model === 'doubao-seedream-4-5-251128';
                      designThoughts.push(
                        isSeedreamModel
                          ? (isZh ? `尺寸：${generation.size}` : `Size: ${generation.size}`)
                          : (isZh ? `画面比例：${generation.size}` : `Aspect Ratio: ${generation.size}`)
                      );
                    }
                    
                    if (designThoughts.length > 0) {
                      systemMessage.designThoughts = designThoughts;
                    }
                  }
                }
                
                // 如果有关联的资产，恢复图片URL
                if (msg.assetId && assetsMap.has(msg.assetId)) {
                  const asset = assetsMap.get(msg.assetId)!;
                  if (asset.type === 'image') {
                    systemMessage.image = asset.downloadUrl || asset.ossKey || '';
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
            taskType: 'image',
            settings: {
              model,
              size: aspectRatio,
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

  // 处理新对话
  const handleNewConversation = useCallback(async () => {
    // 先清空聊天栏和画布数据
    setMessages([]);
    setSelectedImages([]);
    setPrompt('');
    setCanvasImages([]);
    setSelectedImageId(null);
    setSelectedImageIds([]);
    setCanvasView({ zoom: 1, pan: { x: 0, y: 0 } });
    canvasItemIdMap.current.clear();
    
    try {
      // 创建新会话
      const response = await createSession({
        title: isZh ? '新会话' : 'New Session',
        taskType: 'image',
        settings: {
          model,
          size: aspectRatio,
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
  }, [model, aspectRatio, isZh, loadSessions]);

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
          
          const restoredImages: CanvasImage[] = session.canvasItems
            .map(item => {
              const asset = assetsMap.get(item.assetId);
              if (!asset || asset.type !== 'image') return null;
              
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
              
              const imageItem: CanvasImage = {
                id: `item-${item.id}`,
                url: asset.downloadUrl || asset.ossKey || '',
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                type: 'image',
                prompt,
              };
              
              return imageItem;
            })
            .filter((item): item is CanvasImage => item !== null);
          
          setCanvasImages(restoredImages);
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
                  status: msg.status === 'complete' ? 'complete' : undefined,
                  resultSummary: msg.resultSummary,
                };
                
                // 如果消息有 generationId，从 generations 中获取详细信息
                if (msg.generationId) {
                  const generation = generationsMap.get(msg.generationId.toString());
                  if (generation) {
                    // 构建 designThoughts 数组
                    const designThoughts: string[] = [];
                    
                    // 添加图片理解（使用 generation.prompt，这是 revised prompt）
                    if (generation.prompt) {
                      designThoughts.push(
                        isZh ? `图片理解：${generation.prompt}` : `Image Understanding: ${generation.prompt}`
                      );
                    }
                    
                    // 添加尺寸信息
                    if (generation.size) {
                      const model = session.settings?.model || 'gpt-image-1.5';
                      const isSeedreamModel = model === 'doubao-seedream-4-5-251128';
                      designThoughts.push(
                        isSeedreamModel
                          ? (isZh ? `尺寸：${generation.size}` : `Size: ${generation.size}`)
                          : (isZh ? `画面比例：${generation.size}` : `Aspect Ratio: ${generation.size}`)
                      );
                    }
                    
                    if (designThoughts.length > 0) {
                      systemMessage.designThoughts = designThoughts;
                    }
                  }
                }
                
                // 如果有关联的资产，恢复图片URL
                if (msg.assetId && assetsMap.has(msg.assetId)) {
                  const asset = assetsMap.get(msg.assetId)!;
                  if (asset.type === 'image') {
                    systemMessage.image = asset.downloadUrl || asset.ossKey || '';
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

  // 处理图片移动
  const handleImageMove = useCallback((id: string, x: number, y: number) => {
    setCanvasImages(prev =>
      prev.map(img => {
        if (img.id === id) {
          // 更新数据库
          const canvasItemId = canvasItemIdMap.current.get(id);
          if (canvasItemId) {
            debouncedUpdateCanvasItem(canvasItemId, x, y);
          }
          return { ...img, x, y };
        }
        return img;
      })
    );
  }, [debouncedUpdateCanvasItem]);
  
  // 处理图片尺寸变化
  const handleImageResize = useCallback((id: string, width: number, height: number) => {
    setCanvasImages(prev =>
      prev.map(img => {
        if (img.id === id) {
          // 更新数据库
          const canvasItemId = canvasItemIdMap.current.get(id);
          if (canvasItemId) {
            debouncedUpdateCanvasItem(canvasItemId, img.x, img.y, width, height);
          }
          return { ...img, width, height };
        }
        return img;
      })
    );
  }, [debouncedUpdateCanvasItem]);

  // 处理添加选中图片到输入框
  const handleAddSelectedImage = useCallback((image: SelectedImage) => {
    const selectedImage: SelectedImage = {
      id: image.id,
      url: image.url,
      prompt: image.prompt,
    };
    
    setSelectedImages(prev => {
      if (prev.some(img => img.id === image.id)) {
        toast.info(isZh ? '该图片已在输入框中' : 'Image already attached');
        return prev;
      }
      return [...prev, selectedImage];
    });
    
    setHighlightedImageId(image.id);
    toast.success(isZh ? '已添加到输入框' : 'Added to input');
    
    setTimeout(() => {
      setHighlightedImageId(null);
    }, 600);
  }, [isZh]);

  // 处理移除选中图片
  const handleRemoveSelectedImage = useCallback((id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // 处理复制图片
  const handleCopyImage = useCallback((image: CanvasImage) => {
    setCopiedImage(image);
    // 存储到 sessionStorage，供其他页面使用
    sessionStorage.setItem('canvasCopiedItems', JSON.stringify([{
      id: image.id,
      url: image.url,
      type: 'image',
      prompt: image.prompt,
      width: image.width,
      height: image.height,
    }]));
    toast.success(isZh ? '已复制到剪贴板，可在新画布粘贴' : 'Copied to clipboard, can paste in new canvas');
  }, [isZh]);

  // 判断URL是否为视频
  const isVideoUrl = useCallback((url: string): boolean => {
    return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(url) || url.includes('video');
  }, []);

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
              const isVideo = item.type === 'video' || isVideoUrl(item.url);
              setCopiedImage({
                id: item.id,
                url: item.url,
                type: isVideo ? 'video' : 'image',
                prompt: item.prompt,
                x: 0,
                y: 0,
                width: item.width || 280,
                height: item.height || 280,
              });
              setCopiedImages([]);
            } else {
              setCopiedImages(items.map(item => {
                const isVideo = item.type === 'video' || isVideoUrl(item.url);
                return {
                  id: item.id,
                  url: item.url,
                  type: (isVideo ? 'video' : 'image') as 'image' | 'video',
                  prompt: item.prompt,
                  x: 0,
                  y: 0,
                  width: item.width || 280,
                  height: item.height || 280,
                };
              }));
              setCopiedImage(null);
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

  // 处理粘贴图片
  const handlePasteImage = useCallback(async () => {
    // 优先处理批量粘贴
    if (copiedImages.length > 0) {
      const newImages: CanvasImage[] = [];
      const existingRects = canvasImages.map(img => ({
        x: img.x,
        y: img.y,
        width: img.width,
        height: img.height,
      }));

      // 批量粘贴多个图片/视频
      for (let i = 0; i < copiedImages.length; i++) {
        const copiedImg = copiedImages[i];
        const isVideo = copiedImg.type === 'video' || isVideoUrl(copiedImg.url);
        // 根据类型获取尺寸
        const dimensions = isVideo 
          ? await getVideoDimensions(copiedImg.url)
          : await getImageDimensions(copiedImg.url);
        const position = findNonOverlappingPosition(
          { width: dimensions.width, height: dimensions.height },
          [...existingRects, ...newImages.map(img => ({
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
          }))]
        );
        
        const newImage: CanvasImage = {
          ...copiedImg,
          id: isVideo ? `video-${Date.now()}-${i}` : `img-${Date.now()}-${i}`,
          x: position.x,
          y: position.y,
          width: dimensions.width,
          height: dimensions.height,
          type: isVideo ? 'video' : 'image',
        };
        newImages.push(newImage);
        existingRects.push({
          x: position.x,
          y: position.y,
          width: dimensions.width,
          height: dimensions.height,
        });
      }

      // 添加到画布
      const newIds = newImages.map(img => img.id);
      setAddingImageIds(new Set(newIds));
      setCanvasImages(prev => [...prev, ...newImages]);
      setSelectedImageId(newImages[0]?.id || null);
      setSelectedImageIds(newIds);
      setCopiedImages([]);

      // 动画完成后清除新增状态
      setTimeout(() => {
        setAddingImageIds(new Set());
      }, 300);

      // 批量保存生成结果到数据库
      if (currentSessionId && newImages.length > 0) {
        try {
          const savePromises = newImages.map(async (newImage, index) => {
            const isVideo = newImage.type === 'video' || isVideoUrl(newImage.url);
            const dimensions = isVideo 
              ? await getVideoDimensions(newImage.url)
              : await getImageDimensions(newImage.url);
            return saveGenerationResult(currentSessionId, {
              generation: {
                model: model,
                size: aspectRatio,
                prompt: newImage.prompt || (isZh ? (isVideo ? `复制粘贴的视频 ${index + 1}` : `复制粘贴的图片 ${index + 1}`) : (isVideo ? `Pasted video ${index + 1}` : `Pasted image ${index + 1}`)),
                status: 'success',
              },
              asset: {
                type: isVideo ? 'video' : 'image',
                sourceUrl: newImage.url,
                seq: index + 1,
                width: dimensions.width,
                height: dimensions.height,
              },
              message: {
                type: 'system',
                content: isZh ? '生成完成' : 'Generation complete',
                status: 'complete',
                resultSummary: isZh 
                  ? `已粘贴图片到画布`
                  : `Image pasted to canvas`,
              },
              canvasItem: {
                x: newImage.x,
                y: newImage.y,
                width: dimensions.width,
                height: dimensions.height,
                rotate: 0,
                visible: true,
                zindex: canvasImages.length + index,
              },
            });
          });

          const saveResponses = await Promise.all(savePromises);
          saveResponses.forEach((saveResponse, index) => {
            if (saveResponse.success && saveResponse.data) {
              canvasItemIdMap.current.set(newImages[index].id, saveResponse.data.canvasItemId);
            }
          });

          // 刷新历史记录
          await loadSessions(1, false);
        } catch (error) {
          console.error('Failed to save pasted images:', error);
        }
      }

      const videoCount = newImages.filter(img => img.type === 'video' || isVideoUrl(img.url)).length;
      const imageCount = newImages.length - videoCount;
      if (videoCount > 0 && imageCount > 0) {
        toast.success(isZh ? `已粘贴 ${imageCount} 张图片和 ${videoCount} 个视频到画布` : `${imageCount} images and ${videoCount} videos pasted to canvas`);
      } else if (videoCount > 0) {
        toast.success(isZh ? `已粘贴 ${videoCount} 个视频到画布` : `${videoCount} videos pasted to canvas`);
      } else {
        toast.success(isZh ? `已粘贴 ${imageCount} 张图片到画布` : `${imageCount} images pasted to canvas`);
      }
      return;
    }

    // 单个粘贴（向后兼容）
    if (copiedImage) {
      const isVideo = copiedImage.type === 'video' || isVideoUrl(copiedImage.url);
      // 根据类型获取尺寸
      const dimensions = isVideo 
        ? await getVideoDimensions(copiedImage.url)
        : await getImageDimensions(copiedImage.url);
      const position = findNonOverlappingPosition(
        { width: dimensions.width, height: dimensions.height },
        canvasImages.map(img => ({
          x: img.x,
          y: img.y,
          width: img.width,
          height: img.height,
        }))
      );
      const newImage: CanvasImage = {
        ...copiedImage,
        id: isVideo ? `video-${Date.now()}` : `img-${Date.now()}`,
        x: position.x,
        y: position.y,
        width: dimensions.width,
        height: dimensions.height,
        type: isVideo ? 'video' : 'image',
      };
      
      // 先标记为新增中，触发动画
      setAddingImageIds(new Set([newImage.id]));
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setCopiedImage(null);
      
      // 动画完成后清除新增状态
      setTimeout(() => {
        setAddingImageIds(prev => {
          const next = new Set(prev);
          next.delete(newImage.id);
          return next;
        });
      }, 300);
      
      // 保存生成结果到数据库
      if (currentSessionId) {
        try {
          const isVideo = newImage.type === 'video' || isVideoUrl(newImage.url);
          const saveResponse = await saveGenerationResult(currentSessionId, {
            generation: {
              model: model,
              size: aspectRatio,
              prompt: copiedImage.prompt || (isZh ? (isVideo ? '复制粘贴的视频' : '复制粘贴的图片') : (isVideo ? 'Pasted video' : 'Pasted image')),
              status: 'success',
            },
            asset: {
              type: isVideo ? 'video' : 'image',
              sourceUrl: copiedImage.url,
              seq: 1,
              width: dimensions.width,
              height: dimensions.height,
            },
            message: {
              type: 'system',
              content: isZh ? '生成完成' : 'Generation complete',
              status: 'complete',
              resultSummary: isZh 
                ? (isVideo ? `已粘贴视频到画布` : `已粘贴图片到画布`)
                : (isVideo ? `Video pasted to canvas` : `Image pasted to canvas`),
            },
            canvasItem: {
              x: position.x,
              y: position.y,
              width: dimensions.width,
              height: dimensions.height,
              rotate: 0,
              visible: true,
              zindex: canvasImages.length,
            },
          });

          if (saveResponse.success && saveResponse.data) {
            // 保存画布元素ID映射
            canvasItemIdMap.current.set(newImage.id, saveResponse.data.canvasItemId);
            // 刷新历史记录
            await loadSessions(1, false);
          }
        } catch (error) {
          console.error('Failed to save pasted image:', error);
        }
      }
      
      toast.success(isZh ? '已粘贴图片到画布' : 'Image pasted to canvas');
    }
  }, [copiedImage, copiedImages, isZh, getImageDimensions, currentSessionId, model, aspectRatio, canvasImages, loadSessions]);

  // 处理上传图片到画布
  const handleUploadImage = useCallback(async (file: File) => {
    try {
      // 创建本地URL用于预览
      const imageUrl = URL.createObjectURL(file);
      const dimensions = await getImageDimensions(imageUrl);
      
      const newImage: CanvasImage = {
        id: `img-${Date.now()}`,
        url: imageUrl,
        x: 300 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        width: dimensions.width,
        height: dimensions.height,
        prompt: file.name,
        type: 'image',
      };
      
      // 先标记为新增中，触发动画
      setAddingImageIds(new Set([newImage.id]));
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      
      // 动画完成后清除新增状态
      setTimeout(() => {
        setAddingImageIds(prev => {
          const next = new Set(prev);
          next.delete(newImage.id);
          return next;
        });
      }, 300);
      
      toast.success(isZh ? '图片已添加到画布' : 'Image added to canvas');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(isZh ? '图片上传失败' : 'Image upload failed');
    }
  }, [isZh, getImageDimensions]);

  // 处理键盘快捷键（复制粘贴）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedImageId) {
        const image = canvasImages.find(img => img.id === selectedImageId);
        if (image) handleCopyImage(image);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedImage) {
        handlePasteImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, canvasImages, copiedImage, handleCopyImage, handlePasteImage]);

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
        const imageData = JSON.parse(data) as SelectedImage;
        handleAddSelectedImage(imageData);
      }
    } catch (err) {
      console.error('Failed to parse dropped image data:', err);
    }
  }, [handleAddSelectedImage]);

  // 处理生成图片
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
      status: 'thinking',
      designThoughts: [],
    };
    
    setMessages(prev => [...prev, systemMessage]);

    try {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id 
            ? { 
                ...msg, 
                status: 'designing',
                content: isZh ? '生成中...' : 'Generating...',
              }
            : msg
        )
      );

      // 只包含画布上选中的图片，不包含聊天框中的图片
      const referenceImages: string[] = [];
      
      const selectedCanvasImageIds = selectedImageIds.length > 0 
        ? selectedImageIds 
        : selectedImageId 
          ? [selectedImageId] 
          : [];
      
      selectedCanvasImageIds.forEach(id => {
        const selectedCanvasImage = canvasImages.find(img => img.id === id);
        if (selectedCanvasImage && !referenceImages.includes(selectedCanvasImage.url)) {
          referenceImages.push(selectedCanvasImage.url);
        }
      });

      const response = await generateImage({
        model: model,
        prompt: currentPrompt,
        image: referenceImages,
        n: 1,
        size: aspectRatio as any,
        response_format: 'url',
      });

      const imageUrls = extractImageUrls(response);
      if (imageUrls.length === 0) {
        throw new Error('No image URL in response');
      }

      const imageUrl = imageUrls[0];
      const revisedPrompt = extractRevisedPrompt(response) || currentPrompt;
      const dimensions = await getImageDimensions(imageUrl);

      setMessages(prev => 
        prev.map(msg => 
          msg.id === systemMessage.id 
            ? { 
                ...msg, 
                status: 'complete',
                image: imageUrl,
                designThoughts: [
                  isZh ? `图片理解：${revisedPrompt}` : `Image Understanding: ${revisedPrompt}`,
                  model === 'doubao-seedream-4-5-251128'
                    ? (isZh ? `尺寸：${aspectRatio}` : `Size: ${aspectRatio}`)
                    : (isZh ? `画面比例：${aspectRatio}` : `Aspect Ratio: ${aspectRatio}`),
                ],
                resultSummary: isZh 
                  ? `已完成图片生成，${model === 'doubao-seedream-4-5-251128' ? `输出尺寸为${aspectRatio}` : `输出比例为${aspectRatio}`}。`
                  : `Image generation complete, output ${model === 'doubao-seedream-4-5-251128' ? `size ${aspectRatio}` : `ratio ${aspectRatio}`}.`,
              }
            : msg
        )
      );
      
      // 计算不重叠的位置
      const existingRects = canvasImages.map(img => ({
        x: img.x,
        y: img.y,
        width: img.width,
        height: img.height,
      }));
      const position = findNonOverlappingPosition(
        { width: dimensions.width, height: dimensions.height },
        existingRects,
        300,
        200,
        50,
        50,
        100,
        30 // 图片之间的间隔 30 像素
      );

      const newImage: CanvasImage = {
        id: `img-${Date.now()}`,
        url: imageUrl,
        x: position.x,
        y: position.y,
        width: dimensions.width,
        height: dimensions.height,
        prompt: revisedPrompt,
        type: 'image',
      };
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      
      handleAddSelectedImage({
        id: newImage.id,
        url: newImage.url,
        prompt: newImage.prompt,
      });
      
      // 保存生成结果到数据库
      if (currentSessionId) {
        try {
          const saveResponse = await saveGenerationResult(currentSessionId, {
            generation: {
              model,
              size: aspectRatio,
              prompt: currentPrompt,
              status: 'success',
            },
            asset: {
              type: 'image',
              sourceUrl: imageUrl,
              seq: 1,
              width: dimensions.width,
              height: dimensions.height,
            },
            message: {
              type: 'system',
              content: isZh ? '生成完成' : 'Generation complete',
              status: 'complete',
              resultSummary: isZh 
                ? `已完成图片生成，${model === 'doubao-seedream-4-5-251128' ? `输出尺寸为${aspectRatio}` : `输出比例为${aspectRatio}`}。`
                : `Image generation complete, output ${model === 'doubao-seedream-4-5-251128' ? `size ${aspectRatio}` : `ratio ${aspectRatio}`}.`,
            },
            canvasItem: {
              x: position.x,
              y: position.y,
              width: dimensions.width,
              height: dimensions.height,
              rotate: 0,
              visible: true,
              zindex: canvasImages.length,
            },
            references: selectedImages.map(img => ({
              type: 'image' as const,
              sourceUrl: img.url,
              canvasItem: {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                rotate: 0,
                visible: false,
                zindex: 0,
              },
            })),
          });

          if (saveResponse.success && saveResponse.data) {
            // 保存画布元素ID映射
            canvasItemIdMap.current.set(newImage.id, saveResponse.data.canvasItemId);
            // 刷新历史记录
            await loadSessions(1, false);
          }
        } catch (error) {
          console.error('Failed to save generation result:', error);
          // 不阻止用户继续使用，只记录错误
        }
      }
      
      setIsGenerating(false);
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
                status: 'complete',
                content: isZh ? `生成失败：${errorMessage}` : `Generation failed: ${errorMessage}`,
              }
            : msg
        )
      );
    }
  }, [prompt, isGenerating, model, aspectRatio, selectedImages, selectedImageIds, selectedImageId, canvasImages, isZh, getImageDimensions, handleAddSelectedImage, currentSessionId, loadSessions]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  // 处理图片双击
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleImageDoubleClick = useCallback((image: CanvasImage) => {
    // 找到当前图片在画布中的索引
    const index = canvasImages.findIndex(img => img.id === image.id);
    if (index !== -1) {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  }, [canvasImages]);

  // 处理删除图片
  const handleDeleteImage = useCallback(async () => {
    // 获取要删除的图片ID列表
    const idsToDelete = selectedImageIds.length > 0 
      ? selectedImageIds 
      : selectedImageId 
        ? [selectedImageId] 
        : [];
    
    if (idsToDelete.length === 0) return;
    
    // 先标记为删除中，触发动画
    setDeletingImageIds(new Set(idsToDelete));
    
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
        setDeletingImageIds(new Set());
        return;
      }
    }
    
    // 从本地状态中移除
    if (selectedImageIds.length > 1) {
      setCanvasImages(prev => prev.filter(img => !selectedImageIds.includes(img.id)));
      // 清除ID映射
      selectedImageIds.forEach(id => canvasItemIdMap.current.delete(id));
      setSelectedImageIds([]);
      setSelectedImageId(null);
    } else if (selectedImageId) {
      setCanvasImages(prev => prev.filter(img => img.id !== selectedImageId));
      // 清除ID映射
      canvasItemIdMap.current.delete(selectedImageId);
      setSelectedImageId(null);
      setSelectedImageIds([]);
    }
    
    // 清除删除状态
    setDeletingImageIds(new Set());
    
    toast.success(isZh ? `已删除 ${idsToDelete.length} 个图层` : `Deleted ${idsToDelete.length} items`);
  }, [selectedImageIds, selectedImageId, isZh, loadSessions]);

  // 处理键盘删除快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框中，如果是则不处理删除
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // 处理删除键（Delete 或 Backspace）
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
        const hasSelection = selectedImageIds.length > 0 || selectedImageId;
        if (hasSelection) {
          e.preventDefault();
          handleDeleteImage();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, selectedImageIds, handleDeleteImage]);

  // 处理转移图片到文生视频页面
  const handleTransferToVideo = useCallback((onNavigate?: (itemId: string) => void) => {
    if (selectedImageIds.length > 0 || selectedImageId) {
      // 获取选中的图片
      const imagesToTransfer = selectedImageIds.length > 0
        ? canvasImages.filter(img => selectedImageIds.includes(img.id))
        : selectedImageId
          ? canvasImages.filter(img => img.id === selectedImageId)
          : [];
      
      if (imagesToTransfer.length > 0) {
        // 将图片数据存储到sessionStorage，供文生视频页面使用
        sessionStorage.setItem('transferredImages', JSON.stringify(imagesToTransfer));
        // 跳转到文生视频页面
        onNavigate?.('text-to-video');
        toast.success(isZh ? `已转移 ${imagesToTransfer.length} 张图片到文生视频页面` : `Transferred ${imagesToTransfer.length} images to video page`);
      }
    }
  }, [selectedImageIds, selectedImageId, canvasImages, isZh]);

  // 处理批量复制图片
  const handleBatchCopyImages = useCallback(async () => {
    if (selectedImageIds.length === 0) return;
    
    const imagesToCopy = canvasImages.filter(img => selectedImageIds.includes(img.id));
    if (imagesToCopy.length === 0) return;
    
    if (imagesToCopy.length === 1) {
      // 单个复制，保持向后兼容
      setCopiedImage(imagesToCopy[0]);
      setCopiedImages([]);
    } else {
      // 批量复制
      setCopiedImages(imagesToCopy);
      setCopiedImage(null);
    }
    
    try {
      const imageUrls = imagesToCopy.map(img => img.url);
      await navigator.clipboard.writeText(JSON.stringify(imageUrls));
      toast.success(isZh ? `已复制 ${imagesToCopy.length} 张图片` : `Copied ${imagesToCopy.length} images`);
    } catch (err) {
      toast.error(isZh ? '复制失败' : 'Copy failed');
    }
  }, [selectedImageIds, canvasImages, isZh]);

  // 处理批量下载图片
  const handleBatchDownloadImages = useCallback(async () => {
    const imagesToDownload = selectedImageIds.length > 1
      ? canvasImages.filter(img => selectedImageIds.includes(img.id))
      : selectedImageId
        ? canvasImages.filter(img => img.id === selectedImageId)
        : [];
    
    if (imagesToDownload.length === 0) return;
    
    for (const image of imagesToDownload) {
      try {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `image-${image.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download failed:', err);
      }
    }
    
    toast.success(isZh ? `已下载 ${imagesToDownload.length} 张图片` : `Downloaded ${imagesToDownload.length} images`);
  }, [selectedImageIds, selectedImageId, canvasImages, isZh]);

  // 处理复制单个图片
  const handleCopyImageToClipboard = useCallback(async (image: CanvasImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      toast.success(isZh ? '已复制图片' : 'Image copied');
    } catch (err) {
      toast.error(isZh ? '复制失败' : 'Copy failed');
    }
  }, [isZh]);

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
    aspectRatio,
    setAspectRatio,
    messages,
    isGenerating,
    canvasImages,
    selectedImageId,
    setSelectedImageId,
    selectedImageIds,
    setSelectedImageIds,
    selectedImages,
    isDragOver,
    copiedImage,
    copiedImages,
    highlightedImageId,
    chatPanelWidth,
    isResizing,
    isChatPanelCollapsed,
    handleToggleChatPanel,
    canvasView,
    currentSessionId,
    deletingImageIds,
    addingImageIds,
    
    // Config
    workModes,
    models,
    aspectRatios,
    historySessions,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    isInitializing,
    
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleImageMove,
    handleImageResize,
    handleViewChange,
    handleAddSelectedImage,
    handleRemoveSelectedImage,
    handleCopyImage,
    handlePasteImage,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleGenerate,
    handleKeyDown,
    handleImageDoubleClick,
    handleDeleteImage,
    handleBatchCopyImages,
    handleBatchDownloadImages,
    handleCopyImageToClipboard,
    handleResizeStart,
    handleUploadImage,
    handleTransferToVideo,
    
    // Utils
    cleanMessageContent,
    isZh,
    
    // Viewer
    viewerOpen,
    setViewerOpen,
    viewerIndex,
  };
}
