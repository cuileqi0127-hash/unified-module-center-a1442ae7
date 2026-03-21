import type { StaticImageData } from "next/image";

/** 将 Next 静态资源导入（StaticImageData）或 URL 字符串转为 `<img src>` 可用的字符串 */
export function imageSrc(src: string | StaticImageData): string {
  return typeof src === "object" ? src.src : src;
}
