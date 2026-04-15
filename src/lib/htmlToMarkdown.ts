import TurndownService from 'turndown';

let turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
  }
  return turndown;
}

function fallbackPlainText(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * 将 HTML（含完整文档或片段）转为 Markdown，供记忆库「contentMd」等场景使用。
 */
export function htmlToMarkdown(html: string): string {
  const raw = html.trim();
  if (!raw) return '';

  let inner = raw;
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      inner = doc.body?.innerHTML ?? raw;
    } catch {
      inner = raw;
    }
  }

  let md = '';
  try {
    md = getTurndown().turndown(inner).trim();
  } catch {
    md = '';
  }

  if (!md) {
    const plain = fallbackPlainText(raw);
    return plain || '';
  }

  return md;
}
