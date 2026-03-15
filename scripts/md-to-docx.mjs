#!/usr/bin/env node
/**
 * 将 docs 目录下所有 .md 按目录结构转为 .docx
 * 使用: node scripts/md-to-docx.mjs
 */
import { convertMarkdownToDocx } from '@mohtasham/md-to-docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(__dirname, '..', 'docs');

function* walkMd(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkMd(full);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      yield full;
    }
  }
}

async function main() {
  const files = [...walkMd(docsDir)];
  console.log(`Found ${files.length} markdown files.`);
  for (const mdPath of files) {
    const rel = path.relative(docsDir, mdPath);
    const docxPath = mdPath.replace(/\.md$/, '.docx');
    try {
      const md = fs.readFileSync(mdPath, 'utf8');
      const blob = await convertMarkdownToDocx(md);
      const buf = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(docxPath, buf);
      console.log(`OK ${rel} -> ${path.relative(docsDir, docxPath)}`);
    } catch (err) {
      console.error(`FAIL ${rel}:`, err.message);
    }
  }
}

main();
