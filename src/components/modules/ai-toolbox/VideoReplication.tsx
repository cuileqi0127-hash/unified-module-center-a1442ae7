import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  Play, 
  X, 
  ChevronDown,
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Edit3,
  Check,
  Loader2,
  Trash2,
  Copy,
  Download,
  Clipboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UniversalCanvas, type CanvasMediaItem } from './UniversalCanvas';
import { MediaViewer } from './MediaViewer';
import { uploadVideoFile, uploadMediaFile, createVideoTask, getTaskStatus, pollTaskUntilComplete, type MediaUploadResponse, type VideoTaskResponse } from '@/services/videoReplicationApi';
import { getUserInfoFromCache } from '@/services/userApi';

interface VideoReplicationProps {
  onNavigate?: (itemId: string) => void;
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  originalPrompt: string;
  newPrompt: string;
  isEditing: boolean;
  thumbnail?: string;
  isSelected: boolean;
}

interface UploadedFile {
  id: string;
  type: 'video' | 'image' | 'text';
  name: string;
  url: string;
  thumbnail?: string;
  file?: File;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  video?: string;
  timestamp: Date;
  segmentId?: string;
}

// View state: 'upload' -> 'analyzing' -> 'prompts' -> 'chat'
type ViewState = 'upload' | 'analyzing' | 'prompts' | 'chat';

interface CanvasItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

// History interface for saving projects
interface ProjectHistoryItem {
  id: string;
  name: string;
  createdAt: Date;
  viewState: ViewState;
  originalVideoName: string | null;
  referenceImageName: string | null;
  sellingPoints: string;
  segmentsCount: number;
  // We store serializable data only (no blob URLs)
  segments: VideoSegment[];
  messages: Message[];
}

const HISTORY_STORAGE_KEY = 'video-replication-history';

// 缓存数据结构定义
interface VideoReplicationCache {
  "upload-video": {
    id: string;
    name: string;
    url: string;
    [key: string]: any;
  } | null;
  "upload-img": {
    id: string;
    name: string;
    url: string;
    fileId: string;
    [key: string]: any;
  } | null;
  "video": {
    id: string;
    name: string;
    url: string;
    [key: string]: any;
  } | null;
  timestamp: number;
}

// 生成缓存键
function generateCacheKey(): string {
  const userInfo = getUserInfoFromCache();
  const userId = userInfo?.id || 'anonymous';
  return `${userId}-reference-to-video`;
}

