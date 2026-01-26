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
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedImage, setCopiedImage] = useState<CanvasImage | null>(null);
  const [highlightedImageId, setHighlightedImageId] = useState<string | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);

  // 配置数据
  const workModes = getWorkModes(isZh);
  const models = getModelList();
  const aspectRatios = getModelSizes(model);

  // Mock history sessions
  const historySessions = [
    { id: 'session-1', title: '橘猫阳光场景生成', timestamp: new Date(Date.now() - 3600000), messageCount: 4 },
    { id: 'session-2', title: '山脉日落风景图', timestamp: new Date(Date.now() - 86400000), messageCount: 6 },
    { id: 'session-3', title: '新年贺卡设计', timestamp: new Date(Date.now() - 172800000), messageCount: 3 },
    { id: 'session-4', title: '抽象数字艺术', timestamp: new Date(Date.now() - 259200000), messageCount: 5 },
  ];

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

  // 处理新对话
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setSelectedImages([]);
    setPrompt('');
    setCanvasImages([]);
    setSelectedImageId(null);
    setSelectedImageIds([]);
  }, []);

  // 处理加载历史会话
  const handleLoadSession = useCallback((sessionId: string) => {
    setMessages([]);
    setSelectedImages([]);
    setShowHistory(false);
  }, []);

  // 处理图片移动
  const handleImageMove = useCallback((id: string, x: number, y: number) => {
    setCanvasImages(prev =>
      prev.map(img => (img.id === id ? { ...img, x, y } : img))
    );
  }, []);

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
    toast.success(isZh ? '已复制到剪贴板，可在新画布粘贴' : 'Copied to clipboard, can paste in new canvas');
  }, [isZh]);

  // 处理粘贴图片
  const handlePasteImage = useCallback(async () => {
    if (copiedImage) {
      const dimensions = await getImageDimensions(copiedImage.url);
      const newImage: CanvasImage = {
        ...copiedImage,
        id: `img-${Date.now()}`,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 100,
        width: dimensions.width,
        height: dimensions.height,
        type: 'image',
      };
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setCopiedImage(null);
      toast.success(isZh ? '已粘贴图片到画布' : 'Image pasted to canvas');
    }
  }, [copiedImage, isZh, getImageDimensions]);

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
      
      setCanvasImages(prev => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      toast.success(isZh ? '图片已添加到画布' : 'Image added to canvas');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(isZh ? '图片上传失败' : 'Image upload failed');
    }
  }, [isZh, getImageDimensions]);

  // 处理键盘快捷键
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
    if (!prompt.trim() || isGenerating) return;

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
                  model === 'doubao-seedream-4-0-250828'
                    ? (isZh ? `尺寸：${aspectRatio}` : `Size: ${aspectRatio}`)
                    : (isZh ? `画面比例：${aspectRatio}` : `Aspect Ratio: ${aspectRatio}`),
                ],
                resultSummary: isZh 
                  ? `已完成图片生成，${model === 'doubao-seedream-4-0-250828' ? `输出尺寸为${aspectRatio}` : `输出比例为${aspectRatio}`}。`
                  : `Image generation complete, output ${model === 'doubao-seedream-4-0-250828' ? `size ${aspectRatio}` : `ratio ${aspectRatio}`}.`,
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
  }, [prompt, isGenerating, model, aspectRatio, selectedImages, selectedImageIds, selectedImageId, canvasImages, isZh, getImageDimensions, handleAddSelectedImage]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  // 处理图片双击
  const handleImageDoubleClick = useCallback((image: CanvasImage) => {
    handleAddSelectedImage({
      id: image.id,
      url: image.url,
      prompt: image.prompt,
    });
  }, [handleAddSelectedImage]);

  // 处理删除图片
  const handleDeleteImage = useCallback(() => {
    if (selectedImageIds.length > 1) {
      setCanvasImages(prev => prev.filter(img => !selectedImageIds.includes(img.id)));
      setSelectedImageIds([]);
      setSelectedImageId(null);
    } else if (selectedImageId) {
      setCanvasImages(prev => prev.filter(img => img.id !== selectedImageId));
      setSelectedImageId(null);
      setSelectedImageIds([]);
    }
  }, [selectedImageIds, selectedImageId]);

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
    highlightedImageId,
    chatPanelWidth,
    isResizing,
    
    // Config
    workModes,
    models,
    aspectRatios,
    historySessions,
    
    // Handlers
    handleNewConversation,
    handleLoadSession,
    handleImageMove,
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
  };
}
