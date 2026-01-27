import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ZoomIn, ZoomOut, Maximize, Move, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WaterCupProgress } from './WaterCupProgress';

// 统一的画布媒体项类型（支持图片和视频）
export interface CanvasMediaItem {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
  taskId?: string;
  type?: 'image' | 'video' | 'placeholder'; // 媒体类型，可选，如果不提供则根据URL自动判断
  progress?: number; // 占位符进度 0-100
  status?: 'queued' | 'processing' | 'completed' | 'failed'; // 占位符状态
}

interface UniversalCanvasProps {
  items: CanvasMediaItem[];
  onItemMove?: (id: string, x: number, y: number) => void;
  onItemResize?: (id: string, width: number, height: number) => void;
  onViewChange?: (zoom: number, pan: { x: number; y: number }) => void;
  initialZoom?: number;
  initialPan?: { x: number; y: number };
  onItemSelect?: (id: string | null) => void;
  onItemMultiSelect?: (ids: string[]) => void;
  selectedItemId?: string | null;
  selectedItemIds?: string[]; // Multi-select support
  onItemDragStart?: (item: CanvasMediaItem) => void;
  onItemDoubleClick?: (item: CanvasMediaItem) => void;
  highlightedItemId?: string | null;
  deletingItemIds?: string[]; // 正在删除的图层ID列表
  addingItemIds?: string[]; // 正在新增的图层ID列表
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;
const ZOOM_STEP = 0.1;

// 判断URL是否为视频
const isVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(url) || url.includes('video');
};

// 判断媒体项类型
const getMediaType = (item: CanvasMediaItem): 'image' | 'video' | 'placeholder' => {
  if (item.type) return item.type;
  return isVideoUrl(item.url) ? 'video' : 'image';
};

