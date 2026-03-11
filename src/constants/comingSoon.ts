/**
 * 统一维护「即将上线」的模块/工具 ID 列表
 * 供 DynamicSidebar、AppPlaza 等使用，保证侧边栏与应用广场的 Coming Soon 状态一致
 */
export const COMING_SOON_ITEMS: readonly string[] = [
  // 'reference-to-video',
  'ecommerce-assets',
  'reference-to-image',
  // 'tiktok-viral-video-matching',
];

export function isComingSoon(id: string): boolean {
  return COMING_SOON_ITEMS.includes(id);
}