// 保存缓存
function saveCache(cacheData: VideoReplicationCache): void {
  try {
    const cacheKey = generateCacheKey();
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

// 读取缓存
function getCache(): VideoReplicationCache | null {
  try {
    const cacheKey = generateCacheKey();
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as VideoReplicationCache;
    }
  } catch (error) {
    console.error('Failed to get cache:', error);
  }
  return null;
}

// 清除缓存
function clearCache(): void {
  try {
    const cacheKey = generateCacheKey();
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

// 更新缓存中的特定字段
function updateCacheField(field: keyof VideoReplicationCache, data: any): void {
  try {
    const currentCache = getCache() || {
      "upload-video": null,
      "upload-img": null,
      "video": null,
      timestamp: Date.now(),
    };
    const updatedCache = {
      ...currentCache,
      [field]: data,
      timestamp: Date.now(),
    };
    saveCache(updatedCache);
  } catch (error) {
    console.error('Failed to update cache field:', error);
  }
}
// Call same-origin endpoint to avoid browser CORS issues (dev uses Vite proxy; prod should use backend/reverse-proxy).
const VIDEO_TO_PROMPT_API_URL = '/api/video-to-prompt';
const VIDEO_TO_PROMPT_TIMEOUT_MS = 300_000;

export function VideoReplication({ onNavigate }: VideoReplicationProps) {
  const { t } = useTranslation();
  // View state
  const [viewState, setViewState] = useState<ViewState>('upload');
  
  // Upload state
  const [originalVideo, setOriginalVideo] = useState<UploadedFile | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedFile | null>(null);
  const [sellingPoints, setSellingPoints] = useState<string>('');
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageFileId, setImageFileId] = useState<string>(''); // 存储图片上传后的fileId
  const [isReplicating, setIsReplicating] = useState(false); // 开始复刻的加载状态
  
  // Segmentation state
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState<string>('');
  
  // Dialog state for prompt editing
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPromptText, setDialogPromptText] = useState('');
  const [dialogSegmentId, setDialogSegmentId] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Canvas state
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<string | null>(null);
  const [selectedCanvasItemIds, setSelectedCanvasItemIds] = useState<string[]>([]);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<CanvasItem | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [deletingItemIds, setDeletingItemIds] = useState<Set<string>>(new Set());
  const [addingItemIds, setAddingItemIds] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  // 从缓存加载数据
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cachedData = getCache();
        if (cachedData) {
          // 检查缓存是否过期（24小时）
          const cacheAge = Date.now() - cachedData.timestamp;
          const maxCacheAge = 24 * 60 * 60 * 1000; // 24小时
          
          if (cacheAge > maxCacheAge) {
            // 缓存过期，清除缓存
            clearCache();
            return;
          }
          
          // 加载缓存的视频数据
          if (cachedData["upload-video"]) {
            const videoData = cachedData["upload-video"];
            setOriginalVideo({
              id: videoData.id,
              type: 'video' as const,
              name: videoData.name,
              url: videoData.url,
            });
            
            // 添加到画布
            setCanvasItems(prev => {
              const exists = prev.some(item => item.url === videoData.url);
              if (!exists) {
                return [...prev, {
                  id: videoData.id,
                  type: 'video' as const,
                  url: videoData.url,
                  name: videoData.name,
                  x: 50,
                  y: 50,
                  width: 320,
                  height: 180,
                }];
              }
              return prev;
            });
          }
          
          // 加载缓存的图片数据
          if (cachedData["upload-img"]) {
            const imgData = cachedData["upload-img"];
            setReferenceImage({
              id: imgData.id,
              type: 'image' as const,
              name: imgData.name,
              url: imgData.url,
            });
            setImageFileId(imgData.fileId);
            
            // 添加到画布
            setCanvasItems(prev => {
              const exists = prev.some(item => item.url === imgData.url);
              if (!exists) {
                return [...prev, {
                  id: imgData.id,
                  type: 'image' as const,
                  url: imgData.url,
                  name: imgData.name,
                  x: 400,
                  y: 50,
                  width: 200,
                  height: 200,
                }];
              }
              return prev;
            });
          }
          
          // 加载缓存的生成视频数据
          if (cachedData["video"]) {
            const genVideoData = cachedData["video"];
            setGeneratedVideo(genVideoData.url);
            
            // 添加到画布
            setCanvasItems(prev => {
              const exists = prev.some(item => item.url === genVideoData.url);
              if (!exists) {
                return [...prev, {
                  id: genVideoData.id,
                  type: 'video' as const,
                  url: genVideoData.url,
                  name: genVideoData.name,
                  x: 50,
                  y: 300,
                  width: 320,
                  height: 180,
                }];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load from cache:', error);
      }
    };
    
    loadFromCache();
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
              setCopiedItem({
                id: item.id,
                url: item.url,
                type: item.type,
                name: item.name || '',
                x: 0,
                y: 0,
                width: item.width || 320,
                height: item.height || 180,
                prompt: item.prompt,
              });
            } else {
              // 多个项目时，只取第一个作为 copiedItem
              const item = items[0];
              setCopiedItem({
                id: item.id,
                url: item.url,
                type: item.type,
                name: item.name || '',
                x: 0,
                y: 0,
                width: item.width || 320,
                height: item.height || 180,
                prompt: item.prompt,
              });
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
  }, []);
  
  // Canvas view state (for UniversalCanvas)
  const [canvasView, setCanvasView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  
  // Panel resize
  const [chatPanelWidth, setChatPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle video upload
  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error(t('videoReplication.uploadVideo'));
      return;
    }
    
    setIsVideoUploading(true);
    
    try {
      // 调用上传接口
      const res = await uploadVideoFile(file);
      console.log('Upload response:', res);
      
      // 如果返回数据中有 prompt_text，自动填充到商品卖点输入框
      if (res && res.prompt_text && typeof res.prompt_text === 'string') {
        setSellingPoints(res.prompt_text);
        toast.success(t('videoReplication.uploadSuccess'));
      }
      
      // 创建本地预览 URL
    const url = URL.createObjectURL(file);
    const videoId = crypto.randomUUID();
    
    // Check if replacing an existing item
    if (replacingItemId) {
      const oldItem = canvasItems.find(i => i.id === replacingItemId);
      setCanvasItems(prev => prev.map(item => 
        item.id === replacingItemId 
          ? { ...item, url, name: file.name }
          : item
      ));
      // Update sidebar state if the replaced item was the original video
      if (oldItem && originalVideo && oldItem.url === originalVideo.url) {
        const updatedVideo = {
          id: videoId,
          type: 'video' as const,
          name: file.name,
          url,
          file,
        };
        setOriginalVideo(updatedVideo);
        // 更新缓存
        updateCacheField('upload-video', updatedVideo);
      }
      setReplacingItemId(null);
      toast.success(t('videoReplication.videoReplaced'));
    } else {
      const newVideo = {
        id: videoId,
        type: 'video' as const,
        name: file.name,
        url,
        file,
      };
      setOriginalVideo(newVideo);
      
      // 更新缓存
      updateCacheField('upload-video', newVideo);
      
        // Add to canvas with animation
        setAddingItemIds(new Set([videoId]));
      setCanvasItems(prev => [...prev, {
          id: videoId,
        type: 'video' as const,
        url,
        name: file.name,
        x: 50,
        y: 50,
        width: 320,
        height: 180,
      }]);
        setTimeout(() => setAddingItemIds(new Set()), 300);
      
        if (!res || !res.prompt_text) {
      toast.success(t('videoReplication.uploadSuccess'));
    }
      }
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error(error instanceof Error ? error.message : t('videoReplication.uploadVideo'));
    } finally {
      setIsVideoUploading(false);
    // Reset input
    e.target.value = '';
    }
  }, [replacingItemId, canvasItems, originalVideo]);

  // Handle reference image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('videoReplication.uploadImageFirst'));
      return;
    }
    
    // Validate specific image formats
    const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP images are allowed');
      return;
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    setIsImageUploading(true);
    
    try {
      // 调用上传接口
      const res = await uploadMediaFile(file);
      console.log('Image upload response:', res);
      
      // 保存返回的 fileId
      if (res && res.fileId) {
        setImageFileId(res.fileId);
      }
      
      // 创建本地预览 URL
      const url = URL.createObjectURL(file);
      const imgId = crypto.randomUUID();
      const fileId = res.fileId;
      
      // Check if replacing an existing item
      if (replacingItemId) {
        const oldItem = canvasItems.find(i => i.id === replacingItemId);
        setCanvasItems(prev => prev.map(item => 
          item.id === replacingItemId 
            ? { ...item, url, name: file.name }
            : item
        ));
        // Update sidebar state if the replaced item was the reference image
        if (oldItem && referenceImage && oldItem.url === referenceImage.url) {
          const updatedImage = {
            id: imgId,
            type: 'image' as const,
            name: file.name,
            url,
            file,
          };
          setReferenceImage(updatedImage);
          setImageFileId(fileId);
          // 更新缓存
          updateCacheField('upload-img', {
            id: imgId,
            name: file.name,
            url,
            fileId,
          });
        }
        setReplacingItemId(null);
        toast.success(t('videoReplication.videoReplaced'));
      } else {
        const newImage = {
          id: imgId,
          type: 'image' as const,
          name: file.name,
          url,
          file,
        };
        setReferenceImage(newImage);
        setImageFileId(fileId);
        
        // 更新缓存
        updateCacheField('upload-img', {
          id: imgId,
          name: file.name,
          url,
          fileId,
        });
        
          // Add to canvas with animation
          setAddingItemIds(new Set([imgId]));
        setCanvasItems(prev => [...prev, {
            id: imgId,
          type: 'image' as const,
          url,
          name: file.name,
          x: 400,
          y: 50,
          width: 200,
          height: 200,
        }]);
          setTimeout(() => setAddingItemIds(new Set()), 300);
        
        toast.success(t('videoReplication.imageUploadSuccess'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsImageUploading(false);
      // Reset input
      e.target.value = '';
    }
  }, [replacingItemId, canvasItems, referenceImage]);

  // Start replication process
  const handleStartReplication = useCallback(async () => {
    if (!imageFileId) {
      toast.error('Please upload an image first');
      return;
    }
    
    if (!sellingPoints.trim()) {
      toast.error('Please enter selling points');
      return;
    }
    
    setIsReplicating(true);
    
    try {
      // Step 1: Call /aigc/create
      const createResponse = await createVideoTask({
        prompt: sellingPoints.trim(),
        fileId: imageFileId,
      });
      
      console.log('Create task response:', createResponse);
      
      if (!createResponse || !createResponse.task_id) {
        throw new Error('Failed to create task');
      }
      
      // Step 2: Poll /aigc/task until task completes
      const finalStatus = await pollTaskUntilComplete(
        createResponse.task_id,
        (status) => {
          console.log('Task progress:', status);
        }
      );
      
      console.log('Final task status:', finalStatus);
      
      // Check if video URL is available
      if (finalStatus.video_url) {
        const genVideoId = crypto.randomUUID();
        const genVideoName = t('videoReplication.title') + '_' + new Date().toISOString().slice(0, 10);
        
        // Add generated video to canvas
        setCanvasItems(prev => [...prev, {
          id: genVideoId,
          type: 'video' as const,
          url: finalStatus.video_url,
          name: genVideoName,
          x: 50,
          y: 300,
          width: 320,
          height: 180,
        }]);
        
        // 更新缓存
        updateCacheField('video', {
          id: genVideoId,
          name: genVideoName,
          url: finalStatus.video_url,
        });
        
        // Show success message with video URL
        toast.success('Replication completed successfully!');
      } else {
        throw new Error('Video generation completed but no video URL available');
      }
    } catch (error) {
      console.error('Replication error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start replication');
    } finally {
      setIsReplicating(false);
    }
  }, [imageFileId, sellingPoints, t]);



  // Handle prompt click - open dialog
  const handlePromptClick = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setDialogSegmentId(segmentId);
      setDialogPromptText(segment.newPrompt);
      setDialogOpen(true);
    }
  }, [segments]);

  // Quick entry for prompt editing view
  const handleModifyPrompts = useCallback(() => {
    if (!segments.length) return;
    setViewState('chat');
  }, [segments.length]);

  // Handle dialog send - save and enter chat view
  const handleDialogSend = useCallback(() => {
    if (dialogSegmentId && dialogPromptText.trim()) {
      // Update the segment's prompt
      setSegments(prev => prev.map(s => 
        s.id === dialogSegmentId 
          ? { ...s, newPrompt: dialogPromptText }
          : s
      ));
      
      // Add to messages
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: `${t('videoReplication.modifySegment')} ${dialogSegmentId} ${t('videoReplication.prompt')} ${dialogPromptText}`,
        timestamp: new Date(),
      }, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('videoReplication.promptUpdated'),
        timestamp: new Date(),
      }]);
      
      // Close dialog and enter chat view
      setDialogOpen(false);
      setDialogSegmentId(null);
      setDialogPromptText('');
      setViewState('chat');
      
      toast.success(t('videoReplication.saved'));
    }
  }, [dialogSegmentId, dialogPromptText]);

  // Handle segment selection (click = toggle single, ctrl+click = multi-select)
  const handleSegmentClick = useCallback((segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSegments(prev => {
      const newSet = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        // Multi-select mode
        if (newSet.has(segmentId)) {
          newSet.delete(segmentId);
        } else {
          newSet.add(segmentId);
        }
      } else {
        // Single select mode
        if (newSet.has(segmentId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(segmentId);
        }
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedSegments.size === segments.length) {
      setSelectedSegments(new Set());
    } else {
      setSelectedSegments(new Set(segments.map(s => s.id)));
    }
  }, [segments, selectedSegments]);

  // Handle double-click to edit
  const handleSegmentDoubleClick = useCallback((segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setEditingSegmentId(segmentId);
      setEditingPromptText(segment.newPrompt || segment.originalPrompt);
    }
  }, [segments]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (editingSegmentId) {
      setSegments(prev => prev.map(s => 
        s.id === editingSegmentId 
          ? { ...s, newPrompt: editingPromptText }
          : s
      ));
      setEditingSegmentId(null);
      setEditingPromptText('');
      toast.success(t('videoReplication.saved'));
    }
  }, [editingSegmentId, editingPromptText]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingSegmentId(null);
    setEditingPromptText('');
  }, []);

  // Handle chat message send
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    
    const selectedIds = Array.from(selectedSegments);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      segmentId: selectedIds.length === 1 ? selectedIds[0] : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);
    
    // Mock LLM response - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update selected segments' prompts
      if (selectedIds.length > 0) {
        setSegments(prev => prev.map(s => 
          selectedIds.includes(s.id)
            ? { ...s, newPrompt: `${s.newPrompt} [${t('videoReplication.modifySegment')}: ${inputMessage}]` }
            : s
        ));
      }
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: selectedIds.length === segments.length
          ? t('videoReplication.updateAllSegments')
          : selectedIds.length > 0
            ? `${t('videoReplication.updateSelectedSegments')} ${selectedIds.length} ${t('videoReplication.segmentsPrompt')}`
            : t('videoReplication.receivedFeedback'),
        timestamp: new Date(),
      };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsGenerating(false);
  }, [inputMessage, selectedSegments, segments.length]);

  // Handle video generation
  const handleGenerateVideo = useCallback(async () => {
    if (segments.length === 0 || !segments.some(s => s.newPrompt)) {
      toast.error(t('videoReplication.generatePromptFirst'));
      return;
    }
    
    setIsGenerating(true);
    
    // Mock video generation - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Use original video as mock result
    const mockGeneratedUrl = originalVideo?.url || '';
    setGeneratedVideo(mockGeneratedUrl);
    
    // Add to canvas
      setCanvasItems(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'video',
        url: mockGeneratedUrl,
        name: t('videoReplication.title') + '_' + new Date().toISOString().slice(0, 10),
        x: 50,
        y: 300,
        width: 320,
        height: 180,
      }]);
    
    setIsGenerating(false);
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: t('videoReplication.videoGenerated'),
      timestamp: new Date(),
    }]);
    
    toast.success(t('videoReplication.videoGenerationComplete'));
  }, [segments, originalVideo]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setChatPanelWidth(Math.max(25, Math.min(50, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Check if ready to analyze
  const canAnalyze = originalVideo && viewState === 'upload';
  const canGenerateVideo = segments.some(s => s.newPrompt) && !isGenerating;

  // Handle delete canvas items
  const handleDeleteCanvasItems = useCallback(() => {
    const idsToDelete = selectedCanvasItemIds.length > 0 ? selectedCanvasItemIds : (selectedCanvasItem ? [selectedCanvasItem] : []);
    if (idsToDelete.length === 0) return;

    // Add to deleting set for animation
    setDeletingItemIds(new Set(idsToDelete));
    
    // Remove after animation
      setTimeout(() => {
        setCanvasItems(prev => {
          const newItems = prev.filter(item => !idsToDelete.includes(item.id));
          // Sync with sidebar state
          idsToDelete.forEach(id => {
            const item = prev.find(i => i.id === id);
            if (item && originalVideo && item.url === originalVideo.url) {
              setOriginalVideo(null);
              // 清除视频缓存
              updateCacheField('upload-video', null);
            }
            if (item && referenceImage && item.url === referenceImage.url) {
              setReferenceImage(null);
              setImageFileId('');
              // 清除图片缓存
              updateCacheField('upload-img', null);
            }
            // 检查是否是生成的视频
            if (item && item.type === 'video' && !originalVideo?.url.includes(item.url) && !referenceImage?.url.includes(item.url)) {
              // 清除生成视频缓存
              updateCacheField('video', null);
            }
          });
          return newItems;
        });
        setSelectedCanvasItem(null);
        setSelectedCanvasItemIds([]);
        setDeletingItemIds(new Set());
        toast.success(idsToDelete.length > 1 ? `${t('videoReplication.deletedItems')} ${idsToDelete.length} ${t('videoReplication.items')}` : t('videoReplication.deleted'));
      }, 300);
  }, [selectedCanvasItem, selectedCanvasItemIds, originalVideo, referenceImage]);

  // Handle copy canvas items
  const handleCopyCanvasItems = useCallback(() => {
    const itemsToCopy = selectedCanvasItemIds.length > 0 
      ? canvasItems.filter(item => selectedCanvasItemIds.includes(item.id))
      : (selectedCanvasItem ? [canvasItems.find(item => item.id === selectedCanvasItem)] : []);
    
    if (itemsToCopy.length === 0 || itemsToCopy.some(item => !item)) return;

    const validItems = itemsToCopy.filter((item): item is CanvasItem => item !== undefined);
    if (validItems.length === 0) return;

    // Store copied items (for single item, store it; for multiple, store the first one as reference)
    if (validItems.length === 1) {
      setCopiedItem(validItems[0]);
    } else {
      // For multiple items, we'll copy all
      setCopiedItem(validItems[0]);
    }

    // 存储到 sessionStorage，供其他页面使用
    const items = validItems.map(item => ({
      id: item.id,
      url: item.url,
      type: item.type,
      prompt: item.prompt,
      width: item.width,
      height: item.height,
    }));
    sessionStorage.setItem('canvasCopiedItems', JSON.stringify(items));
    // 触发自定义事件，通知同页面内的其他组件
    window.dispatchEvent(new Event('canvasCopiedItemsChanged'));

    // Copy to clipboard (for single item)
    if (validItems.length === 1) {
      navigator.clipboard.writeText(JSON.stringify({
        type: validItems[0].type,
        url: validItems[0].url,
        name: validItems[0].name,
      })).catch(() => {});
    }

    toast.success(validItems.length > 1 ? `${t('videoReplication.copiedItems')} ${validItems.length} ${t('videoReplication.items')}` : t('videoReplication.copied'));
  }, [selectedCanvasItem, selectedCanvasItemIds, canvasItems]);

  // Handle paste canvas items
  const handlePasteCanvasItems = useCallback(() => {
    if (!copiedItem) return;

    const newItem: CanvasItem = {
      id: crypto.randomUUID(),
      type: copiedItem.type,
      url: copiedItem.url,
      name: copiedItem.name,
      x: copiedItem.x + 30,
      y: copiedItem.y + 30,
      width: copiedItem.width,
      height: copiedItem.height,
      prompt: copiedItem.prompt,
    };

    // Add to adding set for animation
    setAddingItemIds(new Set([newItem.id]));

    setCanvasItems(prev => [...prev, newItem]);
    
    // Clear adding animation after a delay
    setTimeout(() => {
      setAddingItemIds(new Set());
    }, 300);

    toast.success(t('videoReplication.pasted'));
  }, [copiedItem]);

  // Handle download canvas items
  const handleDownloadCanvasItems = useCallback(async () => {
    const itemsToDownload = selectedCanvasItemIds.length > 0
      ? canvasItems.filter(item => selectedCanvasItemIds.includes(item.id))
      : (selectedCanvasItem ? [canvasItems.find(item => item.id === selectedCanvasItem)] : []);

    if (itemsToDownload.length === 0 || itemsToDownload.some(item => !item)) return;

    const validItems = itemsToDownload.filter((item): item is CanvasItem => item !== undefined);
    
    try {
      // 如果只有一个文件，直接下载
      if (validItems.length === 1) {
        const item = validItems[0];
        const a = document.createElement('a');
        a.href = item.url;
        a.download = item.name || `${item.type}-${item.id}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(t('videoReplication.downloadStarted'));
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
        toast.error(t('videoReplication.jszipNotInstalled'));
        // 逐个下载
        for (const item of validItems) {
          const a = document.createElement('a');
          a.href = item.url;
          a.download = item.name || `${item.type}-${item.id}`;
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
      const loadingToast = toast.loading(`${t('common.packing')} ${validItems.length} ${t('videoReplication.items')}...`);
      
      // 获取文件并添加到 zip
      let successCount = 0;
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        try {
          // 使用 XMLHttpRequest 获取文件（可以处理 CORS）
          const blob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', item.url, true);
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
          const extension = item.type === 'video' ? 'mp4' : 'png';
          zip.file(`${item.name || `${item.type}-${item.id}`}.${extension}`, blob);
          successCount++;
        } catch (err) {
          console.error(`Failed to fetch item ${item.id}:`, err);
          // 继续处理其他文件
        }
      }
      
      if (successCount === 0) {
        toast.dismiss(loadingToast);
        toast.error(t('toast.allDownloadsFailed'));
        return;
      }
      
      // 生成 zip 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `canvas-items-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
      
      toast.dismiss(loadingToast);
      toast.success(`${t('toast.downloadedZip')} ${successCount}/${validItems.length} ${t('videoReplication.items')} (${t('common.zip')})`);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error(`${t('toast.downloadFailed')}: ${err instanceof Error ? err.message : t('toast.unknownError')}`);
    }
  }, [selectedCanvasItem, selectedCanvasItemIds, canvasItems]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedCanvasItem || selectedCanvasItemIds.length > 0)) {
        e.preventDefault();
        handleDeleteCanvasItems();
      }
      // Copy (Ctrl/Cmd + C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && (selectedCanvasItem || selectedCanvasItemIds.length > 0)) {
        e.preventDefault();
        handleCopyCanvasItems();
      }
      // Paste (Ctrl/Cmd + V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedItem) {
        e.preventDefault();
        handlePasteCanvasItems();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCanvasItem, selectedCanvasItemIds, copiedItem, handleDeleteCanvasItems, handleCopyCanvasItems, handlePasteCanvasItems]);

  return (
    <div className="h-[calc(100vh-72px)] flex bg-background">
      {/* Left Panel - Chat & Controls */}
      <div 
        className="flex flex-col border-r border-border bg-card"
        style={{ width: `${chatPanelWidth}%` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('videoReplication.title')}</span>
          </div>
        </div>

        {/* Upload Section */}
        {viewState === 'upload' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Video Upload */}
            {!originalVideo ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors relative min-h-[200px]"
                onClick={() => !isVideoUploading && fileInputRef.current?.click()}
              >
                {isVideoUploading ? (
                  <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                      <p className="font-medium text-sm">{t('videoReplication.uploading')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">{t('videoReplication.uploadVideoSection')}</p>
                    <p className="text-sm text-muted-foreground">{t('videoReplication.uploadVideoHint')}</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </div>
            ) : (
              <div className="border border-primary/50 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{originalVideo.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setOriginalVideo(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <video 
                  src={originalVideo.url} 
                  className="w-full h-32 object-cover rounded-md bg-black"
                  controls
                />
              </div>
            )}

            {/* Reference Image Upload */}
            {!referenceImage ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors relative min-h-[200px]"
                onClick={() => !isImageUploading && imageInputRef.current?.click()}
              >
                {isImageUploading ? (
                  <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                      <p className="font-medium text-sm">{t('videoReplication.uploading')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">{t('videoReplication.referenceImageSection')}</p>
                    <p className="text-sm text-muted-foreground">{t('videoReplication.referenceImageHint')}</p>
                  </>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="border border-primary/50 rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{referenceImage.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setReferenceImage(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <img 
                  src={referenceImage.url} 
                  alt={t('videoReplication.referenceImageSection')}
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}

            {/* Selling Points Input */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t('videoReplication.sellingPointsSection')}</span>
              </div>
              <Textarea
                placeholder={t('videoReplication.sellingPointsPlaceholder')}
                value={sellingPoints}
                onChange={(e) => setSellingPoints(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Analyze Button */}
            {originalVideo && referenceImage && sellingPoints.trim() && (
              <Button 
                className="w-full"
                onClick={handleStartReplication}
                disabled={isReplicating}
              >
                {isReplicating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('videoReplication.replicating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('videoReplication.startReplication')}
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Analyzing Animation */}
        {viewState === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t('videoReplication.analyzingVideo')}</h3>
            <p className="text-sm text-muted-foreground text-center">
              {t('videoReplication.analyzingVideoHint')}
            </p>
          </div>
        )}

        {/* Prompts List View (after analysis, before chat) */}
        {viewState === 'prompts' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4 overflow-y-auto">
            <div className="text-center mb-2">
              <h3 className="font-medium">{t('videoReplication.promptsList')}</h3>
              <p className="text-sm text-muted-foreground">{t('videoReplication.promptsListHint')}</p>
            </div>
            
            {/* Prompt Cards */}
            <div className="space-y-3">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all hover:bg-muted/30"
                  onClick={() => handlePromptClick(segment.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary">
                      {t('videoReplication.segment')} {segment.id} • {segment.startTime}s - {segment.endTime}s
                    </span>
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm">{segment.newPrompt}</p>
                </div>
              ))}
            </div>
            
            {/* Modify Prompt Button */}
            <Button 
              variant="outline"
              className="w-full mt-4"
              onClick={handleModifyPrompts}
              disabled={isGenerating}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {t('videoReplication.modifyPrompt')}
            </Button>
            
            {/* Direct Generate Button */}
            <Button 
              className="w-full mt-2"
              onClick={handleGenerateVideo}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  {t('videoReplication.generatingVideo')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {t('videoReplication.generateVideoDirectly')}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Prompt Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {t('videoReplication.editPromptDialogTitle', { segmentId: dialogSegmentId })}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={dialogPromptText}
                onChange={(e) => setDialogPromptText(e.target.value)}
                placeholder={t('videoReplication.editPromptDialogPlaceholder')}
                className="min-h-[150px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('videoReplication.cancel')}
              </Button>
              <Button onClick={handleDialogSend}>
                <Send className="w-4 h-4 mr-2" />
                {t('videoReplication.sendAndContinueEditing')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat View with Timeline */}
        {viewState === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">

            {/* Timeline Segments */}
            {segments.length > 0 && (
              <div className="px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    {t('videoReplication.timelineHint')}
                  </p>
                  <button
                    className={cn(
                      "text-xs px-2 py-1 rounded transition-colors",
                      selectedSegments.size === segments.length 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                    onClick={handleSelectAll}
                  >
                    {selectedSegments.size === segments.length ? t('videoReplication.deselectAll') : t('videoReplication.selectAll')}
                  </button>
                </div>
                
                {/* Horizontal Timeline */}
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="flex gap-2 min-w-max">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className={cn(
                          "relative flex-shrink-0 w-[180px] p-2 rounded-lg border cursor-pointer transition-all select-none",
                          selectedSegments.has(segment.id) 
                            ? "border-primary bg-primary/10 ring-1 ring-primary" 
                            : "border-border hover:border-primary/50",
                          editingSegmentId === segment.id && "ring-2 ring-primary"
                        )}
                        onClick={(e) => handleSegmentClick(segment.id, e)}
                        onDoubleClick={() => handleSegmentDoubleClick(segment.id)}
                      >
                        {/* Time indicator */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-primary">
                            {t('videoReplication.timeRange', { start: segment.startTime, end: segment.endTime })}
                          </span>
                          {segment.newPrompt && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        
                        {/* Prompt content */}
                        {editingSegmentId === segment.id ? (
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            <Textarea
                              value={editingPromptText}
                              onChange={(e) => setEditingPromptText(e.target.value)}
                              className="text-xs min-h-[60px] resize-none"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={handleSaveEdit}>
                                <Check className="w-3 h-3 mr-1" />
                                {t('videoReplication.saved')}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={handleCancelEdit}>
                                <X className="w-3 h-3 mr-1" />
                                {t('videoReplication.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground line-clamp-2" title={segment.originalPrompt}>
                              {t('videoReplication.originalPrompt', { prompt: segment.originalPrompt })}
                            </p>
                            {segment.newPrompt && (
                              <p className="text-[10px] text-foreground line-clamp-2" title={segment.newPrompt}>
                                {t('videoReplication.newPrompt', { prompt: segment.newPrompt })}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Selection indicator */}
                        {selectedSegments.has(segment.id) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Selection hint */}
                {selectedSegments.size > 0 && (
                  <p className="text-xs text-primary mt-2">
                    {t('videoReplication.selectedSegmentsHint', { count: selectedSegments.size })}
                  </p>
                )}
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-muted/50 text-muted-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Generated Image */}
                    {message.image && (
                      <div className="relative mt-2 w-56 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md">
                        <img
                          src={message.image}
                          alt="Generated"
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    )}

                    {/* Generated Video */}
                    {message.video && (
                      <div className="relative mt-2 w-56 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:shadow-md">
                        <video
                          src={message.video}
                          className="aspect-video w-full object-cover"
                          controls
                        />
                      </div>
                    )}
                    
                    <p className="text-[10px] opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border shrink-0 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    selectedSegments.size > 0 
                      ? t('videoReplication.messagePlaceholderSingle', { count: selectedSegments.size }) 
                      : t('videoReplication.messagePlaceholderMultiple')
                  }
                  className="min-h-[44px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="shrink-0 h-11 w-11"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Generate Video Button */}
              {segments.some(s => s.newPrompt) && (
                <Button 
                  className="w-full"
                  onClick={handleGenerateVideo}
                  disabled={!canGenerateVideo}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      {t('videoReplication.generatingVideo')}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {t('videoReplication.generateVideo')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "w-1 cursor-col-resize hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel - Canvas */}
      <div className="relative flex-1 flex flex-col bg-muted/30">
        <UniversalCanvas
          items={canvasItems.map(item => ({
            id: item.id,
            url: item.url,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            prompt: item.prompt,
            type: item.type,
          } as CanvasMediaItem))}
          onItemMove={(id, x, y) => {
            setCanvasItems(prev => prev.map(item => 
              item.id === id ? { ...item, x, y } : item
            ));
          }}
          onItemResize={(id, width, height) => {
            setCanvasItems(prev => prev.map(item => 
              item.id === id ? { ...item, width, height } : item
            ));
          }}
          onViewChange={(zoom, pan) => {
            setCanvasView({ zoom, pan });
          }}
          initialZoom={canvasView.zoom}
          initialPan={canvasView.pan}
          onItemSelect={setSelectedCanvasItem}
          onItemMultiSelect={setSelectedCanvasItemIds}
          selectedItemId={selectedCanvasItem}
          selectedItemIds={selectedCanvasItemIds}
          onItemDragStart={() => {}}
          onItemDoubleClick={(item) => {
            // 找到当前项目在画布中的索引
            const index = canvasItems.findIndex(i => i.id === item.id);
            if (index !== -1) {
              setViewerIndex(index);
              setViewerOpen(true);
            }
          }}
          highlightedItemId={highlightedItemId}
          deletingItemIds={Array.from(deletingItemIds)}
          addingItemIds={Array.from(addingItemIds)}
        />

        {/* Selected Item(s) Floating Toolbar */}
        {(selectedCanvasItem || selectedCanvasItemIds.length > 0) && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm" style={{zIndex:999}}>
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {selectedCanvasItemIds.length > 1 
                ? t('videoReplication.selectedSegmentsHint', { count: selectedCanvasItemIds.length })
                : canvasItems.find(item => item.id === selectedCanvasItem)?.name || ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleCopyCanvasItems}
              title={selectedCanvasItemIds.length > 1 ? t('videoReplication.batchCopy') : t('videoReplication.copied')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={handleDownloadCanvasItems}
              title={selectedCanvasItemIds.length > 1 ? t('videoReplication.batchDownload') : t('videoReplication.downloadStarted')}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
              onClick={handleDeleteCanvasItems}
              title={selectedCanvasItemIds.length > 1 ? t('videoReplication.batchDelete') : t('videoReplication.deleted')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
      </div>
        )}

        {/* Item Count Badge */}
        {canvasItems.length > 0 && (
          <Badge 
            variant="secondary" 
            className="absolute right-4 top-4 shadow-sm z-50"
          >
            {t('videoReplication.canvasItemsCount', { count: canvasItems.length })}
          </Badge>
        )}
      </div>

      {/* Media Viewer */}
      <MediaViewer
        items={canvasItems.map(item => ({
          id: item.id,
          url: item.url,
          type: (item.type === 'video' || item.url.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i)) ? 'video' as const : 'image' as const,
          prompt: item.prompt,
        }))}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
