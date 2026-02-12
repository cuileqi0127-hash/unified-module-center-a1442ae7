import { cn } from '@/lib/utils';

/**
 * 全局 Loading 图标：深色弧形旋转（C 形半圆）
 * 与「正在初始化」等全屏 loading 视觉统一
 */
export function LoadingSpinner({
  className,
  size = 'default',
}: {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const sizeClass =
    size === 'sm'
      ? 'h-4 w-4'
      : size === 'lg'
        ? 'h-10 w-10'
        : 'h-8 w-8';
  return (
    <div
      role="status"
      aria-label="加载中"
      className={cn(
        'rounded-full border-2 border-transparent border-b-current animate-spin text-gray-900 dark:text-gray-100',
        sizeClass,
        className
      )}
    />
  );
}
