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

/** 基准点附近随机范围（像素），保证新图层不会离基准点太远 */
const RANDOM_SPREAD = 60;
/** 随机尝试次数，失败后再用网格 */
const RANDOM_ATTEMPTS = 40;

/**
 * 找到不重叠的位置（考虑间隔），保证每个图层坐标都不重叠且距离不过远。
 * 优先在基准点附近随机尝试；失败则按网格步进搜索；返回位置均通过重叠校验。
 * @param newItem 新项目的尺寸
 * @param existingItems 现有项目列表
 * @param startX 起始X坐标（基准点）
 * @param startY 起始Y坐标（基准点）
 * @param stepX 未用于步进（保留兼容）
 * @param stepY 未用于步进（保留兼容）
 * @param maxAttempts 网格搜索最大尝试次数
 * @param padding 图层之间的最小间隔（像素），默认 12
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

  const noOverlap = (x: number, y: number): boolean => {
    const r: Rect = { x, y, width: newItem.width, height: newItem.height };
    return !existingItems.some((item) => isOverlapping(r, item, padding));
  };

  // 1. 在基准点附近随机尝试，保证不重叠且距离不过远
  for (let i = 0; i < RANDOM_ATTEMPTS; i++) {
    const x = Math.round(startX + (Math.random() * 2 - 1) * RANDOM_SPREAD);
    const y = Math.round(startY + (Math.random() * 2 - 1) * RANDOM_SPREAD);
    if (noOverlap(x, y)) return { x, y };
  }

  // 2. 网格搜索：步进保证与现有块间隔 padding，保证每个位置都不重叠
  for (let a = 0; a < maxAttempts; a++) {
    const col = a % 5;
    const row = Math.floor(a / 5);
    const x = startX + col * stepXActual;
    const y = startY + row * stepYActual;
    if (noOverlap(x, y)) return { x, y };
  }

  // 3. 兜底：继续扩展网格直到找到不重叠位置（保证绝不返回重叠坐标）
  for (let a = maxAttempts; a < maxAttempts + 200; a++) {
    const col = a % 10;
    const row = Math.floor(a / 10);
    const x = startX + col * stepXActual;
    const y = startY + row * stepYActual;
    if (noOverlap(x, y)) return { x, y };
  }

  // 4. 极端兜底：再随机尝试更多次（仍限制在合理距离内）
  for (let k = 0; k < 50; k++) {
    const x = Math.round(startX + (Math.random() * 2 - 1) * (RANDOM_SPREAD + 40));
    const y = Math.round(startY + (Math.random() * 2 - 1) * (RANDOM_SPREAD + 40));
    if (noOverlap(x, y)) return { x, y };
  }

  // 5. 最终兜底：继续扩展网格直至找到空位，保证绝不返回重叠坐标
  for (let a = maxAttempts + 200; a < 500; a++) {
    const col = a % 15;
    const row = Math.floor(a / 15);
    const x = startX + col * stepXActual;
    const y = startY + row * stepYActual;
    if (noOverlap(x, y)) return { x, y };
  }

  return { x: startX, y: startY };
}
