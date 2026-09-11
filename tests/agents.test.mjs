import assert from 'node:assert/strict';
import { engineeringBrief } from '../lib/agents.ts';

const newApplication = engineeringBrief(
  '待办应用，支持添加、完成和删除任务',
  false,
);
assert.match(newApplication, /创建一个可直接体验的核心产品/);
assert.match(newApplication, /添加、完成和删除/);

const existingApplication = engineeringBrief('改成深色主题', true);
assert.match(existingApplication, /基于现有应用实现本轮修改/);
assert.match(existingApplication, /保留现有功能与数据/);

const publicText = newApplication + existingApplication;
assert.doesNotMatch(publicText, /chain.of.thought|raw_reasoning|隐藏推理/i);
console.log('PASS: engineering brief contains only explicit build constraints');
