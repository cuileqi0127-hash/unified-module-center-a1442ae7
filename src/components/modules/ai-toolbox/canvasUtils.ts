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

/** 在 base 上施加 [min, max) 的随机偏移 */
function randomOffset(base: number, range: number): number {
  return base + (Math.random() * 2 - 1) * range;
}

/**
 * 找到不重叠的位置（考虑间隔），并施加小范围随机偏移防止完全重叠，同时限制距离不过远。
 * 相邻元素间距由 padding 控制；返回位置在起始点附近有限范围内。
 * @param newItem 新项目的尺寸
 * @param existingItems 现有项目列表
 * @param startX 起始X坐标
 * @param startY 起始Y坐标
 * @param stepX 未用于步进（保留兼容）
 * @param stepY 未用于步进（保留兼容）
 * @param maxAttempts 最大尝试次数
 * @param padding 图层之间的间隔（像素），默认 12
 */
export function findNonOverlappingPosition(
  newItem: { width: number; height: number },
  existingItems: Rect[],
  startX: number = 300,
  startY: number = 200,
  stepX: number = 10,
  stepY: number = 10,
  maxAttempts: number = 100,
  padding: number = 12,
): { x: number; y: number } {
  const stepXActual = newItem.width + padding;
  const stepYActual = newItem.height + padding;
  /** 限制网格范围，使图层不会离起始点太远（最多约 3 列 3 行） */
  const maxCol = 3;
  const maxRow = 3;

  let x = startX;
  let y = startY;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const row = Math.floor(attempts / (maxCol + 1));
    const col = attempts % (maxCol + 1);
    x = startX + col * stepXActual;
    y = startY + row * stepYActual;
    if (row > maxRow) break;

    const newRect: Rect = {
      x,
      y,
      width: newItem.width,
      height: newItem.height,
    };

    const hasOverlap = existingItems.some(item => isOverlapping(newRect, item, padding));

    if (!hasOverlap) {
      /** 施加小范围随机偏移（±24px）防止多图完全叠在一起，且不超出合理距离 */
      const nudgeRange = 24;
      const maxNudgeAttempts = 8;
      for (let n = 0; n < maxNudgeAttempts; n++) {
        const nudgedX = Math.round(randomOffset(x, nudgeRange));
        const nudgedY = Math.round(randomOffset(y, nudgeRange));
        const nudgedRect: Rect = { x: nudgedX, y: nudgedY, width: newItem.width, height: newItem.height };
        const nudgedOverlap = existingItems.some(item => isOverlapping(nudgedRect, item, padding));
        if (!nudgedOverlap) {
          return { x: nudgedX, y: nudgedY };
        }
      }
      return { x, y };
    }

    attempts++;
  }

  /** 兜底：在起始点附近随机一个不重叠位置，限制在 ±step 范围内 */
  const fallbackRange = Math.min(stepXActual, stepYActual, 120);
  for (let k = 0; k < 20; k++) {
    const fx = Math.round(randomOffset(startX, fallbackRange));
    const fy = Math.round(randomOffset(startY, fallbackRange));
    const fr: Rect = { x: fx, y: fy, width: newItem.width, height: newItem.height };
    if (!existingItems.some(item => isOverlapping(fr, item, padding))) {
      return { x: fx, y: fy };
    }
  }

  return { x: startX + (attempts % (maxCol + 1)) * stepXActual, y: startY };
}
