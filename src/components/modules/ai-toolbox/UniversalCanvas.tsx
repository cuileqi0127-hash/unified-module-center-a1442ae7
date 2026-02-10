import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut, Maximize, Move, Play, Pause, Copy, Scissors, ClipboardPaste, Trash2, Crosshair, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  onViewerOpen?: () => void;
  onViewerClose?: () => void;
  highlightedItemId?: string | null;
  deletingItemIds?: string[]; // 正在删除的图层ID列表
  addingItemIds?: string[]; // 正在新增的图层ID列表
  /** 右键菜单：拷贝（复用画布现有拷贝逻辑） */
  onContextCopy?: () => void;
  /** 右键菜单：剪切（先复制再删除，由父组件实现） */
  onContextCut?: () => void;
  /** 右键菜单：粘贴（复用快捷键粘贴逻辑），可选传入右键处的画布坐标 (canvasX, canvasY) 以定位粘贴位置 */
  onContextPaste?: (canvasX?: number, canvasY?: number) => void;
  /** 右键菜单：删除（复用画布现有删除逻辑） */
  onContextDelete?: () => void;
  /** 右键菜单：聚焦（将视图中心移动到选中元素并适配合适缩放，由父组件调用 ref.focusOnItem/focusOnItems） */
  onContextFocus?: () => void;
  /** 右键菜单：分享（占位，仅反馈） */
  onContextShare?: () => void;
  /** 右键菜单：下载（复用画布现有下载逻辑） */
  onContextDownload?: () => void;
}

const MIN_ZOOM = 0.2;   // 20%
const MAX_ZOOM = 4;     // 400%
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

/** easeOutCubic for focus animation */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const FOCUS_ANIMATION_MS = 300;

interface UniversalCanvasRef {
  resumeVideos: () => void;
  /** 将画布平移并缩放到指定元素，使其居中并适配合适尺寸（带动画） */
  focusOnItem: (itemId: string) => void;
  /** 将画布平移并缩放到多个元素的几何中心并适配合适尺寸（带动画） */
  focusOnItems: (itemIds: string[]) => void;
}

/** 画布 ref 类型，供父组件使用 */
export type UniversalCanvasHandle = UniversalCanvasRef;

