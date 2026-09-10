import assert from 'node:assert/strict';
import { extractHtmlDocument, previewDocument } from '../lib/demo.ts';

const raw = `这是应用说明，不应出现在预览里。\n\`\`\`html\n<!DOCTYPE html><html><head><title>测试</title></head><body><main>应用</main></body></html>\n\`\`\``;
const clean = extractHtmlDocument(raw);
assert.equal(
  clean,
  '<!DOCTYPE html><html><head><title>测试</title></head><body><main>应用</main></body></html>',
);
const preview = previewDocument(raw, {
  item: '</script><b>不能逃逸脚本</b>',
});
assert.equal(preview.includes('这是应用说明'), false);
assert.equal(preview.includes('atom-preview'), true);
assert.equal(preview.includes('localStorage'), true);
assert.equal(preview.includes('\\u003c/script\\u003e'), true);
console.log('PASS: clean preview document and isolated persistence bridge');
