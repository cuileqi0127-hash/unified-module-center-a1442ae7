/**
 * 门户主站根地址：OAuth 登录后跳转、导航「升级」外链等。
 * 由 .env 中 VITE_PORTAL_HOME_URL 注入。
 */
export const PORTAL_HOME_URL =
  import.meta.env.VITE_PORTAL_HOME_URL ??
  (import.meta.env.DEV
    ? "http://localhost:8080/"
    : "https://www.oran.cn/");
