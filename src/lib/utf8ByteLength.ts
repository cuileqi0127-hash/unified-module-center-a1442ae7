/**
 * 文本按 UTF-8 编码的字节长度（与常见接口 limit 一致）
 */
export function utf8ByteLength(text: string): number {
  if (!text) return 0;
  return new TextEncoder().encode(text).length;
}
