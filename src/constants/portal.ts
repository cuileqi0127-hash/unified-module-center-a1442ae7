/**
 * 门户主站根地址：OAuth 登录后跳转、导航「升级」外链等。
 * 由对应 mode 的 .env.[mode] 中 VITE_PORTAL_HOME_URL 注入（见 .env.development / .env.test / .env.production）。
 */
export const PORTAL_HOME_URL =
  (import.meta.env.VITE_PORTAL_HOME_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:8080/" : "https://www.oran.cn/");
