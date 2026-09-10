import assert from 'node:assert/strict';
import { collaborationTrace, engineeringBrief } from '../lib/agents.ts';

const pending = collaborationTrace(
  '待办应用，支持添加、完成和删除任务',
  false,
);
assert.equal(pending.length, 4);
assert.deepEqual(
  pending.map((item) => item.role),
  ['analyst', 'designer', 'engineer', 'reviewer'],
);
assert.equal(pending[0].status, 'active');
assert.equal(pending[1].status, 'pending');
assert.match(pending[1].detail, /新增|完成|删除/);

const finished = collaborationTrace('改成深色主题', true, 4, 'success');
assert.ok(finished.every((item) => item.status === 'done'));
assert.match(finished[2].detail, /保留已有功能/);

const publicText = JSON.stringify(finished) + engineeringBrief('制作计时器', false);
assert.doesNotMatch(publicText, /chain.of.thought|raw_reasoning|隐藏推理/i);
console.log('PASS: public multi-agent trace and role handoff');