export function UniversalCanvas({
  items,
  onItemMove,
  onItemResize,
  onViewChange,
  initialZoom = 1,
  initialPan = { x: 0, y: 0 },
  onItemSelect,
  onItemMultiSelect,
  selectedItemId,
  selectedItemIds = [],
  onItemDragStart,
  onItemDoubleClick,
  highlightedItemId,
  deletingItemIds = [],
  addingItemIds = [],
}: UniversalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState(initialPan);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  
  // 当 initialZoom 或 initialPan 变化时，更新内部状态（用于加载历史会话）
  useEffect(() => {
    // 只有在值真正改变时才标记为初始化（避免首次渲染时的问题）
    const zoomChanged = zoom !== initialZoom;
    const panChanged = pan.x !== initialPan.x || pan.y !== initialPan.y;
    
    if (zoomChanged || panChanged) {
      isInitializingRef.current = true;
      setZoom(initialZoom);
      setPan(initialPan);
      // 使用 requestAnimationFrame 确保在下一个渲染周期中重置标志
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isInitializingRef.current = false;
        });
      });
    } else if (!hasInitializedRef.current) {
      // 首次渲染时，确保标志为 false
      hasInitializedRef.current = true;
      isInitializingRef.current = false;
    }
  }, [initialZoom, initialPan.x, initialPan.y, zoom, pan.x, pan.y]);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const itemRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
  
  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartPos = useRef<{ x: number; y: number } | null>(null);

  // Handle keyboard events for space-drag panning and ctrl-drag panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      // 监听 Ctrl/Cmd 键
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
      // 当 Ctrl/Cmd 键释放时
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper function to zoom towards a point
  const zoomTowardsPoint = useCallback((pointX: number, pointY: number, deltaZoom: number) => {
    if (!containerRef.current) return;
    
    // 用户交互时，确保初始化标志为 false
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
    }
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const mouseX = pointX - rect.left;
    const mouseY = pointY - rect.top;
    
    setZoom((currentZoom) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + deltaZoom));
      
      setPan((currentPan) => {
        const canvasX = (mouseX - currentPan.x) / currentZoom;
        const canvasY = (mouseY - currentPan.y) / currentZoom;
        
        const newPanX = mouseX - canvasX * newZoom;
        const newPanY = mouseY - canvasY * newZoom;
        
        const newPan = { x: newPanX, y: newPanY };
        
        // 用户交互时总是通知视图变化
        onViewChange?.(newZoom, newPan);
        
        return newPan;
      });
      
      return newZoom;
    });
  }, [onViewChange]);

  // Prevent browser zoom when wheel in canvas area and handle zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isInCanvas = 
          e.clientX >= rect.left && 
          e.clientX <= rect.right && 
          e.clientY >= rect.top && 
          e.clientY <= rect.bottom;
        
        if (isInCanvas) {
          e.preventDefault();
          e.stopPropagation();
          
          // 处理缩放
          let deltaY = e.deltaY;
          if (e.deltaMode === 1) {
            deltaY *= 16; // Line mode, convert to pixels
          } else if (e.deltaMode === 2) {
            deltaY *= 16 * 20; // Page mode, convert to pixels
          }
          
          const isTrackpad = Math.abs(deltaY) < 50 && e.deltaMode === 0;
          const isPinch = e.ctrlKey || e.metaKey;
          
          let zoomDelta: number;
          if (isPinch) {
            zoomDelta = -deltaY * 0.005;
          } else if (isTrackpad) {
            zoomDelta = -deltaY * 0.008;
          } else {
            zoomDelta = deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          }
          
          zoomDelta = Math.max(-ZOOM_STEP * 5, Math.min(ZOOM_STEP * 5, zoomDelta));
          zoomTowardsPoint(e.clientX, e.clientY, zoomDelta);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [zoomTowardsPoint]);

  // Handle mouse wheel zoom (React合成事件，不调用preventDefault，由原生事件处理)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // 不在这里调用 preventDefault，因为 React 的 wheel 事件可能是 passive
    // 缩放逻辑已经在原生事件监听器中处理（useEffect 中的 handleWheel）
    // 这里只阻止事件冒泡
    e.stopPropagation();
  }, []);

  // Handle panning/box selection start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 鼠标中键、Space + 左键、或 Ctrl/Cmd + 左键 = 拖动画布
    if (e.button === 1 || (isSpacePressed && e.button === 0) || ((e.ctrlKey || e.metaKey) && e.button === 0)) {
      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡，防止图层响应
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isClickOnItem = target.closest('[data-item-id]') !== null;
      const isClickOnPlaceholder = target.closest('[data-is-placeholder="true"]') !== null;
      
      // 如果点击在占位符上，不进行任何操作
      if (isClickOnPlaceholder) {
        return;
      }
      
      // Ctrl/Cmd + 左键在空白区域 = 拖动画布（已在上面处理）
      // 普通左键在空白区域 = 框选
      if (!isClickOnItem && !isSpacePressed && !(e.ctrlKey || e.metaKey) && containerRef.current) {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 检查是否点击在非占位符的 item 上
        const isClickInItem = items.some(item => {
          const mediaType = getMediaType(item);
          // 排除占位符
          if (mediaType === 'placeholder') {
            return false;
          }
          
          const screenX = item.x * zoom + pan.x;
          const screenY = item.y * zoom + pan.y;
          const screenWidth = item.width * zoom;
          const screenHeight = item.height * zoom;
          
          return x >= screenX && x <= screenX + screenWidth &&
                 y >= screenY && y <= screenY + screenHeight;
        });
        
        if (!isClickInItem) {
          selectionStartPos.current = { x, y };
          setIsBoxSelecting(true);
          setSelectionBox({ x, y, width: 0, height: 0 });
          
          if (!e.ctrlKey && !e.metaKey) {
            onItemSelect?.(null);
            onItemMultiSelect?.([]);
          }
        }
      } else if (!isClickOnItem && isSpacePressed) {
        onItemSelect?.(null);
        onItemMultiSelect?.([]);
      }
    }
  }, [isSpacePressed, onItemSelect, onItemMultiSelect, items, zoom, pan]);

  // Handle panning/box selection move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      // 用户交互时，确保初始化标志为 false
      if (isInitializingRef.current) {
        isInitializingRef.current = false;
      }
      
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => {
        const newPan = { x: prev.x + dx, y: prev.y + dy };
        // 用户交互时总是通知视图变化
        onViewChange?.(zoom, newPan);
        return newPan;
      });
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (isBoxSelecting && selectionStartPos.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const width = x - selectionStartPos.current.x;
      const height = y - selectionStartPos.current.y;
      
      setSelectionBox({
        x: Math.min(selectionStartPos.current.x, x),
        y: Math.min(selectionStartPos.current.y, y),
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  }, [isPanning, isBoxSelecting, zoom, onViewChange]);

  // Handle context menu (right-click) - prevent when panning with Ctrl
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // 如果正在平移画布（按住 Ctrl/Cmd 键），阻止右键菜单
    if (isPanning || isCtrlPressed || (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isPanning, isCtrlPressed]);

  // Handle panning/box selection end
  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (isBoxSelecting && containerRef.current && onItemMultiSelect) {
      const currentBox = selectionBox || (selectionStartPos.current ? {
        x: selectionStartPos.current.x,
        y: selectionStartPos.current.y,
        width: 0,
        height: 0
      } : null);
      
      if (currentBox && (currentBox.width > 5 || currentBox.height > 5)) {
        const selectedIds: string[] = [];
        
        items.forEach(item => {
          // 排除占位符，占位符不能被框选
          const mediaType = getMediaType(item);
          if (mediaType === 'placeholder') {
            return;
          }
          
          const screenX = item.x * zoom + pan.x;
          const screenY = item.y * zoom + pan.y;
          const screenWidth = item.width * zoom;
          const screenHeight = item.height * zoom;
          
          const itemLeft = screenX;
          const itemTop = screenY;
          const itemRight = screenX + screenWidth;
          const itemBottom = screenY + screenHeight;
          
          const boxLeft = currentBox.x;
          const boxTop = currentBox.y;
          const boxRight = currentBox.x + currentBox.width;
          const boxBottom = currentBox.y + currentBox.height;
          
          const overlaps = !(itemRight < boxLeft || itemLeft > boxRight || itemBottom < boxTop || itemTop > boxBottom);
          
          if (overlaps) {
            selectedIds.push(item.id);
          }
        });
        
        if (selectedIds.length > 0) {
          const addToSelection = e?.ctrlKey || e?.metaKey;
          if (addToSelection && selectedItemIds.length > 0) {
            const combined = [...new Set([...selectedItemIds, ...selectedIds])];
            onItemMultiSelect(combined);
          } else {
            onItemMultiSelect(selectedIds);
          }
          
          if (onItemSelect && selectedIds.length > 0) {
            onItemSelect(selectedIds[0]);
          }
        } else {
          if (!e?.ctrlKey && !e?.metaKey) {
            onItemSelect?.(null);
            onItemMultiSelect([]);
          }
        }
      }
      
      setIsBoxSelecting(false);
      setSelectionBox(null);
      selectionStartPos.current = null;
    }
    
    setIsPanning(false);
  }, [isBoxSelecting, selectionBox, items, zoom, pan, selectedItemIds, onItemMultiSelect, onItemSelect]);

  // Handle video play/pause
  const toggleVideoPlay = useCallback((itemId: string) => {
    const video = videoRefs.current.get(itemId);
    if (!video) return;
    
    if (playingVideos.has(itemId)) {
      video.pause();
      setPlayingVideos(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } else {
      video.play();
      setPlayingVideos(prev => new Set(prev).add(itemId));
    }
  }, [playingVideos]);

  // Handle item drag
  const handleDrag = (id: string) => (_e: DraggableEvent, data: DraggableData) => {
    const canvasX = (data.x - pan.x) / zoom;
    const canvasY = (data.y - pan.y) / zoom;
    onItemMove?.(id, canvasX, canvasY);
  };

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    
    // 用户交互时，确保初始化标志为 false
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
    }
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasX = (centerX - pan.x) / zoom;
    const canvasY = (centerY - pan.y) / zoom;
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    const newPanX = centerX - canvasX * newZoom;
    const newPanY = centerY - canvasY * newZoom;
    
    const newPan = { x: newPanX, y: newPanY };
    
    setZoom(newZoom);
    setPan(newPan);
    
    // 用户交互时总是通知视图变化
    onViewChange?.(newZoom, newPan);
  }, [zoom, pan, onViewChange]);
  
  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    
    // 用户交互时，确保初始化标志为 false
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
    }
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasX = (centerX - pan.x) / zoom;
    const canvasY = (centerY - pan.y) / zoom;
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    const newPanX = centerX - canvasX * newZoom;
    const newPanY = centerY - canvasY * newZoom;
    
    const newPan = { x: newPanX, y: newPanY };
    
    setZoom(newZoom);
    setPan(newPan);
    
    // 用户交互时总是通知视图变化
    onViewChange?.(newZoom, newPan);
  }, [zoom, pan, onViewChange]);
  
  const handleFitToScreen = useCallback(() => {
    // 用户交互时，确保初始化标志为 false
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
    }
    
    const newZoom = 1;
    const newPan = { x: 0, y: 0 };
    setZoom(newZoom);
    setPan(newPan);
    
    // 用户交互时总是通知视图变化
    onViewChange?.(newZoom, newPan);
  }, [onViewChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full overflow-hidden',
        isPanning || isSpacePressed || isCtrlPressed ? 'cursor-grab' : 'cursor-default',
        isPanning && 'cursor-grabbing'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'none' }}
    >
      {/* Dot Pattern Background */}
      <div 
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas Layer */}
      <div className="absolute inset-0">
        {items.map((item, index) => {
          const screenX = item.x * zoom + pan.x;
          const screenY = item.y * zoom + pan.y;
          const mediaType = getMediaType(item);
          const isVideo = mediaType === 'video';
          const isPlaceholder = mediaType === 'placeholder';
          const isPlaying = isVideo && playingVideos.has(item.id);
          // 占位符完全禁止交互（拖动、选中、框选）
          const isPlaceholderDisabled = isPlaceholder;
          
          // 为每个 item 创建 ref
          let itemRef = itemRefs.current.get(item.id);
          if (!itemRef) {
            itemRef = { current: null };
            itemRefs.current.set(item.id, itemRef);
          }
          
          return (
            <Draggable
              key={item.id}
              nodeRef={itemRef}
              position={{ x: screenX, y: screenY }}
              onDrag={handleDrag(item.id)}
              onStart={() => !isPlaceholderDisabled && onItemSelect?.(item.id)}
              disabled={isPanning || isSpacePressed || isPlaceholderDisabled || isCtrlPressed}
              bounds={false}
              cancel=".no-drag"
            >
              <div
                ref={itemRef}
                data-item-id={item.id}
                data-is-placeholder={isPlaceholder ? 'true' : undefined}
                className={cn(
                  'absolute rounded-lg bg-background shadow-lg overflow-hidden',
                  // 只在删除和新增时应用过渡动画，不影响拖拽和缩放
                  (deletingItemIds.includes(item.id) || addingItemIds.includes(item.id)) && 'transition-[opacity,transform] duration-300 ease-in-out',
                  isPlaceholderDisabled 
                    ? 'cursor-default pointer-events-none' 
                    : 'cursor-move',
                  (selectedItemId === item.id || selectedItemIds.includes(item.id))
                    ? 'ring-2 ring-primary shadow-xl z-50'
                    : 'ring-1 ring-border hover:shadow-xl',
                  highlightedItemId === item.id && 'ring-2 ring-green-500 shadow-xl animate-pulse',
                  isPlaceholder && 'bg-muted/50',
                  deletingItemIds.includes(item.id) && 'opacity-0 scale-75 pointer-events-none',
                  addingItemIds.includes(item.id) && 'opacity-0 scale-90'
                )}
                style={{ 
                  width: item.width * zoom, 
                  height: item.height * zoom,
                  zIndex: (selectedItemId === item.id || selectedItemIds.includes(item.id)) ? 50 : index + 1,
                }}
                onMouseDown={(e) => {
                  // 如果按住 Ctrl/Cmd 键，这是画布平移操作，不处理图层点击
                  if (e.ctrlKey || e.metaKey) {
                    e.stopPropagation();
                    return;
                  }
                  
                  e.stopPropagation();
                  // 占位符禁止点击选中
                  if (isPlaceholderDisabled) {
                    return;
                  }
                  if (e.ctrlKey || e.metaKey) {
                    if (selectedItemIds.includes(item.id)) {
                      const newIds = selectedItemIds.filter(id => id !== item.id);
                      onItemMultiSelect?.(newIds);
                      onItemSelect?.(newIds.length > 0 ? newIds[0] : null);
                    } else {
                      const newIds = [...selectedItemIds, item.id];
                      onItemMultiSelect?.(newIds);
                      onItemSelect?.(item.id);
                    }
                  } else {
                    onItemSelect?.(item.id);
                    onItemMultiSelect?.([item.id]);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // 占位符禁止双击
                  if (isPlaceholderDisabled) {
                    return;
                  }
                  onItemDoubleClick?.(item);
                }}
              >
                {isPlaceholder ? (
                  <div className="h-full w-full relative bg-muted/20 rounded-lg overflow-hidden">
                    {/* 水填充进度动画 - 整个方块 */}
                    <WaterCupProgress progress={item.progress || 0} className="absolute inset-0" />
                    {/* 提示文字 - 覆盖在水面上 */}
                    <div className="absolute bottom-4 left-0 right-0 text-center z-20 px-4">
                      <p className="text-sm font-medium text-foreground/90 mb-1 drop-shadow-md">
                        {item.prompt || 'Generating video...'}
                      </p>
                      <p className="text-xs text-foreground/70 drop-shadow-sm">
                        {item.status === 'queued' ? 'Queued' : item.status === 'processing' ? 'Processing' : 'Waiting...'}
                      </p>
                    </div>
                  </div>
                ) : isVideo ? (
                  <>
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current.set(item.id, el);
                        } else {
                          videoRefs.current.delete(item.id);
                        }
                      }}
                      src={item.url}
                      className="h-full w-full object-contain pointer-events-none select-none"
                      draggable={false}
                      loop
                      muted
                      onEnded={() => {
                        setPlayingVideos(prev => {
                          const next = new Set(prev);
                          next.delete(item.id);
                          return next;
                        });
                      }}
                    />
                    
                    {/* Play/Pause Button - Show on hover or when playing */}
                    <div 
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/20 transition-all cursor-pointer",
                        isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVideoPlay(item.id);
                      }}
                    >
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background"
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6 ml-1" />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={item.prompt || 'Canvas item'}
                    className="h-full w-full rounded-lg object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                )}

                {/* Drag handle */}
                <div 
                  className="no-drag absolute bottom-2 right-2 p-1.5 rounded bg-background/80 backdrop-blur-sm cursor-grab opacity-0 hover:opacity-100 transition-opacity"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      id: item.id,
                      url: item.url,
                      prompt: item.prompt,
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                    onItemDragStart?.(item);
                  }}
                >
                  <Move className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Selection Handles */}
                {selectedItemId === item.id && (
                  <>
                    <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  </>
                )}
              </div>
            </Draggable>
          );
        })}
      </div>

      {/* Selection Box */}
      {selectionBox && (
        <div
          className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-[100]"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitToScreen}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Panning Hint */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        <Move className="h-3.5 w-3.5" />
        <span>Space + Drag to pan</span>
      </div>
    </div>
  );
}
