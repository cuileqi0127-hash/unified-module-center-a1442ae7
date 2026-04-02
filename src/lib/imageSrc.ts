/** Vite `import asset from './x.png'` 等与带 `.src` 的对象或 URL 字符串 */
export type ImageSrcInput = string | { src: string };

export function imageSrc(src: ImageSrcInput): string {
  return typeof src === "object" && src && "src" in src ? src.src : (src as string);
}
