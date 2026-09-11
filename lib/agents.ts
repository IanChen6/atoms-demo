export type AgentRole = 'analyst' | 'designer' | 'engineer' | 'reviewer';

export type AgentActivity = {
  role: AgentRole;
  name: string;
  title: string;
  detail: string;
  status: 'pending' | 'active' | 'done' | 'error';
  changes?: string[];
};

function compact(value: string, limit = 72) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function productDecision(prompt: string) {
  if (/贪吃蛇|游戏|game|计分|关卡/i.test(prompt))
    return '以可操作的游戏区域为核心，补齐键盘/触控、计分、暂停和结束反馈。';
  if (/待办|任务|todo|清单/i.test(prompt))
    return '围绕快速新增、完成切换、删除和进度反馈组织单页任务流。';
  if (/笔记|记事|note|搜索/i.test(prompt))
    return '围绕即时记录、搜索筛选和内容回看组织信息结构。';
  if (/计时|番茄|timer|专注/i.test(prompt))
    return '突出倒计时状态与开始、暂停、重置，确保完成反馈清晰。';
  if (/主题|颜色|布局|样式|视觉/i.test(prompt))
    return '保留已有交互与数据，只调整视觉层级、布局和响应式细节。';
  return '先实现一条完整主流程，再补齐必要状态与移动端体验。';
}

export function engineeringBrief(prompt: string, hasPrevious: boolean) {
  const target = compact(prompt || '恢复已保存的历史版本');
  return [
    `需求范围：${hasPrevious ? '基于现有应用实现本轮修改' : '创建一个可直接体验的核心产品'}：${target}`,
    `交互方案：${productDecision(prompt)}`,
    `工程任务：${hasPrevious ? '保留现有功能与数据并应用本轮变更' : '生成独立运行的 HTML、样式与交互逻辑，并接入持久化'}`,
    '质量门槛：输出必须是完整可运行 HTML，核心交互可用，数据可以持久保存。',
  ].join('\n');
}