export const UniversalCanvas = forwardRef<UniversalCanvasRef, UniversalCanvasProps>(
  (
    {
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
      onViewerOpen,
      onViewerClose,
      highlightedItemId,
      deletingItemIds = [],
      addingItemIds = [],
      onContextCopy,
      onContextCut,
      onContextPaste,
      onContextDelete,
      onContextFocus,
      onContextShare,
      onContextDownload,
    },
    ref
  ) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; canvasX?: number; canvasY?: number }>({ open: false, x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const MENU_OFFSET = 4;
  const MENU_PADDING = 8;
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState(initialPan);
  // 用于平滑过渡的显示用 pan/zoom，向目标 pan/zoom 插值
  const [displayPan, setDisplayPan] = useState(initialPan);
  const [displayZoom, setDisplayZoom] = useState(initialZoom);
  const displayPanRef = useRef(initialPan);
  const displayZoomRef = useRef(initialZoom);
  const panZoomRafIdRef = useRef<number | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const LERP_FACTOR = 0.2;
  const SNAP_THRESHOLD_PAN = 0.5;
  const SNAP_THRESHOLD_ZOOM = 0.001;

  // 当 initialZoom 或 initialPan 变化时，更新内部状态（用于加载历史会话）
  useEffect(() => {
    // 只有在值真正改变时才标记为初始化（避免首次渲染时的问题）
    const zoomChanged = zoom !== initialZoom;
    const panChanged = pan.x !== initialPan.x || pan.y !== initialPan.y;

    if (zoomChanged || panChanged) {
      isInitializingRef.current = true;
      setZoom(initialZoom);
      setPan(initialPan);
      setDisplayPan(initialPan);
      setDisplayZoom(initialZoom);
      displayPanRef.current = initialPan;
      displayZoomRef.current = initialZoom;
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

  // 平滑过渡：displayPan/displayZoom 向 pan/zoom 插值，与重绘同步
  useEffect(() => {
    displayPanRef.current = displayPan;
    displayZoomRef.current = displayZoom;
  }, [displayPan.x, displayPan.y, displayZoom]);

  useEffect(() => {
    const dx = pan.x - displayPanRef.current.x;
    const dy = pan.y - displayPanRef.current.y;
    const dz = zoom - displayZoomRef.current;
    const needAnim = Math.abs(dx) >= SNAP_THRESHOLD_PAN || Math.abs(dy) >= SNAP_THRESHOLD_PAN || Math.abs(dz) >= SNAP_THRESHOLD_ZOOM;
    if (!needAnim) return;

    const tick = () => {
      const dx = pan.x - displayPanRef.current.x;
      const dy = pan.y - displayPanRef.current.y;
      const dz = zoom - displayZoomRef.current;
      const panDone = Math.abs(dx) < SNAP_THRESHOLD_PAN && Math.abs(dy) < SNAP_THRESHOLD_PAN;
      const zoomDone = Math.abs(dz) < SNAP_THRESHOLD_ZOOM;
      if (panDone && zoomDone) {
        displayPanRef.current = { x: pan.x, y: pan.y };
        displayZoomRef.current = zoom;
        setDisplayPan(displayPanRef.current);
        setDisplayZoom(zoom);
        panZoomRafIdRef.current = null;
        return;
      }
      displayPanRef.current = {
        x: displayPanRef.current.x + dx * LERP_FACTOR,
        y: displayPanRef.current.y + dy * LERP_FACTOR,
      };
      displayZoomRef.current += dz * LERP_FACTOR;
      setDisplayPan({ ...displayPanRef.current });
      setDisplayZoom(displayZoomRef.current);
      panZoomRafIdRef.current = requestAnimationFrame(tick);
    };
    panZoomRafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (panZoomRafIdRef.current != null) {
        cancelAnimationFrame(panZoomRafIdRef.current);
        panZoomRafIdRef.current = null;
      }
    };
  }, [pan.x, pan.y, zoom]);

  // 调试：画布移动坐标与缩放比例打印到控制台
  useEffect(() => {
    console.log('[UniversalCanvas] pan(移动坐标):', { x: pan.x, y: pan.y }, 'zoom(缩放比例):', zoom, 'zoom%:', Math.round(zoom * 100) + '%');
  }, [pan.x, pan.y, zoom]);

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const itemRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
  
  // Hover 防抖：图片放大 / 视频播放 延迟触发，避免边缘抖动
  const HOVER_DEBOUNCE_MS = 150;
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const hoverEnterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoHoverTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  
  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartPos = useRef<{ x: number; y: number } | null>(null);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const resizeStartPos = useRef<{ x: number; y: number } | null>(null);
  const resizeStartSize = useRef<{ width: number; height: number; x: number; y: number } | null>(null);

  // 画布移动/缩放防抖（节流）：最多每 PAN_ZOOM_DEBOUNCE_MS 更新一次，减少抖动与重绘
  const PAN_ZOOM_DEBOUNCE_MS = 50;
  const lastPanUpdateTimeRef = useRef(0);
  const lastAppliedMousePosRef = useRef({ x: 0, y: 0 });
  const lastZoomUpdateTimeRef = useRef(0);
  const pendingWheelPanRef = useRef({ dx: 0, dy: 0 });
  const wheelPanFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle keyboard events for Space+drag panning only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
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
        // 使用更精确的坐标转换，避免精度损失
        const canvasX = (mouseX - currentPan.x) / currentZoom;
        const canvasY = (mouseY - currentPan.y) / currentZoom;
        
        // 计算新的 pan 值，并四舍五入到最近的整数，确保像素对齐
        const newPanX = Math.round(mouseX - canvasX * newZoom);
        const newPanY = Math.round(mouseY - canvasY * newZoom);
        
        const newPan = { x: newPanX, y: newPanY };
        
        // 用户交互时总是通知视图变化
        onViewChange?.(newZoom, newPan);
        
        return newPan;
      });
      
      return newZoom;
    });
  }, [onViewChange]);

  // Wheel: Ctrl/Cmd+滚轮 = 缩放；无修饰键的滚轮/触控板双指滑动 = 画布平移
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isInCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInCanvas) return;

      e.preventDefault();
      e.stopPropagation();

      const isPinch = e.ctrlKey || e.metaKey;

      if (isPinch) {
        // Ctrl/Cmd + 滚轮：缩放，100ms 防抖（节流）
        const now = Date.now();
        if (now - lastZoomUpdateTimeRef.current >= PAN_ZOOM_DEBOUNCE_MS) {
          let deltaY = e.deltaY;
          if (e.deltaMode === 1) deltaY *= 16;
          else if (e.deltaMode === 2) deltaY *= 16 * 20;
          const isTrackpad = Math.abs(deltaY) < 50 && e.deltaMode === 0;
          let zoomDelta = isTrackpad ? -deltaY * 0.008 : (deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
          zoomDelta = Math.max(-ZOOM_STEP * 5, Math.min(ZOOM_STEP * 5, zoomDelta));
          zoomTowardsPoint(e.clientX, e.clientY, zoomDelta);
          lastZoomUpdateTimeRef.current = now;
        }
      } else {
        // 无修饰键：触控板双指滑动 / 滚轮 → 画布平移，100ms 防抖（节流）+ 尾随刷新
        let dX = e.deltaX;
        let dY = e.deltaY;
        if (e.deltaMode === 1) {
          dX *= 16;
          dY *= 16;
        } else if (e.deltaMode === 2) {
          dX *= 16 * 20;
          dY *= 16 * 20;
        }
        pendingWheelPanRef.current.dx += dX;
        pendingWheelPanRef.current.dy += dY;
        const now = Date.now();
        if (now - lastPanUpdateTimeRef.current >= PAN_ZOOM_DEBOUNCE_MS) {
          const dx = pendingWheelPanRef.current.dx;
          const dy = pendingWheelPanRef.current.dy;
          pendingWheelPanRef.current.dx = 0;
          pendingWheelPanRef.current.dy = 0;
          setPan((prev) => {
            const newPan = {
              x: Math.round(prev.x - dx),
              y: Math.round(prev.y - dy),
            };
            onViewChange?.(zoomRef.current, newPan);
            return newPan;
          });
          lastPanUpdateTimeRef.current = now;
        }
        if (wheelPanFlushTimeoutRef.current) clearTimeout(wheelPanFlushTimeoutRef.current);
        wheelPanFlushTimeoutRef.current = setTimeout(() => {
          wheelPanFlushTimeoutRef.current = null;
          if (pendingWheelPanRef.current.dx !== 0 || pendingWheelPanRef.current.dy !== 0) {
            const dx = pendingWheelPanRef.current.dx;
            const dy = pendingWheelPanRef.current.dy;
            pendingWheelPanRef.current.dx = 0;
            pendingWheelPanRef.current.dy = 0;
            setPan((prev) => {
              const newPan = {
                x: Math.round(prev.x - dx),
                y: Math.round(prev.y - dy),
              };
              onViewChange?.(zoomRef.current, newPan);
              return newPan;
            });
          }
        }, PAN_ZOOM_DEBOUNCE_MS);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
      if (wheelPanFlushTimeoutRef.current) clearTimeout(wheelPanFlushTimeoutRef.current);
    };
  }, [zoomTowardsPoint, onViewChange]);

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
      lastAppliedMousePosRef.current = { x: e.clientX, y: e.clientY };
      lastPanUpdateTimeRef.current = 0;
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
      
      // 普通左键在空白区域 = 框选
      if (!isClickOnItem && !isSpacePressed && containerRef.current) {
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
          
          const screenX = item.x * displayZoom + displayPan.x;
          const screenY = item.y * displayZoom + displayPan.y;
          const screenWidth = item.width * displayZoom;
          const screenHeight = item.height * displayZoom;
          
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
  }, [isSpacePressed, onItemSelect, onItemMultiSelect, items, displayZoom, displayPan]);

  // Handle panning/box selection/resize move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isResizing && resizingItemId && resizeHandle && resizeStartPos.current && resizeStartSize.current && containerRef.current) {
      // 用户交互时，确保初始化标志为 false
      if (isInitializingRef.current) {
        isInitializingRef.current = false;
      }
      
      // 计算鼠标移动的距离（屏幕坐标）
      const deltaScreenX = Math.round(e.clientX - resizeStartPos.current.x);
      const deltaScreenY = Math.round(e.clientY - resizeStartPos.current.y);
      
      // 转换为画布坐标
      const deltaCanvasX = deltaScreenX / displayZoom;
      const deltaCanvasY = deltaScreenY / displayZoom;
      
      let newWidth = resizeStartSize.current.width;
      let newHeight = resizeStartSize.current.height;
      let newX = resizeStartSize.current.x;
      let newY = resizeStartSize.current.y;
      
      // 根据拖拽的角计算新的尺寸和位置
      switch (resizeHandle) {
        case 'nw': // 左上角：保持右下角固定
          newWidth = resizeStartSize.current.width - deltaCanvasX;
          newHeight = resizeStartSize.current.height - deltaCanvasY;
          newX = resizeStartSize.current.x + deltaCanvasX;
          newY = resizeStartSize.current.y + deltaCanvasY;
          break;
        case 'ne': // 右上角：保持左下角固定
          newWidth = resizeStartSize.current.width + deltaCanvasX;
          newHeight = resizeStartSize.current.height - deltaCanvasY;
          newY = resizeStartSize.current.y + deltaCanvasY;
          break;
        case 'sw': // 左下角：保持右上角固定
          newWidth = resizeStartSize.current.width - deltaCanvasX;
          newHeight = resizeStartSize.current.height + deltaCanvasY;
          newX = resizeStartSize.current.x + deltaCanvasX;
          break;
        case 'se': // 右下角：保持左上角固定
          newWidth = resizeStartSize.current.width + deltaCanvasX;
          newHeight = resizeStartSize.current.height + deltaCanvasY;
          break;
      }
      
      // 限制最小尺寸
      const minSize = 50 / displayZoom; // 最小 50 像素（屏幕坐标）
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);
      
      // 如果位置改变，需要调整位置以保持固定角不变
      if (resizeHandle === 'nw') {
        // 左上角：保持右下角固定
        newX = resizeStartSize.current.x + resizeStartSize.current.width - newWidth;
        newY = resizeStartSize.current.y + resizeStartSize.current.height - newHeight;
      } else if (resizeHandle === 'ne') {
        // 右上角：保持左下角固定
        newY = resizeStartSize.current.y + resizeStartSize.current.height - newHeight;
      } else if (resizeHandle === 'sw') {
        // 左下角：保持右上角固定
        newX = resizeStartSize.current.x + resizeStartSize.current.width - newWidth;
      }
      // se (右下角) 保持左上角固定，不需要调整位置
      
      // 更新画布元素尺寸
      onItemResize?.(resizingItemId, newWidth, newHeight);
      
      // 如果位置改变，需要更新位置
      if (resizeHandle === 'nw' || resizeHandle === 'sw' || resizeHandle === 'ne') {
        onItemMove?.(resizingItemId, newX, newY);
      }
    } else if (isPanning) {
      // 用户交互时，确保初始化标志为 false
      if (isInitializingRef.current) {
        isInitializingRef.current = false;
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      const now = Date.now();
      if (lastPanUpdateTimeRef.current === 0 || now - lastPanUpdateTimeRef.current >= PAN_ZOOM_DEBOUNCE_MS) {
        const dx = e.clientX - lastAppliedMousePosRef.current.x;
        const dy = e.clientY - lastAppliedMousePosRef.current.y;
        setPan(prev => {
          const newPan = {
            x: Math.round(prev.x + dx),
            y: Math.round(prev.y + dy),
          };
          onViewChange?.(zoom, newPan);
          return newPan;
        });
        lastAppliedMousePosRef.current = { x: e.clientX, y: e.clientY };
        lastPanUpdateTimeRef.current = now;
      }
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
  }, [isResizing, resizingItemId, resizeHandle, isPanning, isBoxSelecting, displayZoom, pan, onItemResize, onItemMove, onViewChange]);

  // 右键菜单：在画布区域显示自定义菜单，阻止浏览器默认菜单；右键点击元素时与左键一致选中该元素，并记录画布坐标供粘贴定位
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPanning) return;
    let canvasX: number | undefined;
    let canvasY: number | undefined;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      canvasX = (e.clientX - rect.left - displayPan.x) / displayZoom;
      canvasY = (e.clientY - rect.top - displayPan.y) / displayZoom;
      // 从后往前找，得到最上层（最后渲染）的包含该点的元素
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (
          canvasX >= it.x &&
          canvasX <= it.x + it.width &&
          canvasY >= it.y &&
          canvasY <= it.y + it.height
        ) {
          onItemSelect?.(it.id);
          onItemMultiSelect?.([it.id]);
          break;
        }
      }
    }
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, canvasX, canvasY });
  }, [isPanning, displayPan, displayZoom, items, onItemSelect, onItemMultiSelect]);

  // 关闭右键菜单：点击菜单项、点击空白、ESC
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  // 边界处理：确保菜单不超出视口
  useLayoutEffect(() => {
    if (!contextMenu.open || !contextMenuRef.current) return;
    const el = contextMenuRef.current;
    const rect = el.getBoundingClientRect();
    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = contextMenu.x + MENU_OFFSET;
    let y = contextMenu.y + MENU_OFFSET;
    if (x + rect.width + MENU_PADDING > w) x = w - rect.width - MENU_PADDING;
    if (y + rect.height + MENU_PADDING > h) y = h - rect.height - MENU_PADDING;
    if (x < MENU_PADDING) x = MENU_PADDING;
    if (y < MENU_PADDING) y = MENU_PADDING;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [contextMenu.open, contextMenu.x, contextMenu.y]);

  useEffect(() => {
    if (!contextMenu.open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contextMenuRef.current?.contains(target)) return;
      closeContextMenu();
      // 若点击发生在画布区域内，阻止事件继续传递，避免画布将此次点击视为「空白处左键」而清空选区
      if (containerRef.current?.contains(target)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu.open, closeContextMenu]);

  const hasSelection = selectedItemId != null || (selectedItemIds?.length ?? 0) > 0;
  const runAndClose = useCallback((fn?: () => void) => {
    fn?.();
    closeContextMenu();
  }, [closeContextMenu]);

  // Handle panning/box selection/resize end
  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (isResizing) {
      setIsResizing(false);
      setResizingItemId(null);
      setResizeHandle(null);
      resizeStartPos.current = null;
      resizeStartSize.current = null;
    } else if (isBoxSelecting && containerRef.current && onItemMultiSelect) {
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
          
          // 四舍五入确保像素对齐
          const screenX = Math.round(item.x * displayZoom + displayPan.x);
          const screenY = Math.round(item.y * displayZoom + displayPan.y);
          const screenWidth = item.width * displayZoom;
          const screenHeight = item.height * displayZoom;

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

    // 平移结束：刷新最后一次未应用的 delta，保证画布停在正确位置
    if (isPanning) {
      const dx = lastMousePos.current.x - lastAppliedMousePosRef.current.x;
      const dy = lastMousePos.current.y - lastAppliedMousePosRef.current.y;
      if (dx !== 0 || dy !== 0) {
        setPan((prev) => {
          const newPan = { x: Math.round(prev.x + dx), y: Math.round(prev.y + dy) };
          onViewChange?.(zoomRef.current, newPan);
          return newPan;
        });
      }
    }
    setIsPanning(false);
  }, [isResizing, isBoxSelecting, selectionBox, items, displayZoom, displayPan, selectedItemIds, onItemMultiSelect, onItemSelect, onViewChange]);

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
  
  // 保存当前播放状态
  const savedPlayingVideos = useRef<Set<string>>(new Set());
  
  // 暂停所有视频
  const pauseAllVideos = useCallback(() => {
    // 保存当前播放状态
    savedPlayingVideos.current = new Set(playingVideos);
    // 暂停所有视频
    playingVideos.forEach(itemId => {
      const video = videoRefs.current.get(itemId);
      if (video) {
        video.pause();
      }
    });
    // 清空播放状态
    setPlayingVideos(new Set());
  }, [playingVideos]);
  
  // 恢复之前的播放状态
  const resumeVideos = useCallback(() => {
    // 恢复之前的播放状态
    savedPlayingVideos.current.forEach(itemId => {
      const video = videoRefs.current.get(itemId);
      if (video) {
        video.play().catch(error => {
          console.error('Error resuming video:', error);
        });
      }
    });
    setPlayingVideos(new Set(savedPlayingVideos.current));
    // 清空保存的状态
    savedPlayingVideos.current = new Set();
  }, []);
  
  const focusAnimationRef = useRef<number | null>(null);

  // 计算使给定区域（画布坐标）居中并适配合适缩放的目标 zoom/pan
  const computeFocusTarget = useCallback(
    (centerX: number, centerY: number, width: number, height: number) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      const fitScaleW = (containerWidth * 0.6) / width;
      const fitScaleH = (containerHeight * 0.6) / height;
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(fitScaleW, fitScaleH))
      );
      const newPanX = Math.round(containerWidth / 2 - centerX * newZoom);
      const newPanY = Math.round(containerHeight / 2 - centerY * newZoom);
      return { newZoom, newPan: { x: newPanX, y: newPanY } };
    },
    []
  );

  // 将画布平移并缩放到指定元素，使其居中并适配合适尺寸（带过渡动画）
  const focusOnItem = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item || !containerRef.current) return;
      const centerX = item.x + item.width / 2;
      const centerY = item.y + item.height / 2;
      const target = computeFocusTarget(centerX, centerY, item.width, item.height);
      if (!target) return;
      const startZoom = zoomRef.current;
      const startPan = { ...pan };
      const startTime = performance.now();
      const run = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / FOCUS_ANIMATION_MS);
        const k = easeOutCubic(t);
        const z = startZoom + (target.newZoom - startZoom) * k;
        const px = startPan.x + (target.newPan.x - startPan.x) * k;
        const py = startPan.y + (target.newPan.y - startPan.y) * k;
        setZoom(z);
        setPan({ x: Math.round(px), y: Math.round(py) });
        if (t < 1) {
          focusAnimationRef.current = requestAnimationFrame(run);
        } else {
          focusAnimationRef.current = null;
          onViewChange?.(target.newZoom, target.newPan);
        }
      };
      if (focusAnimationRef.current != null) cancelAnimationFrame(focusAnimationRef.current);
      focusAnimationRef.current = requestAnimationFrame(run);
    },
    [items, pan, computeFocusTarget, onViewChange]
  );

  // 将画布平移并缩放到多个元素的几何中心并适配合适尺寸（带过渡动画）
  const focusOnItems = useCallback(
    (itemIds: string[]) => {
      const selected = items.filter((i) => itemIds.includes(i.id));
      if (selected.length === 0 || !containerRef.current) return;
      if (selected.length === 1) {
        focusOnItem(selected[0].id);
        return;
      }
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const it of selected) {
        minX = Math.min(minX, it.x);
        minY = Math.min(minY, it.y);
        maxX = Math.max(maxX, it.x + it.width);
        maxY = Math.max(maxY, it.y + it.height);
      }
      const width = maxX - minX;
      const height = maxY - minY;
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      const target = computeFocusTarget(centerX, centerY, width, height);
      if (!target) return;
      const startZoom = zoomRef.current;
      const startPan = { ...pan };
      const startTime = performance.now();
      const run = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / FOCUS_ANIMATION_MS);
        const k = easeOutCubic(t);
        const z = startZoom + (target.newZoom - startZoom) * k;
        const px = startPan.x + (target.newPan.x - startPan.x) * k;
        const py = startPan.y + (target.newPan.y - startPan.y) * k;
        setZoom(z);
        setPan({ x: Math.round(px), y: Math.round(py) });
        if (t < 1) {
          focusAnimationRef.current = requestAnimationFrame(run);
        } else {
          focusAnimationRef.current = null;
          onViewChange?.(target.newZoom, target.newPan);
        }
      };
      if (focusAnimationRef.current != null) cancelAnimationFrame(focusAnimationRef.current);
      focusAnimationRef.current = requestAnimationFrame(run);
    },
    [items, pan, computeFocusTarget, focusOnItem, onViewChange]
  );

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    resumeVideos,
    focusOnItem,
    focusOnItems,
  }), [resumeVideos, focusOnItem, focusOnItems]);

  const resumeVideosRef = useRef(resumeVideos);
  useEffect(() => {
    resumeVideosRef.current = resumeVideos;
  }, [resumeVideos]);

  // Handle item drag
  const handleDrag = (id: string) => (_e: DraggableEvent, data: DraggableData) => {
    const canvasX = Math.round((data.x - displayPan.x) / displayZoom * 100) / 100;
    const canvasY = Math.round((data.y - displayPan.y) / displayZoom * 100) / 100;
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
    // 四舍五入确保像素对齐
    const newPanX = Math.round(centerX - canvasX * newZoom);
    const newPanY = Math.round(centerY - canvasY * newZoom);
    
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
    // 四舍五入确保像素对齐
    const newPanX = Math.round(centerX - canvasX * newZoom);
    const newPanY = Math.round(centerY - canvasY * newZoom);
    
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
        isPanning || isSpacePressed ? 'cursor-grab' : 'cursor-default',
        isPanning && 'cursor-grabbing'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ 
        touchAction: 'none',
        // 启用 GPU 加速
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Dot Pattern Background */}
      <div 
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: `${24 * displayZoom}px ${24 * displayZoom}px`,
          backgroundPosition: `${displayPan.x}px ${displayPan.y}px`,
          // GPU 加速背景层
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />

      {/* Canvas Layer - 使用 GPU 加速优化性能 */}
      <div 
        className="absolute inset-0"
        style={{
          // 强制启用 GPU 加速
          transform: 'translate3d(0, 0, 0)',
          // 使用 will-change 提示浏览器优化
          willChange: (isPanning || isResizing) ? 'transform' : 'auto',
          // 启用硬件加速
          backfaceVisibility: 'hidden',
          perspective: 1000,
        }}
      >
        {items.map((item, index) => {
          // 使用 Math.round 确保像素对齐，避免子像素渲染导致的抖动
          const screenX = Math.round(item.x * displayZoom + displayPan.x);
          const screenY = Math.round(item.y * displayZoom + displayPan.y);
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
              disabled={isPanning || isSpacePressed || isPlaceholderDisabled}
              bounds={false}
              cancel=".no-drag"
            >
              <div
                ref={itemRef}
                data-item-id={item.id}
                data-is-placeholder={isPlaceholder ? 'true' : undefined}
                className={cn(
                  'absolute rounded-lg bg-background shadow-lg overflow-visible',
                  // 只在删除和新增时应用过渡动画，不影响拖拽和缩放
                  (deletingItemIds.includes(item.id) || addingItemIds.includes(item.id)) && 'transition-[opacity,transform] duration-300 ease-in-out',
                  isPlaceholderDisabled 
                    ? 'cursor-default pointer-events-none' 
                    : 'cursor-move',
                  (selectedItemId === item.id || selectedItemIds.includes(item.id))
                    ? 'ring-2 ring-primary shadow-xl z-50 shadow-[#666]'
                    : 'ring-inset ring-border hover:shadow-xl',
                  highlightedItemId === item.id && 'ring-2 ring-green-500 shadow-xl animate-pulse',
                  isPlaceholder && 'bg-muted/50',
                  deletingItemIds.includes(item.id) && 'opacity-0 scale-75 pointer-events-none',
                  addingItemIds.includes(item.id) && 'opacity-0 scale-90'
                )}
                onMouseEnter={() => {
                  if (isVideo) {
                    const id = item.id;
                    if (videoHoverTimeoutRef.current[id]) {
                      clearTimeout(videoHoverTimeoutRef.current[id]);
                      delete videoHoverTimeoutRef.current[id];
                    }
                    videoHoverTimeoutRef.current[id] = setTimeout(() => {
                      const video = videoRefs.current.get(id);
                      if (video) video.play().catch(() => {});
                      delete videoHoverTimeoutRef.current[id];
                    }, HOVER_DEBOUNCE_MS);
                  } else if (!isPlaceholder) {
                    if (hoverEnterTimeoutRef.current) {
                      clearTimeout(hoverEnterTimeoutRef.current);
                      hoverEnterTimeoutRef.current = null;
                    }
                    hoverEnterTimeoutRef.current = setTimeout(() => {
                      setHoveredItemId(item.id);
                      hoverEnterTimeoutRef.current = null;
                    }, HOVER_DEBOUNCE_MS);
                  }
                }}
                onMouseLeave={() => {
                  if (isVideo) {
                    const id = item.id;
                    if (videoHoverTimeoutRef.current[id]) {
                      clearTimeout(videoHoverTimeoutRef.current[id]);
                      delete videoHoverTimeoutRef.current[id];
                    }
                    const video = videoRefs.current.get(id);
                    if (video) video.pause();
                  } else if (!isPlaceholder) {
                    if (hoverEnterTimeoutRef.current) {
                      clearTimeout(hoverEnterTimeoutRef.current);
                      hoverEnterTimeoutRef.current = null;
                    }
                    setHoveredItemId(null);
                  }
                }}
                style={{ 
                  // 四舍五入尺寸，确保像素对齐
                  width: Math.round(item.width * displayZoom), 
                  height: Math.round(item.height * displayZoom),
                  zIndex: (selectedItemId === item.id || selectedItemIds.includes(item.id)) ? 50 : index + 1,
                  // GPU 加速每个元素
                  transform: 'translate3d(0, 0, 0)',
                  willChange: (isPanning || isResizing) ? 'transform' : 'auto',
                  // 启用硬件加速
                  backfaceVisibility: 'hidden',
                  transition: '0.1s all'
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
                  // 暂停所有视频
                  pauseAllVideos();
                  // 触发画布的双击事件，打开大图查看器
                  onItemDoubleClick?.(item);
                  // 通知父组件查看器已打开
                  onViewerOpen?.();
                }}
              >
                {isPlaceholder ? (
                  <div className="h-full w-full relative rounded-lg overflow-hidden border border-border/30 bg-background">
                    {/* 基础背景 - 淡灰色背景 */}
                    <div className="absolute inset-0 bg-muted/20" />
                    
                    {/* 网格图案 - 更明显的网格效果 */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `
                          linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px),
                          linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)
                        `,
                        backgroundSize: '24px 24px',
                      }}
                    />
                    
                    {/* 脉冲背景层 - 整体呼吸效果 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 animate-pulse-slow" />
                    
                    {/* 主要闪烁动画 - 从左到右的明亮闪烁 */}
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                        width: '70%',
                        animation: 'shimmer 2s ease-in-out infinite',
                        transform: 'skewX(-20deg)',
                      }} 
                    />
                    
                    {/* 次要闪烁动画 - 延迟的闪烁效果 */}
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        width: '50%',
                        animation: 'shimmer 2.5s ease-in-out infinite',
                        animationDelay: '1s',
                        transform: 'skewX(-20deg)',
                      }} 
                    />
                    
                    {/* 中心加载指示器 - 更美观的加载动画 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-12 h-12">
                        {/* 外圈脉冲 */}
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-primary/20 animate-ping" />
                        {/* 中圈旋转 */}
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary/40 animate-spin" style={{ animationDuration: '1s' }} />
                        {/* 内圈点 */}
                        {/* <div className="w-6 h-6 rounded-full bg-primary/30 animate-pulse" /> */}
                      </div>
                    </div>
                    
                    {/* 底部提示文字（可选） */}
                    {item.prompt && (
                      <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
                        <p className="text-xs text-muted-foreground truncate px-2">
                          {item.prompt}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isVideo ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current.set(item.id, el);
                      } else {
                        videoRefs.current.delete(item.id);
                      }
                    }}
                    src={item.url}
                    className="h-full w-full rounded-lg object-cover"
                    draggable={false}
                    controls
                    playsInline
                    loop
                    onPlay={() => {
                      setPlayingVideos(prev => new Set(prev).add(item.id));
                    }}
                    onPause={() => {
                      setPlayingVideos(prev => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }}
                    onEnded={() => {
                      setPlayingVideos(prev => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }}
                    onClick={(e) => {
                      // 如果点击在控制栏区域，阻止事件冒泡到画布
                      const video = e.currentTarget as HTMLVideoElement;
                      const rect = video.getBoundingClientRect();
                      const clickY = e.clientY - rect.top;
                      const videoHeight = rect.height;
                      // 如果点击在底部 20% 区域（控制栏区域），阻止冒泡
                      if (clickY > videoHeight * 0.8) {
                        e.stopPropagation();
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // 不 stopPropagation，让事件冒泡到画布以统一打开右键菜单并选中当前元素
                    }}
                    onMouseDown={(e) => {
                      // 检测点击位置，如果在控制栏区域，阻止拖动
                      const video = e.currentTarget as HTMLVideoElement;
                      const rect = video.getBoundingClientRect();
                      const clickY = e.clientY - rect.top;
                      const videoHeight = rect.height;
                      // 如果点击在底部 20% 区域（控制栏区域），阻止拖动
                      if (clickY > videoHeight * 0.8) {
                        e.stopPropagation();
                        return;
                      }
                      // 如果点击在视频的其他区域，允许拖动（不阻止事件）
                    }}
                    onDoubleClick={(e) => {
                      // 阻止视频的默认双击全屏行为
                      e.preventDefault();
                      e.stopPropagation();
                      // 暂停所有视频
                      pauseAllVideos();
                      // 触发画布的双击事件，打开大图查看器
                      onItemDoubleClick?.(item);
                      // 通知父组件查看器已打开
                      onViewerOpen?.();
                    }}
                  />
                ) : (
                  /* 图片图层：外层裁切（overflow-hidden），内层 hover 放大，保证放大图被裁切且与四角拖拽圆点兼容（圆点在外层 overflow-visible 下不裁切） */
                  <div className="h-full w-full overflow-hidden rounded-lg min-w-0 min-h-0">
                    <div
                      className={cn(
                        'h-full w-full rounded-lg origin-center transition-transform duration-500 ease-out',
                        hoveredItemId === item.id && 'scale-105'
                      )}
                    >
                      <img
                        src={item.url}
                        alt={item.prompt || 'Canvas item'}
                        className="h-full w-full rounded-lg object-cover pointer-events-none select-none"
                        draggable={false}
                      />
                    </div>
                  </div>
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

                {/* Selection and Resize Handles */}
                {selectedItemId === item.id && !isPlaceholderDisabled && (
                  <>
                    {/* 左上角 - 可拖拽调整大小 */}
                    <div
                      className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-primary bg-background cursor-nwse-resize hover:bg-primary/10 hover:scale-125 transition-transform z-[60] shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isPlaceholderDisabled) return;
                        setIsResizing(true);
                        setResizingItemId(item.id);
                        setResizeHandle('nw');
                        resizeStartPos.current = { x: e.clientX, y: e.clientY };
                        resizeStartSize.current = {
                          width: item.width,
                          height: item.height,
                          x: item.x,
                          y: item.y,
                        };
                      }}
                      style={{transition: '0.5s all'}}
                    />
                    {/* 右上角 - 可拖拽调整大小 */}
                    <div
                      className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-primary bg-background cursor-nesw-resize hover:bg-primary/10 hover:scale-125 transition-transform z-[60] shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isPlaceholderDisabled) return;
                        setIsResizing(true);
                        setResizingItemId(item.id);
                        setResizeHandle('ne');
                        resizeStartPos.current = { x: e.clientX, y: e.clientY };
                        resizeStartSize.current = {
                          width: item.width,
                          height: item.height,
                          x: item.x,
                          y: item.y,
                        };
                      }}
                      style={{transition: '0.5s all'}}
                    />
                    {/* 左下角 - 可拖拽调整大小 */}
                    <div
                      className="absolute -left-2 -bottom-2 h-4 w-4 rounded-full border-2 border-primary bg-background cursor-nesw-resize hover:bg-primary/10 hover:scale-125 transition-transform z-[60] shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isPlaceholderDisabled) return;
                        setIsResizing(true);
                        setResizingItemId(item.id);
                        setResizeHandle('sw');
                        resizeStartPos.current = { x: e.clientX, y: e.clientY };
                        resizeStartSize.current = {
                          width: item.width,
                          height: item.height,
                          x: item.x,
                          y: item.y,
                        };
                      }}
                      style={{transition: '0.5s all'}}
                    />
                    {/* 右下角 - 可拖拽调整大小 */}
                    <div
                      className="absolute -right-2 -bottom-2 h-4 w-4 rounded-full border-2 border-primary bg-background cursor-nwse-resize hover:bg-primary/10 hover:scale-125 transition-transform z-[60] shadow-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isPlaceholderDisabled) return;
                        setIsResizing(true);
                        setResizingItemId(item.id);
                        setResizeHandle('se');
                        resizeStartPos.current = { x: e.clientX, y: e.clientY };
                        resizeStartSize.current = {
                          width: item.width,
                          height: item.height,
                          x: item.x,
                          y: item.y,
                        };
                      }}
                      style={{transition: '0.5s all'}}
                    />
                  </>
                )}

                {/* 选中时在图层下方显示宽高与坐标 */}
                {(selectedItemId === item.id || selectedItemIds.includes(item.id)) && (
                  <div className="absolute left-0 right-0 -bottom-6 flex justify-center pointer-events-none z-[55]">
                    <span className="rounded bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm whitespace-nowrap">
                      {Math.round(item.width)}×{Math.round(item.height)}  ({Math.round(item.x)}, {Math.round(item.y)})
                    </span>
                  </div>
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
            // GPU 加速选择框
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
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
        <span>{t('canvas.panningHint')}</span>
      </div>

      {/* 画布右键菜单：黑色主色、Portal 到 body，固定定位，带边界与过渡 */}
      {contextMenu.open &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[10000] min-w-[180px] rounded-lg border border-gray-700/80 bg-[#171717eb] py-1 text-gray-100 shadow-xl outline-none transition-opacity duration-150 ease-out"
            style={{ left: contextMenu.x + MENU_OFFSET, top: contextMenu.y + MENU_OFFSET }}
            role="menu"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => {
              // 点击菜单任意区域（含黑色背景）时阻止冒泡，避免被当作「画布外点击」而关闭菜单或清除选中
              e.stopPropagation();
            }}
          >
            <div className="px-2 py-1.5">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10',
                  !hasSelection && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => hasSelection && runAndClose(onContextCopy)}
              >
                <span className="flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.copy')}
                </span>
                <span className="text-xs text-gray-400">⌘C</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10',
                  !hasSelection && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => hasSelection && runAndClose(onContextCut)}
              >
                <span className="flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.cut')}
                </span>
                <span className="text-xs text-gray-400">⌘X</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10"
                onClick={() => runAndClose(() => onContextPaste?.(contextMenu.canvasX, contextMenu.canvasY))}
              >
                <span className="flex items-center gap-2">
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.paste')}
                </span>
                <span className="text-xs text-gray-400">⌘V</span>
              </button>
            </div>
            <div className="my-1 h-px bg-gray-700/80" />
            <div className="px-2 py-1.5">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10',
                  !hasSelection && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => hasSelection && runAndClose(onContextFocus)}
              >
                <span className="flex items-center gap-2">
                  <Crosshair className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.focus')}
                </span>
                <span className="text-xs text-gray-400">F</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10',
                  !hasSelection && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => hasSelection && runAndClose(onContextDelete)}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.delete')}
                </span>
              </button>
            </div>
            <div className="my-1 h-px bg-gray-700/80" />
            <div className="px-2 py-1.5">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10"
                onClick={() => runAndClose(onContextShare)}
              >
                <span className="flex items-center gap-2">
                  <Share2 className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.share')}
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-100 hover:bg-white/10',
                  !hasSelection && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => hasSelection && runAndClose(onContextDownload)}
              >
                <span className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  {t('canvas.contextMenu.download')}
                </span>
                <span className="text-xs text-gray-400">⇧D</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
});
