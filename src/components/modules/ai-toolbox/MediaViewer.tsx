import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt?: string;
}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaViewer({ items, initialIndex, isOpen, onClose }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 当 initialIndex 变化时更新当前索引
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsClosing(false);
      // 重置加载状态
      setIsLoading(true);
      setIsImageLoaded(false);
      setIsVideoReady(false);
      // 延迟设置动画状态，确保 DOM 已更新
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      setIsAnimating(false);
      setIsLoading(true);
      setIsImageLoaded(false);
      setIsVideoReady(false);
    }
  }, [initialIndex, isOpen]);

  // 仅当当前查看的媒体项（id+url）真正变化时重置加载状态，避免轮询导致 items 引用变化时反复出现 loading
  const currentItemKey = (() => {
    const item = items[currentIndex];
    return item ? `${item.id}:${item.url}` : '';
  })();
  useEffect(() => {
    if (!isOpen) return;
    const currentItem = items[currentIndex];
    if (currentItem) {
      setIsLoading(true);
      setIsImageLoaded(false);
      setIsVideoReady(false);
    }
  }, [currentIndex, currentItemKey, isOpen]);

  // 处理关闭动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsAnimating(false);
    // 等待动画完成后再调用 onClose
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // 与动画时长匹配
  }, [onClose]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : items.length - 1;
      // 重置加载状态
      setIsLoading(true);
      setIsImageLoaded(false);
      setIsVideoReady(false);
      setIsVideoPlaying(false);
      return newIndex;
    });
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev < items.length - 1 ? prev + 1 : 0;
      // 重置加载状态
      setIsLoading(true);
      setIsImageLoaded(false);
      setIsVideoReady(false);
      setIsVideoPlaying(false);
      return newIndex;
    });
  }, [items.length]);

  // 键盘快捷键
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, handlePrevious, handleNext]);

  // 点击背景关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  if (!isOpen && !isClosing) return null;

  const currentItem = items[currentIndex];
  const isVideo = currentItem.type === 'video';
  
  // 判断是否已加载完成
  const isMediaReady = isVideo ? isVideoReady : isImageLoaded;
  const shouldShowLoading = isLoading && !isMediaReady;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        isClosing
          ? "bg-black/0 backdrop-blur-0 animate-media-viewer-fade-out"
          : "bg-black/60 backdrop-blur-md animate-media-viewer-fade-in"
      )}
      onClick={handleBackdropClick}
    >

      {/* Close Button - Mac风格 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-6 right-6 h-9 w-9 rounded-full",
          "bg-white/10 backdrop-blur-xl border border-white/20",
          "hover:bg-white/20 hover:border-white/30",
          "text-white/90 hover:text-white",
          "transition-all duration-200 ease-out",
          "shadow-lg shadow-black/20",
          "z-50",
          isClosing && "opacity-0 scale-90"
        )}
        onClick={handleClose}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Previous Button - Mac风格 */}
      {items.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-6 h-11 w-11 rounded-full",
            "bg-white/10 backdrop-blur-xl border border-white/20",
            "hover:bg-white/20 hover:border-white/30",
            "text-white/90 hover:text-white",
            "transition-all duration-200 ease-out",
            "shadow-lg shadow-black/20",
            "z-50",
            isClosing && "opacity-0 scale-90"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Next Button - Mac风格 */}
      {items.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-6 h-11 w-11 rounded-full",
            "bg-white/10 backdrop-blur-xl border border-white/20",
            "hover:bg-white/20 hover:border-white/30",
            "text-white/90 hover:text-white",
            "transition-all duration-200 ease-out",
            "shadow-lg shadow-black/20",
            "z-50",
            isClosing && "opacity-0 scale-90"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}

      {/* Media Content - Mac风格容器 */}
      <div
        className={cn(
          "relative max-w-[92vw] max-h-[92vh] flex items-center justify-center",
          isClosing 
            ? "animate-media-viewer-scale-out" 
            : isAnimating 
            ? "animate-media-viewer-scale-in"
            : ""
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 bg-black/20 backdrop-blur-sm border border-white/10">
            {/* 加载指示器 */}
            {shouldShowLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 border-2 border-white/30 border-t-white/90 rounded-full animate-spin" />
                  <p className="text-sm text-white/80 font-medium">加载中...</p>
                </div>
              </div>
            )}
            <video
              key={currentItem.url}
              ref={videoRef}
              src={currentItem.url}
              className={cn(
                "max-w-full max-h-[92vh] object-contain block",
                "transition-opacity duration-300",
                isVideoReady ? "opacity-100" : "opacity-0"
              )}
              controls
              autoPlay
              preload="auto"
              playsInline
              onLoadStart={() => {
                setIsLoading(true);
                setIsVideoReady(false);
              }}
              onLoadedMetadata={() => {
                setIsVideoReady(true);
                setIsLoading(false);
              }}
              onLoadedData={() => {
                setIsVideoReady(true);
                setIsLoading(false);
              }}
              onCanPlay={() => {
                setIsVideoReady(true);
                setIsLoading(false);
              }}
              onCanPlayThrough={() => {
                setIsVideoReady(true);
                setIsLoading(false);
              }}
              onWaiting={() => {
                setIsLoading(true);
              }}
              onPlaying={() => {
                setIsVideoReady(true);
                setIsLoading(false);
              }}
              onError={() => {
                console.error('Video load error');
                setIsVideoReady(true);
                setIsLoading(false);
              }}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onEnded={() => setIsVideoPlaying(false)}
            />
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 bg-black/20 backdrop-blur-sm border border-white/10">
            {/* 加载指示器 */}
            {shouldShowLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 border-2 border-white/30 border-t-white/90 rounded-full animate-spin" />
                  <p className="text-sm text-white/80 font-medium">加载中...</p>
                </div>
              </div>
            )}
            <img
              key={currentItem.url}
              ref={imageRef}
              src={currentItem.url}
              alt={currentItem.prompt || 'Media preview'}
              className={cn(
                "max-w-full max-h-[92vh] object-contain block",
                "transition-opacity duration-300",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => {
                setIsImageLoaded(true);
                setIsLoading(false);
              }}
              onError={() => {
                console.error('Image load error');
                setIsImageLoaded(true);
                setIsLoading(false);
              }}
            />
          </div>
        )}

        {/* Prompt Display - Mac风格 */}
        {currentItem.prompt && isMediaReady && (
          <div
            className={cn(
              "absolute bottom-6 left-1/2 -translate-x-1/2",
              "bg-white/10 backdrop-blur-xl border border-white/20",
              "px-5 py-2.5 rounded-2xl",
              "text-sm text-white/90",
              "max-w-[85vw] text-center",
              "shadow-lg shadow-black/20",
              "transition-all duration-300 ease-out",
              isClosing 
                ? "opacity-0 translate-y-2" 
                : isMediaReady 
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            )}
          >
            <p className="font-medium">{currentItem.prompt}</p>
          </div>
        )}

        {/* Index Indicator - Mac风格 */}
        {items.length > 1 && (
          <div
            className={cn(
              "absolute top-6 left-1/2 -translate-x-1/2",
              "bg-white/10 backdrop-blur-xl border border-white/20",
              "px-4 py-1.5 rounded-full",
              "text-sm text-white/90 font-medium",
              "shadow-lg shadow-black/20",
              "transition-all duration-200",
              isClosing && "opacity-0 scale-90"
            )}
          >
            <span>
              {currentIndex + 1} / {items.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
