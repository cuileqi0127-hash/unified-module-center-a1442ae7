/**
 * 门户主站根地址：OAuth 登录后跳转、导航「升级」外链等。
 * 由 .env 中 NEXT_PUBLIC_PORTAL_HOME_URL 注入（原 VITE_PORTAL_HOME_URL）。
 */
export const PORTAL_HOME_URL =
  process.env.NEXT_PUBLIC_PORTAL_HOME_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8080/"
    : "https://www.oran.cn/");
