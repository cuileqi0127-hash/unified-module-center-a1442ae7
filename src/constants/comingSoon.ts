/**
 * 统一维护「即将上线」的模块/工具 ID 列表
 * 供 DynamicSidebar、AppPlaza 等使用，保证侧边栏与应用广场的 Coming Soon 状态一致
 */
export const COMING_SOON_ITEMS: readonly string[] = [
  'ecommerce-assets',
  'reference-to-image',
];

/** 禁止进入的 AI Toolbox 子页（直链与侧栏均不可进入） */
export const BLOCKED_AI_TOOLBOX_PAGE_IDS: readonly string[] = [
  // 'planning-solutions',
  // 'tiktok-viral-video-matching',
  // 'tiktok-solution',
  // 'reference-to-video',
];

export function isComingSoon(id: string): boolean {
  return COMING_SOON_ITEMS.includes(id);
}

/** 与 reference-to-video 同页的旧路由 */
export function isBlockedToolboxPage(pageId: string): boolean {
  if (BLOCKED_AI_TOOLBOX_PAGE_IDS.includes(pageId)) return true;
  return pageId === 'replicate-video';
}

/** 侧栏：即将上线或禁止访问的项均不可点 */
export function isToolboxSidebarDisabled(id: string): boolean {
  return isComingSoon(id) || isBlockedToolboxPage(id);
}
