import assert from 'node:assert/strict';
import {
  applicationGuide,
  extractHtmlDocument,
  previewDocument,
} from '../lib/demo.ts';

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
assert.equal(preview.includes('selection-mode'), true);
assert.equal(preview.includes("type:'selection'"), true);
assert.equal(preview.includes('\\u003c/script\\u003e'), true);
const guide =
  applicationGuide(`<!doctype html><html><head><title>极简待办</title></head>
<body><h1>今天的任务</h1><input placeholder="新增任务"><button>添加</button>
<script>localStorage.setItem('tasks', '[]')</script></body></html>`);
assert.equal(guide.name, '极简待办');
assert.match(guide.introduction, /管理任务/);
assert.ok(guide.instructions.some((item) => /输入区域/.test(item)));
assert.ok(guide.instructions.some((item) => /自动保存/.test(item)));
console.log('PASS: clean preview document and isolated persistence bridge');
