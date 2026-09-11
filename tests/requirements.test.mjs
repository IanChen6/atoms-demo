import assert from 'node:assert/strict';
import {
  clarificationFor,
  executionPlan,
  providerLabel,
  providerOptions,
  studioIntent,
  cleanProviderValue,
} from '../lib/requirements.ts';

assert.match(clarificationFor('做一个应用', false), /核心的操作/);
assert.equal(
  clarificationFor('待办应用，可以添加、完成和删除任务', false),
  null,
);
assert.equal(clarificationFor('改成深色主题', true), null);
assert.deepEqual(
  providerOptions('https://dashscope.aliyuncs.com/compatible-mode/v1', 6000),
  { max_tokens: 6000, enable_thinking: false },
);
assert.deepEqual(providerOptions('https://api.openai.com/v1', 6000), {
  max_completion_tokens: 6000,
  reasoning_effort: 'none',
});
assert.equal(
  providerLabel('https://dashscope.aliyuncs.com/compatible-mode/v1'),
  '阿里云百炼',
);
assert.equal(studioIntent('你好', false), 'chat');
assert.equal(studioIntent('什么是待办应用？', false), 'chat');
assert.equal(studioIntent('构建一个待办应用', false), 'build');
assert.equal(studioIntent('把这个按钮改成蓝色', true), 'build');
assert.equal(studioIntent('聊聊这个产品的目标', true), 'chat');
assert.equal(studioIntent('随便说点什么', true, true), 'build');
assert.equal(
  cleanProviderValue('"https://dashscope.aliyuncs.com/compatible-mode/v1"'),
  'https://dashscope.aliyuncs.com/compatible-mode/v1',
);
const plan = executionPlan('做一个极简待办应用，支持添加、完成和删除任务');
assert.equal(plan.length, 4);
assert.match(plan[0], /极简待办应用/);
assert.match(plan[1], /任务数据/);
assert.match(plan[2], /持久化/);
console.log('PASS: requirement clarification and provider thinking controls');
