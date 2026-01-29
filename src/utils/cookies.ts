/**
 * Cookie 工具函数
 * 用于读取和设置 cookies
 */

/**
 * 获取 cookie 值
 * @param name cookie 名称
 * @returns cookie 值，如果不存在则返回 null
 */
export function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * 设置 cookie
 * @param name cookie 名称
 * @param value cookie 值
 * @param days 过期天数（可选，默认不设置过期时间）
 */
export function setCookie(name: string, value: string, days?: number): void {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + value + expires + '; path=/';
}

/**
 * 删除 cookie
 * @param name cookie 名称
 */
export function deleteCookie(name: string): void {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}
