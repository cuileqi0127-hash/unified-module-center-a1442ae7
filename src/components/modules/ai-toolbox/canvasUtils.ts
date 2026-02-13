/**
 * Canvas Utility Functions
 * 画布工具函数
 */

// 矩形接口
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 检测两个矩形是否重叠（考虑间隔）
 * 使用 padding/2 扩展每个矩形，使「不重叠」等价于「间隙 >= padding」，与步进 width+padding 一致。
 * @param rect1 第一个矩形
 * @param rect2 第二个矩形
 * @param padding 期望的最小间隔（像素），默认 12
 */
export function isOverlapping(rect1: Rect, rect2: Rect, padding: number = 12): boolean {
  const half = padding / 2;
  return (
    rect1.x - half < rect2.x + rect2.width + half &&
    rect1.x + rect1.width + half > rect2.x - half &&
    rect1.y - half < rect2.y + rect2.height + half &&
    rect1.y + rect1.height + half > rect2.y - half
  );
}

/**
 * 找到不重叠的位置（考虑间隔）
 * 相邻元素间距严格由 padding 控制：步进 = 元素尺寸 + padding。
 * @param newItem 新项目的尺寸
 * @param existingItems 现有项目列表
 * @param startX 起始X坐标
 * @param startY 起始Y坐标
 * @param stepX 未用于步进（保留兼容）
 * @param stepY 未用于步进（保留兼容）
 * @param maxAttempts 最大尝试次数
 * @param padding 图层之间的间隔（像素），默认 12，直接决定元素间距
 */
export function findNonOverlappingPosition(
  newItem: { width: number; height: number },
  existingItems: Rect[],
  startX: number = 300,
  startY: number = 200,
  stepX: number = 10,
  stepY: number = 10,
  maxAttempts: number = 100,
  // padding: number = 12
): { x: number; y: number } {
  let x = startX;
  let y = startY;
  let attempts = 0;
  let padding = 100

  while (attempts < maxAttempts) {
    const newRect: Rect = {
      x,
      y,
      width: newItem.width,
      height: newItem.height,
    };

    // 检查是否与现有项目重叠（考虑间隔）
    const hasOverlap = existingItems.some(item => isOverlapping(newRect, item, padding));

    if (!hasOverlap) {
      return { x, y };
    }

    // 尝试下一个位置（网格搜索）。步进严格使用「元素尺寸 + padding」，保证间距由 padding 唯一控制
    const stepXActual = newItem.width + padding;
    const stepYActual = newItem.height + padding;
    const row = Math.floor(attempts / 5);
    const col = attempts % 5;
    x = startX + col * stepXActual;
    y = startY + row * stepYActual;

    attempts++;
  }

  // 如果找不到不重叠的位置，返回一个偏移较大的位置
  const stepXActual = newItem.width + padding;
  const stepYActual = newItem.height + padding;
  return {
    x: startX + (attempts % 10) * stepXActual,
    y: startY + Math.floor(attempts / 10) * stepYActual,
  };
}
