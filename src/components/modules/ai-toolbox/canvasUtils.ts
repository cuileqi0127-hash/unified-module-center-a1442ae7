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
 * @param rect1 第一个矩形
 * @param rect2 第二个矩形
 * @param padding 间隔（像素），默认 30
 */
export function isOverlapping(rect1: Rect, rect2: Rect, padding: number = 30): boolean {
  // 考虑间隔，将每个矩形扩展 padding 像素
  return (
    rect1.x - padding < rect2.x + rect2.width + padding &&
    rect1.x + rect1.width + padding > rect2.x - padding &&
    rect1.y - padding < rect2.y + rect2.height + padding &&
    rect1.y + rect1.height + padding > rect2.y - padding
  );
}

/**
 * 找到不重叠的位置（考虑间隔）
 * @param newItem 新项目的尺寸
 * @param existingItems 现有项目列表
 * @param startX 起始X坐标
 * @param startY 起始Y坐标
 * @param stepX X方向步进
 * @param stepY Y方向步进
 * @param maxAttempts 最大尝试次数
 * @param padding 图层之间的间隔（像素），默认 30
 */
export function findNonOverlappingPosition(
  newItem: { width: number; height: number },
  existingItems: Rect[],
  startX: number = 300,
  startY: number = 200,
  stepX: number = 50,
  stepY: number = 50,
  maxAttempts: number = 100,
  padding: number = 30
): { x: number; y: number } {
  let x = startX;
  let y = startY;
  let attempts = 0;

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

    // 尝试下一个位置（螺旋式搜索）
    // 步进应该至少等于 padding，确保有足够间隔
    const effectiveStepX = Math.max(stepX, padding);
    const effectiveStepY = Math.max(stepY, padding);
    const row = Math.floor(attempts / 5);
    const col = attempts % 5;
    x = startX + col * effectiveStepX;
    y = startY + row * effectiveStepY;

    attempts++;
  }

  // 如果找不到不重叠的位置，返回一个偏移较大的位置
  const effectiveStepX = Math.max(stepX, padding);
  const effectiveStepY = Math.max(stepY, padding);
  return {
    x: startX + (attempts % 10) * effectiveStepX,
    y: startY + Math.floor(attempts / 10) * effectiveStepY,
  };
}
